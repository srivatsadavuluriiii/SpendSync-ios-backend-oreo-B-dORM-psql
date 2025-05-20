#!/bin/bash

# Configuration
API_URL=${API_URL:-"https://api.spendsync.com"}
TEST_API_KEY=${TEST_API_KEY:-"test_key"}
RESULTS_DIR="./test-results/$(date +%Y%m%d_%H%M%S)"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to monitor system metrics
monitor_system() {
    while true; do
        date >> "$RESULTS_DIR/system_metrics.log"
        echo "CPU Usage:" >> "$RESULTS_DIR/system_metrics.log"
        top -bn1 | grep "Cpu(s)" >> "$RESULTS_DIR/system_metrics.log"
        echo "Memory Usage:" >> "$RESULTS_DIR/system_metrics.log"
        free -m >> "$RESULTS_DIR/system_metrics.log"
        echo "Disk I/O:" >> "$RESULTS_DIR/system_metrics.log"
        iostat >> "$RESULTS_DIR/system_metrics.log"
        echo "Network Stats:" >> "$RESULTS_DIR/system_metrics.log"
        netstat -s | grep -E "segments|packets" >> "$RESULTS_DIR/system_metrics.log"
        echo "-------------------" >> "$RESULTS_DIR/system_metrics.log"
        sleep 5
    done
}

# Function to run k6 test
run_k6_test() {
    local scenario=$1
    local output_file="$RESULTS_DIR/${scenario}_results.json"
    
    echo "Running $scenario test..."
    k6 run \
        --out json="$output_file" \
        --tag testid="$scenario" \
        --env API_URL="$API_URL" \
        --env API_KEY="$TEST_API_KEY" \
        tests/load/api-key-service.js
}

# Function to collect Prometheus metrics
collect_prometheus_metrics() {
    local start_time=$1
    local end_time=$2
    local output_file="$RESULTS_DIR/prometheus_metrics.json"

    # Collect key metrics
    curl -G "http://prometheus:9090/api/v1/query_range" \
        --data-urlencode "start=$start_time" \
        --data-urlencode "end=$end_time" \
        --data-urlencode "step=15s" \
        --data-urlencode 'query=rate(spendsync_api_key_requests_total[5m])' \
        > "$output_file"

    # Collect error rates
    curl -G "http://prometheus:9090/api/v1/query_range" \
        --data-urlencode "start=$start_time" \
        --data-urlencode "end=$end_time" \
        --data-urlencode "step=15s" \
        --data-urlencode 'query=rate(spendsync_api_key_validation_failures_total[5m])' \
        >> "$output_file"
}

# Start system monitoring in background
monitor_system &
MONITOR_PID=$!

# Record start time
START_TIME=$(date +%s)

# Run tests
echo "Starting load tests..."

# Normal load test
run_k6_test "normal_load"

# Stress test
run_k6_test "stress_test"

# Spike test
run_k6_test "spike_test"

# Soak test
run_k6_test "soak_test"

# Record end time
END_TIME=$(date +%s)

# Collect Prometheus metrics
collect_prometheus_metrics $START_TIME $END_TIME

# Stop system monitoring
kill $MONITOR_PID

# Generate report
echo "Generating test report..."
cat << EOF > "$RESULTS_DIR/report.md"
# Load Test Report

## Test Summary
- Start Time: $(date -d @$START_TIME)
- End Time: $(date -d @$END_TIME)
- Duration: $(($END_TIME - $START_TIME)) seconds

## Test Scenarios
1. Normal Load Test
2. Stress Test
3. Spike Test
4. Soak Test

## Results
- See individual JSON files for detailed metrics
- System metrics are available in system_metrics.log
- Prometheus metrics are available in prometheus_metrics.json

## Performance Thresholds
- 95th percentile response time: < 500ms
- Error rate: < 1%
- Failed requests: < 5%

## Analysis
Please review the metrics files for detailed analysis.
EOF

echo "Load testing completed. Results are available in $RESULTS_DIR" 