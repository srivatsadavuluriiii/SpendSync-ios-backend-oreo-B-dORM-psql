# SpendSync Backup and Recovery Procedures

This directory contains scripts and configuration for SpendSync's backup, restore, and disaster recovery procedures.

## Backup Schedule

The system performs three types of backups:

1. **Full Backups**
   - Frequency: Every Sunday at midnight
   - Retention: 4 weeks
   - Contents: Complete database dump, configuration files, API keys, and certificates

2. **Incremental Backups**
   - Frequency: Daily (Monday-Saturday) at midnight
   - Retention: 7 days
   - Contents: Changed files and transaction logs since last full backup

3. **Transaction Log Backups**
   - Frequency: Every 4 hours
   - Retention: 48 hours
   - Contents: Database transaction logs for point-in-time recovery

## Storage and Encryption

- Primary Storage: AWS S3 (us-west-2)
- Secondary Storage: AWS S3 (us-east-1) for disaster recovery
- Encryption: AES-256 using AWS KMS
- Access Control: IAM roles and bucket policies

## Recovery Time and Point Objectives

- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 4 hours
- Monthly disaster recovery testing

## Scripts

### 1. Backup Script (`backup.sh`)

```bash
# Perform full backup
./backup.sh full

# Perform incremental backup
./backup.sh incremental

# Perform transaction log backup
./backup.sh transaction_logs
```

### 2. Restore Script (`restore.sh`)

```bash
# List available backups
./restore.sh list [backup_type] [days_back]

# Restore from backup
./restore.sh restore <type> <date> [point_in_time]

# Verify backup integrity
./restore.sh verify <type> <date>
```

### 3. Disaster Recovery Test Script (`dr-test.sh`)

```bash
# Test database failure recovery
./dr-test.sh database

# Test application failure recovery
./dr-test.sh application

# Test complete system failure recovery
./dr-test.sh system
```

## Point-in-Time Recovery

To perform point-in-time recovery:

1. Identify the target timestamp
2. Restore the most recent full backup before the target time
3. Apply transaction logs up to the desired point

```bash
# Example: Restore to specific point in time
./restore.sh restore point_in_time 20240315 "2024-03-15 14:30:00"
```

## Monitoring and Alerts

- Prometheus metrics for backup/restore operations
- Alert rules for:
  - Failed backups
  - Backup duration exceeding thresholds
  - Storage capacity issues
  - Encryption/decryption failures

## Disaster Recovery Testing

Monthly DR tests include:

1. Simulated failure scenarios
2. Recovery procedure verification
3. Service health checks
4. Performance measurements
5. Documentation updates

Test reports are generated in `/var/log/spendsync/dr-tests/`.

## Emergency Contacts

For backup/restore emergencies:

1. Database Administrator: [Contact Info]
2. System Administrator: [Contact Info]
3. Cloud Infrastructure Team: [Contact Info]

## Verification and Maintenance

- Daily: Monitor backup completion and alerts
- Weekly: Verify backup integrity
- Monthly: Perform DR testing
- Quarterly: Review and update procedures

## Configuration

All backup settings are managed in `backup-config.yml`:

- Backup schedules and retention policies
- Storage locations and credentials
- Encryption settings
- Monitoring configuration
- Recovery objectives 