# SpendSync Backup System Deployment Guide

This guide covers the deployment and configuration of the SpendSync backup and recovery system.

## Prerequisites

1. **AWS Configuration**
   - AWS CLI installed and configured
   - IAM roles with necessary permissions:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "s3:PutObject",
             "s3:GetObject",
             "s3:ListBucket",
             "s3:DeleteObject",
             "kms:Encrypt",
             "kms:Decrypt"
           ],
           "Resource": [
             "arn:aws:s3:::spendsync-backups/*",
             "arn:aws:s3:::spendsync-dr-backups/*",
             "arn:aws:kms:*:*:key/*"
           ]
         }
       ]
    }
    ```

2. **System Requirements**
   - PostgreSQL 13 or higher
   - Python 3.8+
   - Prometheus and Grafana
   - Sufficient disk space for temporary backup storage

## Installation Steps

1. **Create Required Directories**
   ```bash
   sudo mkdir -p /etc/spendsync/backup
   sudo mkdir -p /var/log/spendsync/{backups,restores,dr-tests}
   ```

2. **Install Dependencies**
   ```bash
   # Install system packages
   sudo apt-get update
   sudo apt-get install -y postgresql-client awscli python3-pip

   # Install Python packages
   pip3 install pyyaml prometheus_client
   ```

3. **Deploy Configuration**
   ```bash
   # Copy configuration files
   sudo cp scripts/backup/backup-config.yml /etc/spendsync/backup/
   sudo cp scripts/backup/{backup,restore,dr-test}.sh /usr/local/bin/
   
   # Set permissions
   sudo chmod +x /usr/local/bin/{backup,restore,dr-test}.sh
   sudo chown -R spendsync:spendsync /etc/spendsync/backup
   ```

4. **Configure AWS KMS**
   ```bash
   # Create KMS key
   aws kms create-key --description "SpendSync Backup Encryption Key"
   
   # Create alias
   aws kms create-alias \
     --alias-name alias/spendsync-backup-key \
     --target-key-id <key-id>
   ```

5. **Create S3 Buckets**
   ```bash
   # Create primary bucket
   aws s3api create-bucket \
     --bucket spendsync-backups \
     --region us-west-2 \
     --create-bucket-configuration LocationConstraint=us-west-2

   # Create DR bucket
   aws s3api create-bucket \
     --bucket spendsync-dr-backups \
     --region us-east-1
   ```

6. **Configure Prometheus Integration**
   ```yaml
   # /etc/prometheus/prometheus.yml
   scrape_configs:
     - job_name: 'spendsync_backup'
       static_configs:
         - targets: ['localhost:9091']
       metrics_path: '/metrics'
   ```

## Cron Configuration

1. **Set Up Backup Schedule**
   ```bash
   # Edit crontab
   sudo crontab -e

   # Add backup schedules
   0 0 * * 0 /usr/local/bin/backup.sh full
   0 0 * * 1-6 /usr/local/bin/backup.sh incremental
   0 */4 * * * /usr/local/bin/backup.sh transaction_logs
   0 0 1 * * /usr/local/bin/dr-test.sh system
   ```

## Verification Steps

1. **Test Backup System**
   ```bash
   # Test full backup
   /usr/local/bin/backup.sh full
   
   # Verify backup
   /usr/local/bin/restore.sh verify full $(date +%Y%m%d)
   ```

2. **Test Restore Process**
   ```bash
   # List available backups
   /usr/local/bin/restore.sh list full
   
   # Test restore to temporary location
   /usr/local/bin/restore.sh restore full $(date +%Y%m%d)
   ```

3. **Verify Monitoring**
   ```bash
   # Check Prometheus metrics
   curl http://localhost:9091/metrics | grep spendsync_backup
   ```

## Security Considerations

1. **Access Control**
   - Use IAM roles instead of access keys
   - Implement least privilege principle
   - Regularly rotate credentials

2. **Encryption**
   - Enable S3 bucket encryption
   - Use customer-managed KMS keys
   - Implement encryption at rest and in transit

3. **Audit Logging**
   - Enable AWS CloudTrail
   - Monitor S3 access logs
   - Track KMS key usage

## Maintenance

1. **Regular Tasks**
   - Monitor disk space usage
   - Review backup logs
   - Verify backup integrity
   - Update AWS credentials

2. **Quarterly Reviews**
   - Audit access permissions
   - Update documentation
   - Review and test recovery procedures
   - Validate backup retention policies 