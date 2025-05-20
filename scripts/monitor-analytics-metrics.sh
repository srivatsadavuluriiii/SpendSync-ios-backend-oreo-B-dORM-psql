#!/bin/bash

# Analytics Service Metrics Monitoring Script
set -e

# Configuration
SERVICE_URL=${ANALYTICS_SERVICE_URL:-"http://localhost:3005"}
METRICS_INTERVAL=${METRICS_INTERVAL:-"5"} # seconds
MONITORING_DURATION=${MONITORING_DURATION:-"3600"} # 1 hour
OUTPUT_DIR="./metrics-results/analytics"
ALERT_THRESHOLD_CPU=80 # percentage
ALERT_THRESHOLD_MEMORY=85 # percentage
ALERT_THRESHOLD_ERROR_RATE=5 # percentage
ALERT_THRESHOLD_LATENCY=1000 # milliseconds

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to check if service is available
check_service() {
  if ! curl -s "$SERVICE_URL/health" > /dev/null; then
    echo "Service is not available at $SERVICE_URL"
    exit 1
  fi
}

# Function to collect metrics
collect_metrics() {
  local timestamp=$(date +%s)
  local metrics_file="$OUTPUT_DIR/metrics_${timestamp}.json"
  
  # Collect Prometheus metrics
  curl -s "$SERVICE_URL/metrics" > "$metrics_file"
  
  # Parse and analyze metrics
  node <<EOF
  const fs = require('fs');
  const metricsData = fs.readFileSync('${metrics_file}', 'utf8');
  
  const parseMetrics = (data) => {
    const metrics = {};
    const lines = data.split('\n');
    
    lines.forEach(line => {
      if (!line.startsWith('#') && line.trim()) {
        const [name, value] = line.split(' ');
        metrics[name] = parseFloat(value);
      }
    });
    
    return metrics;
  };
  
  const metrics = parseMetrics(metricsData);
  
  // Calculate key metrics
  const summary = {
    timestamp: new Date().toISOString(),
    metrics: {
      requestRate: metrics.http_requests_total || 0,
      errorRate: (metrics.http_requests_errors_total / metrics.http_requests_total * 100) || 0,
      avgResponseTime: metrics.http_request_duration_seconds_sum / metrics.http_request_duration_seconds_count || 0,
      cacheHitRate: (metrics.analytics_cache_hits_total / (metrics.analytics_cache_hits_total + metrics.analytics_cache_misses_total) * 100) || 0,
      processingBatchSize: metrics.analytics_data_processing_batch_size_sum / metrics.analytics_data_processing_batch_size_count || 0,
      activeUsers: metrics.analytics_active_users || 0
    },
    alerts: []
  };
  
  // Check thresholds and generate alerts
  if (summary.metrics.errorRate > ${ALERT_THRESHOLD_ERROR_RATE}) {
    summary.alerts.push({
      level: 'ERROR',
      message: \`High error rate: \${summary.metrics.errorRate.toFixed(2)}%\`
    });
  }
  
  if (summary.metrics.avgResponseTime * 1000 > ${ALERT_THRESHOLD_LATENCY}) {
    summary.alerts.push({
      level: 'WARNING',
      message: \`High latency: \${(summary.metrics.avgResponseTime * 1000).toFixed(2)}ms\`
    });
  }
  
  fs.writeFileSync('${metrics_file}', JSON.stringify(summary, null, 2));
EOF

  # Check for alerts
  if [ -f "$metrics_file" ]; then
    alerts=$(node -e "
      const data = require('$metrics_file');
      if (data.alerts.length > 0) {
        console.log(data.alerts.map(a => \`[\${a.level}] \${a.message}\`).join('\n'));
      }
    ")
    
    if [ ! -z "$alerts" ]; then
      echo "⚠️ ALERTS DETECTED:"
      echo "$alerts"
    fi
  fi
}

# Function to generate summary report
generate_report() {
  echo "Generating metrics summary report..."
  
  node <<EOF
  const fs = require('fs');
  const path = require('path');
  
  const generateReport = () => {
    const metricsFiles = fs.readdirSync('${OUTPUT_DIR}')
      .filter(f => f.startsWith('metrics_'))
      .map(f => path.join('${OUTPUT_DIR}', f));
    
    const allMetrics = metricsFiles.map(f => require(f));
    
    const summary = {
      startTime: allMetrics[0].timestamp,
      endTime: allMetrics[allMetrics.length - 1].timestamp,
      averages: {
        requestRate: 0,
        errorRate: 0,
        responseTime: 0,
        cacheHitRate: 0,
        processingBatchSize: 0,
        activeUsers: 0
      },
      peaks: {
        requestRate: 0,
        errorRate: 0,
        responseTime: 0,
        activeUsers: 0
      },
      alerts: {
        total: 0,
        byLevel: {}
      }
    };
    
    // Calculate averages and peaks
    allMetrics.forEach(m => {
      Object.keys(summary.averages).forEach(key => {
        summary.averages[key] += m.metrics[key];
        summary.peaks[key] = Math.max(summary.peaks[key] || 0, m.metrics[key] || 0);
      });
      
      m.alerts.forEach(alert => {
        summary.alerts.total++;
        summary.alerts.byLevel[alert.level] = (summary.alerts.byLevel[alert.level] || 0) + 1;
      });
    });
    
    // Calculate final averages
    Object.keys(summary.averages).forEach(key => {
      summary.averages[key] /= allMetrics.length;
    });
    
    fs.writeFileSync(
      path.join('${OUTPUT_DIR}', 'metrics-summary.json'),
      JSON.stringify(summary, null, 2)
    );
  };
  
  generateReport();
EOF
}

# Main monitoring loop
echo "Starting metrics monitoring..."
echo "Service URL: $SERVICE_URL"
echo "Monitoring interval: $METRICS_INTERVAL seconds"
echo "Duration: $MONITORING_DURATION seconds"

check_service

start_time=$(date +%s)
end_time=$((start_time + MONITORING_DURATION))

while [ $(date +%s) -lt $end_time ]; do
  collect_metrics
  sleep $METRICS_INTERVAL
done

generate_report

echo "Monitoring completed!"
echo "Results available in: $OUTPUT_DIR"
echo "Summary report: $OUTPUT_DIR/metrics-summary.json" 