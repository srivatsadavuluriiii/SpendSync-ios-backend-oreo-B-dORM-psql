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
BACKUP_LOG_DIR="/var/log/spendsync/backups"
mkdir -p "$BACKUP_LOG_DIR"
BACKUP_LOG="$BACKUP_LOG_DIR/backup-$(date +%Y%m%d_%H%M%S).log"
exec 1> >(tee -a "$BACKUP_LOG")
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
        echo "spendsync_backup_${metric_name}{${labels}} ${value}" | curl --data-binary @- http://localhost:9091/metrics/job/backup
    fi
}

# Function to perform backup
perform_backup() {
    local backup_type=$1
    local start_time=$(date +%s)
    
    log "Starting $backup_type backup"
    
    # Create backup directory
    local backup_date=$(date +%Y%m%d_%H%M%S)
    local backup_dir="/tmp/spendsync_backup_${backup_date}"
    mkdir -p "$backup_dir"
    
    # Perform backup based on type
    case "$backup_type" in
        "full")
            # Stop services or enable backup mode
            systemctl stop spendsync-api
            
            # Backup database
            pg_dump -Fc spendsync > "$backup_dir/database.dump"
            
            # Backup configuration files
            tar -czf "$backup_dir/config.tar.gz" /etc/spendsync/
            
            # Backup API keys and certificates
            tar -czf "$backup_dir/secrets.tar.gz" /etc/spendsync/keys/ /etc/spendsync/certs/
            
            # Start services
            systemctl start spendsync-api
            ;;
            
        "incremental")
            # Backup only changed files since last full backup
            find /etc/spendsync/ -type f -mtime -1 -print0 | \
                tar -czf "$backup_dir/incremental.tar.gz" --null -T -
            
            # Backup transaction logs
            pg_basebackup -D "$backup_dir/pg_incremental" --wal-method=fetch
            ;;
            
        "transaction_logs")
            # Archive current transaction logs
            pg_receivewal -D "$backup_dir/pg_wal"
            ;;
    esac
    
    # Encrypt backup
    log "Encrypting backup"
    for file in "$backup_dir"/*; do
        aws kms encrypt \
            --key-id "$encryption_kms_key_id" \
            --plaintext "fileb://$file" \
            --output text \
            --query CiphertextBlob > "${file}.encrypted"
    done
    
    # Upload to primary storage
    log "Uploading to primary storage"
    aws s3 sync "$backup_dir" "s3://${storage_primary_bucket}/${storage_primary_path}/${backup_type}/${backup_date}/"
    
    # Upload to secondary storage (DR)
    log "Uploading to secondary storage"
    aws s3 sync "$backup_dir" "s3://${storage_secondary_bucket}/${storage_secondary_path}/${backup_type}/${backup_date}/"
    
    # Clean up
    rm -rf "$backup_dir"
    
    # Calculate duration and send metrics
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    send_metric "duration_seconds" "$duration" "type=\"$backup_type\""
    send_metric "success" "1" "type=\"$backup_type\""
    
    log "Completed $backup_type backup in $duration seconds"
}

# Function to clean up old backups
cleanup_old_backups() {
    local backup_type=$1
    local retention_days
    
    case "$backup_type" in
        "full")
            retention_days=28 ;;  # 4 weeks
        "incremental")
            retention_days=7 ;;   # 7 days
        "transaction_logs")
            retention_days=2 ;;   # 48 hours
    esac
    
    log "Cleaning up old $backup_type backups older than $retention_days days"
    
    # Clean primary storage
    aws s3 ls "s3://${storage_primary_bucket}/${storage_primary_path}/${backup_type}/" | \
        while read -r line; do
            backup_date=$(echo "$line" | awk '{print $2}' | cut -d'/' -f1)
            if [ $(( ($(date +%s) - $(date -d "$backup_date" +%s)) / 86400 )) -gt "$retention_days" ]; then
                aws s3 rm --recursive "s3://${storage_primary_bucket}/${storage_primary_path}/${backup_type}/${backup_date}/"
            fi
        done
        
    # Clean secondary storage
    aws s3 ls "s3://${storage_secondary_bucket}/${storage_secondary_path}/${backup_type}/" | \
        while read -r line; do
            backup_date=$(echo "$line" | awk '{print $2}' | cut -d'/' -f1)
            if [ $(( ($(date +%s) - $(date -d "$backup_date" +%s)) / 86400 )) -gt "$retention_days" ]; then
                aws s3 rm --recursive "s3://${storage_secondary_bucket}/${storage_secondary_path}/${backup_type}/${backup_date}/"
            fi
        done
}

# Main execution
backup_type=${1:-"full"}  # Default to full backup if no type specified

# Validate backup type
if [[ ! "$backup_type" =~ ^(full|incremental|transaction_logs)$ ]]; then
    log "Error: Invalid backup type. Must be one of: full, incremental, transaction_logs"
    exit 1
fi

# Perform backup
perform_backup "$backup_type"

# Clean up old backups
cleanup_old_backups "$backup_type" 