# SpendSync Backup System Monitoring and Alerts

This guide covers the monitoring setup, alert configurations, and handling procedures for the SpendSync backup system.

## Monitoring Setup

### Prometheus Metrics

1. **Backup Metrics**
   ```
   # Backup duration
   spendsync_backup_duration_seconds{type="full|incremental|transaction_logs"}
   
   # Backup success rate
   spendsync_backup_success{type="full|incremental|transaction_logs"}
   
   # Backup size
   spendsync_backup_size_bytes{type="full|incremental|transaction_logs"}
   ```

2. **Restore Metrics**
   ```
   # Restore duration
   spendsync_restore_duration_seconds{type="full|incremental|point_in_time"}
   
   # Restore success rate
   spendsync_restore_success{type="full|incremental|point_in_time"}
   ```

3. **DR Test Metrics**
   ```
   # Recovery time
   spendsync_dr_test_recovery_time_seconds{type="database|application|system"}
   
   # Service status
   spendsync_dr_test_services_ok{type="database|application|system"}
   
   # Application health
   spendsync_dr_test_app_ok{type="database|application|system"}
   ```

### Grafana Dashboards

1. **Backup Overview Dashboard**
   - Backup success rate over time
   - Backup duration trends
   - Storage usage metrics
   - Recent backup status

2. **Restore Operations Dashboard**
   - Restore success rate
   - Recovery time trends
   - Point-in-time recovery status
   - Service health indicators

3. **DR Testing Dashboard**
   - Monthly test results
   - Recovery time vs RTO
   - Service recovery metrics
   - Failure scenario analysis

## Alert Rules

### Critical Alerts

1. **Backup Failures**
   ```yaml
   alert: BackupFailure
   expr: spendsync_backup_success{} == 0
   for: 1h
   labels:
     severity: critical
   annotations:
     summary: "Backup failed for {{ $labels.type }}"
     description: "Backup has failed for {{ $labels.type }} backup type"
   ```

2. **Recovery Time Breach**
   ```yaml
   alert: RTOBreach
   expr: spendsync_dr_test_recovery_time_seconds{} > 14400  # 4 hours
   labels:
     severity: critical
   annotations:
     summary: "Recovery time exceeded RTO"
     description: "Recovery time of {{ $value }}s exceeded RTO target of 4 hours"
   ```

3. **Storage Capacity**
   ```yaml
   alert: BackupStorageCapacity
   expr: spendsync_backup_storage_usage_percent > 85
   for: 6h
   labels:
     severity: warning
   annotations:
     summary: "Backup storage capacity critical"
     description: "Backup storage usage at {{ $value }}%"
   ```

### Warning Alerts

1. **Backup Duration**
   ```yaml
   alert: LongBackupDuration
   expr: spendsync_backup_duration_seconds{} > 7200  # 2 hours
   labels:
     severity: warning
   annotations:
     summary: "Backup taking longer than expected"
     description: "Backup duration: {{ $value }}s"
   ```

2. **Encryption Failures**
   ```yaml
   alert: EncryptionFailure
   expr: rate(spendsync_backup_encryption_failures_total[1h]) > 0
   labels:
     severity: warning
   annotations:
     summary: "Backup encryption failures detected"
     description: "{{ $value }} encryption failures in the last hour"
   ```

## Alert Handling Procedures

### Critical Alert Response

1. **Backup Failure**
   - Check backup logs in `/var/log/spendsync/backups/`
   - Verify system resources (disk space, memory)
   - Check AWS credentials and permissions
   - Attempt manual backup
   - Escalate to on-call DBA if unresolved

2. **RTO Breach**
   - Review DR test logs
   - Identify bottlenecks in recovery process
   - Update recovery procedures if needed
   - Schedule additional DR test
   - Document findings and improvements

3. **Storage Capacity**
   - Review backup retention policies
   - Clean up old backups if safe
   - Plan storage expansion
   - Monitor cleanup progress

### Warning Alert Response

1. **Long Backup Duration**
   - Check system load
   - Review backup size trends
   - Optimize backup configuration
   - Consider backup window adjustments

2. **Encryption Issues**
   - Verify KMS key status
   - Check AWS KMS quotas
   - Review encryption logs
   - Test encryption manually

## Maintenance Procedures

1. **Daily Checks**
   ```bash
   # Check backup status
   /usr/local/bin/restore.sh list full 1
   
   # Verify metrics collection
   curl -s localhost:9091/metrics | grep spendsync
   
   # Review error logs
   tail -f /var/log/spendsync/backups/backup-*.log | grep ERROR
   ```

2. **Weekly Tasks**
   - Review alert history
   - Update alert thresholds if needed
   - Clean up old log files
   - Verify monitoring dashboards

3. **Monthly Reviews**
   - Analyze backup performance trends
   - Review and update alert rules
   - Test alert notification channels
   - Update runbooks and documentation

## Troubleshooting Guide

1. **Common Issues**
   - Insufficient disk space
   - AWS credential expiration
   - Network connectivity issues
   - Database lock conflicts

2. **Quick Fixes**
   ```bash
   # Clear temporary files
   sudo rm -rf /tmp/spendsync_backup_*
   
   # Refresh AWS credentials
   aws sts get-caller-identity
   
   # Check service status
   systemctl status postgresql spendsync-api
   ```

3. **Debug Commands**
   ```bash
   # Enable debug logging
   export BACKUP_DEBUG=1
   
   # Test S3 access
   aws s3 ls s3://spendsync-backups/
   
   # Verify KMS permissions
   aws kms list-keys
   ```

## Escalation Procedures

1. **Level 1: System Administrator**
   - Initial alert investigation
   - Basic troubleshooting
   - Log analysis
   - Service restarts

2. **Level 2: Database Administrator**
   - Database recovery issues
   - Data corruption
   - Performance problems
   - Backup strategy updates

3. **Level 3: Cloud Infrastructure Team**
   - AWS service issues
   - Security incidents
   - Major system failures
   - DR coordination 