#!/bin/bash

set -euo pipefail

# Load configuration
CONFIG_FILE="$(dirname "$0")/backup-config.yml"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file not found at $CONFIG_FILE"
    exit 1
fi

# Function to parse YAML (basic implementation)
parse_yaml() {
    local prefix=$2
    local s='[[:space:]]*' w='[a-zA-Z0-9_]*'
    sed -ne "s|^\($s\):|\1|" \
        -e "s|^\($s\)\($w\)$s:$s[\"']\(.*\)[\"']$|\1$prefix\2=\"\3\"|p" \
        -e "s|^\($s\)\($w\)$s:$s\(.*\)$|\1$prefix\2=\"\3\"|p" $1
}

# Load configuration into environment variables
eval $(parse_yaml "$CONFIG_FILE")

# Set up logging
DR_TEST_LOG_DIR="/var/log/spendsync/dr-tests"
mkdir -p "$DR_TEST_LOG_DIR"
DR_TEST_LOG="$DR_TEST_LOG_DIR/dr-test-$(date +%Y%m%d_%H%M%S).log"
exec 1> >(tee -a "$DR_TEST_LOG")
exec 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to send metrics to Prometheus
send_metric() {
    local metric_name=$1
    local value=$2
    local labels=$3
    
    if [ "$monitoring_prometheus_metrics" = "true" ]; then
        echo "spendsync_dr_test_${metric_name}{${labels}} ${value}" | curl --data-binary @- http://localhost:9091/metrics/job/dr_test
    fi
}

# Function to simulate database failure
simulate_db_failure() {
    log "Simulating database failure"
    
    # Stop PostgreSQL service
    systemctl stop postgresql
    
    # Corrupt some data files (simulated)
    sudo rm -f /var/lib/postgresql/data/pg_wal/*
    
    log "Database failure simulated"
}

# Function to simulate application failure
simulate_app_failure() {
    log "Simulating application failure"
    
    # Stop application service
    systemctl stop spendsync-api
    
    # Corrupt configuration (simulated)
    sudo rm -f /etc/spendsync/config.yml
    
    log "Application failure simulated"
}

# Function to simulate complete system failure
simulate_system_failure() {
    log "Simulating complete system failure"
    
    # Stop all services
    systemctl stop postgresql spendsync-api nginx
    
    # Corrupt system files (simulated)
    sudo rm -f /etc/spendsync/*
    sudo rm -f /var/lib/postgresql/data/pg_wal/*
    
    log "System failure simulated"
}

# Function to test recovery
test_recovery() {
    local failure_type=$1
    local start_time=$(date +%s)
    
    log "Starting recovery test for $failure_type failure"
    
    # Get latest backup date
    local backup_date=$(aws s3 ls "s3://${storage_primary_bucket}/${storage_primary_path}/full/" | \
        tail -n 1 | awk '{print $2}' | cut -d'/' -f1)
    
    case "$failure_type" in
        "database")
            simulate_db_failure
            
            # Restore database
            log "Restoring database from backup"
            ./restore.sh restore full "$backup_date"
            ;;
            
        "application")
            simulate_app_failure
            
            # Restore application
            log "Restoring application configuration"
            ./restore.sh restore full "$backup_date"
            ;;
            
        "system")
            simulate_system_failure
            
            # Restore entire system
            log "Performing full system restore"
            ./restore.sh restore full "$backup_date"
            ;;
    esac
    
    # Verify recovery
    log "Verifying recovery"
    
    # Check services
    local services_ok=true
    for service in postgresql spendsync-api nginx; do
        if ! systemctl is-active --quiet "$service"; then
            log "Error: Service $service failed to start"
            services_ok=false
        fi
    done
    
    # Check application health
    local app_ok=false
    if curl -s http://localhost:8080/health > /dev/null; then
        app_ok=true
    fi
    
    # Check database connectivity
    local db_ok=false
    if psql -d spendsync -c "SELECT 1" > /dev/null 2>&1; then
        db_ok=true
    fi
    
    # Calculate recovery time
    local end_time=$(date +%s)
    local recovery_time=$((end_time - start_time))
    
    # Send metrics
    send_metric "recovery_time_seconds" "$recovery_time" "type=\"$failure_type\""
    send_metric "services_ok" "$([ "$services_ok" = true ] && echo 1 || echo 0)" "type=\"$failure_type\""
    send_metric "app_ok" "$([ "$app_ok" = true ] && echo 1 || echo 0)" "type=\"$failure_type\""
    send_metric "db_ok" "$([ "$db_ok" = true ] && echo 1 || echo 0)" "type=\"$failure_type\""
    
    # Generate test report
    cat << EOF > "$DR_TEST_LOG_DIR/dr-test-report-$(date +%Y%m%d).md"
# Disaster Recovery Test Report

## Test Details
- Failure Type: $failure_type
- Test Date: $(date)
- Recovery Time: $recovery_time seconds
- RTO Target: ${disaster_recovery_rto}

## Test Results
- Services Status: $([ "$services_ok" = true ] && echo "✅" || echo "❌")
- Application Health: $([ "$app_ok" = true ] && echo "✅" || echo "❌")
- Database Connectivity: $([ "$db_ok" = true ] && echo "✅" || echo "❌")

## Recovery Steps Performed
1. Simulated $failure_type failure
2. Initiated recovery from backup dated $backup_date
3. Verified system health

## Recommendations
$([ "$recovery_time" -gt 14400 ] && echo "- Recovery time exceeded RTO target" || echo "- Recovery time within RTO target")
$([ "$services_ok" = false ] && echo "- Investigate service startup issues" || echo "")
$([ "$app_ok" = false ] && echo "- Investigate application health issues" || echo "")
$([ "$db_ok" = false ] && echo "- Investigate database connectivity issues" || echo "")

## Next Steps
1. Review and update recovery procedures based on findings
2. Schedule next DR test according to policy
3. Update documentation with lessons learned
EOF
    
    log "DR test completed. Results available in $DR_TEST_LOG_DIR/dr-test-report-$(date +%Y%m%d).md"
    
    # Return success only if all checks passed
    [ "$services_ok" = true ] && [ "$app_ok" = true ] && [ "$db_ok" = true ]
}

# Main execution
failure_type=${1:-"system"}

# Validate failure type
if [[ ! "$failure_type" =~ ^(database|application|system)$ ]]; then
    echo "Usage: $0 <failure_type>"
    echo "Failure types: database, application, system"
    exit 1
fi

# Run DR test
test_recovery "$failure_type" 