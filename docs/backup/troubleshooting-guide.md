# SpendSync Backup System Troubleshooting Guide

This guide provides detailed troubleshooting procedures for common issues with the SpendSync backup and recovery system.

## Quick Reference

### System Status Check
```bash
# Check all critical services
systemctl status postgresql spendsync-api nginx

# Check disk space
df -h /var/lib/postgresql/data /etc/spendsync /tmp

# Check AWS connectivity
aws s3 ls s3://spendsync-backups/
aws kms list-keys
```

## Common Issues and Solutions

### 1. Backup Failures

#### Failed to Create Backup
```
ERROR: pg_dump failed with exit code 1
```

**Troubleshooting Steps:**
1. Check PostgreSQL connection:
   ```bash
   psql -d spendsync -c "SELECT 1"
   ```

2. Verify disk space:
   ```bash
   df -h /tmp
   du -sh /tmp/spendsync_backup_*
   ```

3. Check PostgreSQL logs:
   ```bash
   tail -f /var/log/postgresql/postgresql.log
   ```

**Solution:**
- Clear temporary files
- Increase available disk space
- Check database permissions

#### S3 Upload Failures
```
ERROR: Failed to upload backup to S3
```

**Troubleshooting Steps:**
1. Check AWS credentials:
   ```bash
   aws sts get-caller-identity
   aws s3 ls s3://spendsync-backups/
   ```

2. Verify network connectivity:
   ```bash
   ping s3.amazonaws.com
   curl -I https://s3.amazonaws.com
   ```

3. Check S3 bucket permissions:
   ```bash
   aws s3api get-bucket-acl --bucket spendsync-backups
   ```

**Solution:**
- Refresh AWS credentials
- Update IAM permissions
- Check network configuration

### 2. Restore Issues

#### Failed to Download Backup
```
ERROR: Could not download backup from S3
```

**Troubleshooting Steps:**
1. Verify backup exists:
   ```bash
   aws s3 ls s3://spendsync-backups/full/
   ```

2. Check storage permissions:
   ```bash
   aws s3api get-object-acl \
     --bucket spendsync-backups \
     --key full/latest/database.dump
   ```

3. Test download manually:
   ```bash
   aws s3 cp s3://spendsync-backups/full/latest/database.dump /tmp/
   ```

**Solution:**
- Verify backup path
- Check S3 permissions
- Ensure sufficient local disk space

#### Decryption Failures
```
ERROR: KMS decryption failed
```

**Troubleshooting Steps:**
1. Check KMS key status:
   ```bash
   aws kms describe-key --key-id alias/spendsync-backup-key
   ```

2. Verify KMS permissions:
   ```bash
   aws kms get-key-policy \
     --key-id alias/spendsync-backup-key \
     --policy-name default
   ```

3. Test encryption/decryption:
   ```bash
   echo "test" > /tmp/test.txt
   aws kms encrypt \
     --key-id alias/spendsync-backup-key \
     --plaintext fileb:///tmp/test.txt \
     --output text \
     --query CiphertextBlob > /tmp/test.encrypted
   aws kms decrypt \
     --ciphertext-blob fileb:///tmp/test.encrypted \
     --output text \
     --query Plaintext
   ```

**Solution:**
- Check KMS key status
- Update KMS permissions
- Verify key usage quotas

### 3. Performance Issues

#### Slow Backup Creation
```
WARNING: Backup taking longer than expected
```

**Troubleshooting Steps:**
1. Check system resources:
   ```bash
   top -b -n 1
   iostat -x 1 5
   ```

2. Monitor PostgreSQL activity:
   ```bash
   psql -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"
   ```

3. Check network throughput:
   ```bash
   iftop -P
   ```

**Solution:**
- Optimize backup window
- Adjust PostgreSQL configuration
- Consider incremental backups

#### Slow Restore Process
```
WARNING: Restore exceeding RTO target
```

**Troubleshooting Steps:**
1. Monitor restore progress:
   ```bash
   tail -f /var/log/spendsync/restores/restore-*.log
   ```

2. Check download speeds:
   ```bash
   aws s3 cp s3://spendsync-backups/test.file /dev/null
   ```

3. Monitor system resources:
   ```bash
   vmstat 1 10
   ```

**Solution:**
- Optimize restore procedure
- Consider regional S3 bucket
- Adjust system resources

### 4. DR Test Failures

#### Service Recovery Issues
```
ERROR: Service failed to start after restore
```

**Troubleshooting Steps:**
1. Check service status:
   ```bash
   systemctl status spendsync-api
   journalctl -u spendsync-api -n 100
   ```

2. Verify configuration:
   ```bash
   ls -l /etc/spendsync/
   cat /etc/spendsync/config.yml
   ```

3. Check permissions:
   ```bash
   ls -l /var/lib/postgresql/data
   ls -l /etc/spendsync/keys
   ```

**Solution:**
- Fix configuration files
- Update service permissions
- Check dependency services

## Advanced Troubleshooting

### Debug Mode

Enable detailed logging:
```bash
export BACKUP_DEBUG=1
export AWS_DEBUG=true
```

### Log Analysis

1. **Backup Logs**
   ```bash
   # Search for errors
   grep -r ERROR /var/log/spendsync/backups/
   
   # Check backup durations
   awk '/Completed.*backup in/ {print $0}' /var/log/spendsync/backups/*
   ```

2. **Restore Logs**
   ```bash
   # Find failed restores
   grep -r "Error:" /var/log/spendsync/restores/
   
   # Check restore times
   awk '/Completed restore in/ {print $0}' /var/log/spendsync/restores/*
   ```

### System Checks

1. **Database Checks**
   ```bash
   # Check PostgreSQL status
   pg_isready
   
   # Check WAL status
   pg_controldata | grep "Latest checkpoint"
   ```

2. **Network Checks**
   ```bash
   # Test AWS endpoints
   for region in us-west-2 us-east-1; do
     nc -zv s3.$region.amazonaws.com 443
   done
   ```

## Recovery Procedures

### Emergency Restore

If standard restore fails:

1. Stop all services:
   ```bash
   systemctl stop spendsync-api postgresql
   ```

2. Clean up data directory:
   ```bash
   mv /var/lib/postgresql/data /var/lib/postgresql/data.bak
   ```

3. Perform manual restore:
   ```bash
   # Download latest backup
   aws s3 cp s3://spendsync-backups/full/latest/ /tmp/restore/ --recursive
   
   # Decrypt and restore
   for file in /tmp/restore/*.encrypted; do
     aws kms decrypt \
       --ciphertext-blob fileb://$file \
       --output text \
       --query Plaintext > "${file%.encrypted}"
   done
   
   # Restore database
   pg_restore -C -d postgres /tmp/restore/database.dump
   ```

### Backup Chain Recovery

If incremental backup chain is broken:

1. Identify last good full backup:
   ```bash
   /usr/local/bin/restore.sh list full 14
   ```

2. Restore from full backup:
   ```bash
   /usr/local/bin/restore.sh restore full <backup_date>
   ```

3. Apply available transaction logs:
   ```bash
   /usr/local/bin/restore.sh restore transaction_logs <backup_date>
   ```

## Preventive Measures

1. **Regular Checks**
   ```bash
   # Daily verification
   /usr/local/bin/restore.sh verify full $(date +%Y%m%d)
   
   # Test restore procedure
   /usr/local/bin/dr-test.sh database
   ```

2. **Monitoring**
   ```bash
   # Check metrics
   curl -s localhost:9091/metrics | grep spendsync
   
   # Review alerts
   curl -s localhost:9093/api/v1/alerts
   ```

3. **Maintenance**
   ```bash
   # Clean old logs
   find /var/log/spendsync -type f -mtime +30 -delete
   
   # Verify permissions
   find /etc/spendsync -type f -exec stat -c "%a %n" {} \;
   ``` 