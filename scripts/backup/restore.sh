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
RESTORE_LOG_DIR="/var/log/spendsync/restores"
mkdir -p "$RESTORE_LOG_DIR"
RESTORE_LOG="$RESTORE_LOG_DIR/restore-$(date +%Y%m%d_%H%M%S).log"
exec 1> >(tee -a "$RESTORE_LOG")
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
        echo "spendsync_restore_${metric_name}{${labels}} ${value}" | curl --data-binary @- http://localhost:9091/metrics/job/restore
    fi
}

# Function to list available backups
list_backups() {
    local backup_type=$1
    local days_back=${2:-7}  # Default to last 7 days
    
    log "Listing available $backup_type backups from the last $days_back days"
    
    echo "Available backups in primary storage (s3://${storage_primary_bucket}):"
    aws s3 ls "s3://${storage_primary_bucket}/${storage_primary_path}/${backup_type}/" | \
        grep -v "PRE" | \
        awk '{print $4}' | \
        while read -r backup; do
            backup_date=$(echo "$backup" | cut -d'/' -f1)
            if [ $(( ($(date +%s) - $(date -d "$backup_date" +%s)) / 86400 )) -le "$days_back" ]; then
                echo "  - $backup"
            fi
        done
}

# Function to perform restore
perform_restore() {
    local backup_type=$1
    local backup_date=$2
    local point_in_time=$3  # Optional: For point-in-time recovery
    local start_time=$(date +%s)
    
    log "Starting restore from $backup_type backup dated $backup_date"
    
    # Create temporary restore directory
    local restore_dir="/tmp/spendsync_restore_${backup_date}"
    mkdir -p "$restore_dir"
    
    # Download backup from primary storage (fallback to secondary if primary fails)
    log "Downloading backup files"
    if ! aws s3 sync "s3://${storage_primary_bucket}/${storage_primary_path}/${backup_type}/${backup_date}/" "$restore_dir/"; then
        log "Primary storage download failed, falling back to secondary storage"
        aws s3 sync "s3://${storage_secondary_bucket}/${storage_secondary_path}/${backup_type}/${backup_date}/" "$restore_dir/"
    fi
    
    # Decrypt backup files
    log "Decrypting backup files"
    for file in "$restore_dir"/*.encrypted; do
        aws kms decrypt \
            --ciphertext-blob "fileb://$file" \
            --output text \
            --query Plaintext > "${file%.encrypted}"
    done
    
    # Stop services
    log "Stopping services"
    systemctl stop spendsync-api
    
    # Perform restore based on type
    case "$backup_type" in
        "full")
            # Restore database
            log "Restoring database"
            pg_restore -c -d spendsync "$restore_dir/database.dump"
            
            # Restore configuration files
            log "Restoring configuration files"
            tar -xzf "$restore_dir/config.tar.gz" -C /
            
            # Restore secrets
            log "Restoring API keys and certificates"
            tar -xzf "$restore_dir/secrets.tar.gz" -C /
            ;;
            
        "incremental")
            # Apply incremental backup
            log "Applying incremental backup"
            tar -xzf "$restore_dir/incremental.tar.gz" -C /
            
            # Apply transaction logs
            pg_basebackup -D "$restore_dir/pg_incremental" --wal-method=fetch
            ;;
            
        "point_in_time")
            if [ -z "$point_in_time" ]; then
                log "Error: Point-in-time parameter required for PITR recovery"
                exit 1
            fi
            
            # Restore to the latest full backup first
            perform_restore "full" "$backup_date"
            
            # Apply transaction logs up to the specified point in time
            log "Applying transaction logs up to $point_in_time"
            pg_receivewal -D "$restore_dir/pg_wal" --endpos "$point_in_time"
            ;;
    esac
    
    # Verify restore
    log "Verifying restore"
    if ! systemctl start spendsync-api; then
        log "Error: Service failed to start after restore"
        exit 1
    fi
    
    # Run basic health checks
    if ! curl -s http://localhost:8080/health > /dev/null; then
        log "Error: Health check failed after restore"
        exit 1
    fi
    
    # Clean up
    rm -rf "$restore_dir"
    
    # Calculate duration and send metrics
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    send_metric "duration_seconds" "$duration" "type=\"$backup_type\""
    send_metric "success" "1" "type=\"$backup_type\""
    
    log "Completed restore in $duration seconds"
}

# Function to verify backup integrity
verify_backup() {
    local backup_type=$1
    local backup_date=$2
    
    log "Verifying integrity of $backup_type backup from $backup_date"
    
    local verify_dir="/tmp/spendsync_verify_${backup_date}"
    mkdir -p "$verify_dir"
    
    # Download and verify checksums
    aws s3 sync "s3://${storage_primary_bucket}/${storage_primary_path}/${backup_type}/${backup_date}/" "$verify_dir/"
    
    # Verify each file
    local verify_success=true
    for file in "$verify_dir"/*; do
        if ! aws kms decrypt --ciphertext-blob "fileb://$file" --output text --query Plaintext > /dev/null 2>&1; then
            log "Error: Failed to verify file: $file"
            verify_success=false
        fi
    done
    
    # Clean up
    rm -rf "$verify_dir"
    
    if [ "$verify_success" = true ]; then
        log "Backup verification successful"
        return 0
    else
        log "Backup verification failed"
        return 1
    fi
}

# Parse command line arguments
command=$1
shift

case "$command" in
    "list")
        backup_type=${1:-"full"}
        days_back=${2:-7}
        list_backups "$backup_type" "$days_back"
        ;;
        
    "restore")
        backup_type=${1:-"full"}
        backup_date=${2:-$(date +%Y%m%d)}
        point_in_time=${3:-""}
        perform_restore "$backup_type" "$backup_date" "$point_in_time"
        ;;
        
    "verify")
        backup_type=${1:-"full"}
        backup_date=${2:-$(date +%Y%m%d)}
        verify_backup "$backup_type" "$backup_date"
        ;;
        
    *)
        echo "Usage: $0 <command> [options]"
        echo "Commands:"
        echo "  list [backup_type] [days_back]    - List available backups"
        echo "  restore <type> <date> [point_in_time] - Restore from backup"
        echo "  verify <type> <date>              - Verify backup integrity"
        exit 1
        ;;
esac 