"use strict";var _process$env$ALERT_EM; /**
 * Monitoring Configuration
 * 
 * Defines configuration for monitoring, alerts, and performance tracking
 */

module.exports = {
  // Performance monitoring thresholds
  performance: {
    // Response time thresholds in milliseconds
    responseTime: {
      warning: 1000, // 1 second
      critical: 3000 // 3 seconds
    },
    // Memory usage thresholds in bytes
    memoryUsage: {
      warning: 0.7, // 70% of max
      critical: 0.85 // 85% of max
    },
    // CPU usage thresholds in percentage
    cpuUsage: {
      warning: 70, // 70%
      critical: 85 // 85%
    }
  },

  // Error monitoring thresholds
  errors: {
    // Error rate thresholds (errors per minute)
    errorRate: {
      warning: 5, // 5 errors/minute
      critical: 10 // 10 errors/minute
    },
    // 4xx rate thresholds (per minute)
    clientErrorRate: {
      warning: 50, // 50 per minute
      critical: 100 // 100 per minute
    },
    // 5xx rate thresholds (per minute)
    serverErrorRate: {
      warning: 5, // 5 per minute
      critical: 10 // 10 per minute
    }
  },

  // Security monitoring thresholds
  security: {
    // Failed authentication attempts (per minute)
    failedAuth: {
      warning: 10, // 10 per minute
      critical: 20 // 20 per minute
    },
    // Rate limit exceeded events (per minute)
    rateLimitExceeded: {
      warning: 50, // 50 per minute
      critical: 100 // 100 per minute
    }
  },

  // Alert notification channels
  alerts: {
    // Email notifications
    email: {
      enabled: true,
      recipients: ((_process$env$ALERT_EM = process.env.ALERT_EMAIL_RECIPIENTS) == null ? void 0 : _process$env$ALERT_EM.split(',')) || [],
      from: process.env.ALERT_EMAIL_FROM || 'alerts@spendsync.com'
    },
    // Slack notifications
    slack: {
      enabled: true,
      webhook: process.env.ALERT_SLACK_WEBHOOK,
      channel: process.env.ALERT_SLACK_CHANNEL || '#alerts'
    }
  },

  // Metrics collection
  metrics: {
    // Interval for collecting metrics in milliseconds
    interval: 60000, // 1 minute
    // Whether to collect detailed request metrics
    detailedRequestMetrics: true,
    // Whether to collect detailed response metrics
    detailedResponseMetrics: true,
    // Whether to collect system metrics
    systemMetrics: true
  },

  // Log aggregation
  logging: {
    // Whether to aggregate logs centrally
    centralizedLogging: true,
    // Log retention period in days
    retentionDays: 30,
    // Whether to enable log analysis
    enableAnalysis: true
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnRzIiwicGVyZm9ybWFuY2UiLCJyZXNwb25zZVRpbWUiLCJ3YXJuaW5nIiwiY3JpdGljYWwiLCJtZW1vcnlVc2FnZSIsImNwdVVzYWdlIiwiZXJyb3JzIiwiZXJyb3JSYXRlIiwiY2xpZW50RXJyb3JSYXRlIiwic2VydmVyRXJyb3JSYXRlIiwic2VjdXJpdHkiLCJmYWlsZWRBdXRoIiwicmF0ZUxpbWl0RXhjZWVkZWQiLCJhbGVydHMiLCJlbWFpbCIsImVuYWJsZWQiLCJyZWNpcGllbnRzIiwiX3Byb2Nlc3MkZW52JEFMRVJUX0VNIiwicHJvY2VzcyIsImVudiIsIkFMRVJUX0VNQUlMX1JFQ0lQSUVOVFMiLCJzcGxpdCIsImZyb20iLCJBTEVSVF9FTUFJTF9GUk9NIiwic2xhY2siLCJ3ZWJob29rIiwiQUxFUlRfU0xBQ0tfV0VCSE9PSyIsImNoYW5uZWwiLCJBTEVSVF9TTEFDS19DSEFOTkVMIiwibWV0cmljcyIsImludGVydmFsIiwiZGV0YWlsZWRSZXF1ZXN0TWV0cmljcyIsImRldGFpbGVkUmVzcG9uc2VNZXRyaWNzIiwic3lzdGVtTWV0cmljcyIsImxvZ2dpbmciLCJjZW50cmFsaXplZExvZ2dpbmciLCJyZXRlbnRpb25EYXlzIiwiZW5hYmxlQW5hbHlzaXMiXSwic291cmNlcyI6WyIuLi8uLi9zcmMvY29uZmlnL21vbml0b3JpbmcuY29uZmlnLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTW9uaXRvcmluZyBDb25maWd1cmF0aW9uXG4gKiBcbiAqIERlZmluZXMgY29uZmlndXJhdGlvbiBmb3IgbW9uaXRvcmluZywgYWxlcnRzLCBhbmQgcGVyZm9ybWFuY2UgdHJhY2tpbmdcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gUGVyZm9ybWFuY2UgbW9uaXRvcmluZyB0aHJlc2hvbGRzXG4gIHBlcmZvcm1hbmNlOiB7XG4gICAgLy8gUmVzcG9uc2UgdGltZSB0aHJlc2hvbGRzIGluIG1pbGxpc2Vjb25kc1xuICAgIHJlc3BvbnNlVGltZToge1xuICAgICAgd2FybmluZzogMTAwMCwgICAgLy8gMSBzZWNvbmRcbiAgICAgIGNyaXRpY2FsOiAzMDAwICAgIC8vIDMgc2Vjb25kc1xuICAgIH0sXG4gICAgLy8gTWVtb3J5IHVzYWdlIHRocmVzaG9sZHMgaW4gYnl0ZXNcbiAgICBtZW1vcnlVc2FnZToge1xuICAgICAgd2FybmluZzogMC43LCAgICAgLy8gNzAlIG9mIG1heFxuICAgICAgY3JpdGljYWw6IDAuODUgICAgLy8gODUlIG9mIG1heFxuICAgIH0sXG4gICAgLy8gQ1BVIHVzYWdlIHRocmVzaG9sZHMgaW4gcGVyY2VudGFnZVxuICAgIGNwdVVzYWdlOiB7XG4gICAgICB3YXJuaW5nOiA3MCwgICAgICAvLyA3MCVcbiAgICAgIGNyaXRpY2FsOiA4NSAgICAgIC8vIDg1JVxuICAgIH1cbiAgfSxcblxuICAvLyBFcnJvciBtb25pdG9yaW5nIHRocmVzaG9sZHNcbiAgZXJyb3JzOiB7XG4gICAgLy8gRXJyb3IgcmF0ZSB0aHJlc2hvbGRzIChlcnJvcnMgcGVyIG1pbnV0ZSlcbiAgICBlcnJvclJhdGU6IHtcbiAgICAgIHdhcm5pbmc6IDUsICAgICAgIC8vIDUgZXJyb3JzL21pbnV0ZVxuICAgICAgY3JpdGljYWw6IDEwICAgICAgLy8gMTAgZXJyb3JzL21pbnV0ZVxuICAgIH0sXG4gICAgLy8gNHh4IHJhdGUgdGhyZXNob2xkcyAocGVyIG1pbnV0ZSlcbiAgICBjbGllbnRFcnJvclJhdGU6IHtcbiAgICAgIHdhcm5pbmc6IDUwLCAgICAgIC8vIDUwIHBlciBtaW51dGVcbiAgICAgIGNyaXRpY2FsOiAxMDAgICAgIC8vIDEwMCBwZXIgbWludXRlXG4gICAgfSxcbiAgICAvLyA1eHggcmF0ZSB0aHJlc2hvbGRzIChwZXIgbWludXRlKVxuICAgIHNlcnZlckVycm9yUmF0ZToge1xuICAgICAgd2FybmluZzogNSwgICAgICAgLy8gNSBwZXIgbWludXRlXG4gICAgICBjcml0aWNhbDogMTAgICAgICAvLyAxMCBwZXIgbWludXRlXG4gICAgfVxuICB9LFxuXG4gIC8vIFNlY3VyaXR5IG1vbml0b3JpbmcgdGhyZXNob2xkc1xuICBzZWN1cml0eToge1xuICAgIC8vIEZhaWxlZCBhdXRoZW50aWNhdGlvbiBhdHRlbXB0cyAocGVyIG1pbnV0ZSlcbiAgICBmYWlsZWRBdXRoOiB7XG4gICAgICB3YXJuaW5nOiAxMCwgICAgICAvLyAxMCBwZXIgbWludXRlXG4gICAgICBjcml0aWNhbDogMjAgICAgICAvLyAyMCBwZXIgbWludXRlXG4gICAgfSxcbiAgICAvLyBSYXRlIGxpbWl0IGV4Y2VlZGVkIGV2ZW50cyAocGVyIG1pbnV0ZSlcbiAgICByYXRlTGltaXRFeGNlZWRlZDoge1xuICAgICAgd2FybmluZzogNTAsICAgICAgLy8gNTAgcGVyIG1pbnV0ZVxuICAgICAgY3JpdGljYWw6IDEwMCAgICAgLy8gMTAwIHBlciBtaW51dGVcbiAgICB9XG4gIH0sXG5cbiAgLy8gQWxlcnQgbm90aWZpY2F0aW9uIGNoYW5uZWxzXG4gIGFsZXJ0czoge1xuICAgIC8vIEVtYWlsIG5vdGlmaWNhdGlvbnNcbiAgICBlbWFpbDoge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIHJlY2lwaWVudHM6IHByb2Nlc3MuZW52LkFMRVJUX0VNQUlMX1JFQ0lQSUVOVFM/LnNwbGl0KCcsJykgfHwgW10sXG4gICAgICBmcm9tOiBwcm9jZXNzLmVudi5BTEVSVF9FTUFJTF9GUk9NIHx8ICdhbGVydHNAc3BlbmRzeW5jLmNvbSdcbiAgICB9LFxuICAgIC8vIFNsYWNrIG5vdGlmaWNhdGlvbnNcbiAgICBzbGFjazoge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIHdlYmhvb2s6IHByb2Nlc3MuZW52LkFMRVJUX1NMQUNLX1dFQkhPT0ssXG4gICAgICBjaGFubmVsOiBwcm9jZXNzLmVudi5BTEVSVF9TTEFDS19DSEFOTkVMIHx8ICcjYWxlcnRzJ1xuICAgIH1cbiAgfSxcblxuICAvLyBNZXRyaWNzIGNvbGxlY3Rpb25cbiAgbWV0cmljczoge1xuICAgIC8vIEludGVydmFsIGZvciBjb2xsZWN0aW5nIG1ldHJpY3MgaW4gbWlsbGlzZWNvbmRzXG4gICAgaW50ZXJ2YWw6IDYwMDAwLCAgICAvLyAxIG1pbnV0ZVxuICAgIC8vIFdoZXRoZXIgdG8gY29sbGVjdCBkZXRhaWxlZCByZXF1ZXN0IG1ldHJpY3NcbiAgICBkZXRhaWxlZFJlcXVlc3RNZXRyaWNzOiB0cnVlLFxuICAgIC8vIFdoZXRoZXIgdG8gY29sbGVjdCBkZXRhaWxlZCByZXNwb25zZSBtZXRyaWNzXG4gICAgZGV0YWlsZWRSZXNwb25zZU1ldHJpY3M6IHRydWUsXG4gICAgLy8gV2hldGhlciB0byBjb2xsZWN0IHN5c3RlbSBtZXRyaWNzXG4gICAgc3lzdGVtTWV0cmljczogdHJ1ZVxuICB9LFxuXG4gIC8vIExvZyBhZ2dyZWdhdGlvblxuICBsb2dnaW5nOiB7XG4gICAgLy8gV2hldGhlciB0byBhZ2dyZWdhdGUgbG9ncyBjZW50cmFsbHlcbiAgICBjZW50cmFsaXplZExvZ2dpbmc6IHRydWUsXG4gICAgLy8gTG9nIHJldGVudGlvbiBwZXJpb2QgaW4gZGF5c1xuICAgIHJldGVudGlvbkRheXM6IDMwLFxuICAgIC8vIFdoZXRoZXIgdG8gZW5hYmxlIGxvZyBhbmFseXNpc1xuICAgIGVuYWJsZUFuYWx5c2lzOiB0cnVlXG4gIH1cbn07ICJdLCJtYXBwaW5ncyI6IndDQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUFBLE1BQU0sQ0FBQ0MsT0FBTyxHQUFHO0VBQ2Y7RUFDQUMsV0FBVyxFQUFFO0lBQ1g7SUFDQUMsWUFBWSxFQUFFO01BQ1pDLE9BQU8sRUFBRSxJQUFJLEVBQUs7TUFDbEJDLFFBQVEsRUFBRSxJQUFJLENBQUk7SUFDcEIsQ0FBQztJQUNEO0lBQ0FDLFdBQVcsRUFBRTtNQUNYRixPQUFPLEVBQUUsR0FBRyxFQUFNO01BQ2xCQyxRQUFRLEVBQUUsSUFBSSxDQUFJO0lBQ3BCLENBQUM7SUFDRDtJQUNBRSxRQUFRLEVBQUU7TUFDUkgsT0FBTyxFQUFFLEVBQUUsRUFBTztNQUNsQkMsUUFBUSxFQUFFLEVBQUUsQ0FBTTtJQUNwQjtFQUNGLENBQUM7O0VBRUQ7RUFDQUcsTUFBTSxFQUFFO0lBQ047SUFDQUMsU0FBUyxFQUFFO01BQ1RMLE9BQU8sRUFBRSxDQUFDLEVBQVE7TUFDbEJDLFFBQVEsRUFBRSxFQUFFLENBQU07SUFDcEIsQ0FBQztJQUNEO0lBQ0FLLGVBQWUsRUFBRTtNQUNmTixPQUFPLEVBQUUsRUFBRSxFQUFPO01BQ2xCQyxRQUFRLEVBQUUsR0FBRyxDQUFLO0lBQ3BCLENBQUM7SUFDRDtJQUNBTSxlQUFlLEVBQUU7TUFDZlAsT0FBTyxFQUFFLENBQUMsRUFBUTtNQUNsQkMsUUFBUSxFQUFFLEVBQUUsQ0FBTTtJQUNwQjtFQUNGLENBQUM7O0VBRUQ7RUFDQU8sUUFBUSxFQUFFO0lBQ1I7SUFDQUMsVUFBVSxFQUFFO01BQ1ZULE9BQU8sRUFBRSxFQUFFLEVBQU87TUFDbEJDLFFBQVEsRUFBRSxFQUFFLENBQU07SUFDcEIsQ0FBQztJQUNEO0lBQ0FTLGlCQUFpQixFQUFFO01BQ2pCVixPQUFPLEVBQUUsRUFBRSxFQUFPO01BQ2xCQyxRQUFRLEVBQUUsR0FBRyxDQUFLO0lBQ3BCO0VBQ0YsQ0FBQzs7RUFFRDtFQUNBVSxNQUFNLEVBQUU7SUFDTjtJQUNBQyxLQUFLLEVBQUU7TUFDTEMsT0FBTyxFQUFFLElBQUk7TUFDYkMsVUFBVSxFQUFFLEVBQUFDLHFCQUFBLEdBQUFDLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDQyxzQkFBc0IscUJBQWxDSCxxQkFBQSxDQUFvQ0ksS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFJLEVBQUU7TUFDaEVDLElBQUksRUFBRUosT0FBTyxDQUFDQyxHQUFHLENBQUNJLGdCQUFnQixJQUFJO0lBQ3hDLENBQUM7SUFDRDtJQUNBQyxLQUFLLEVBQUU7TUFDTFQsT0FBTyxFQUFFLElBQUk7TUFDYlUsT0FBTyxFQUFFUCxPQUFPLENBQUNDLEdBQUcsQ0FBQ08sbUJBQW1CO01BQ3hDQyxPQUFPLEVBQUVULE9BQU8sQ0FBQ0MsR0FBRyxDQUFDUyxtQkFBbUIsSUFBSTtJQUM5QztFQUNGLENBQUM7O0VBRUQ7RUFDQUMsT0FBTyxFQUFFO0lBQ1A7SUFDQUMsUUFBUSxFQUFFLEtBQUssRUFBSztJQUNwQjtJQUNBQyxzQkFBc0IsRUFBRSxJQUFJO0lBQzVCO0lBQ0FDLHVCQUF1QixFQUFFLElBQUk7SUFDN0I7SUFDQUMsYUFBYSxFQUFFO0VBQ2pCLENBQUM7O0VBRUQ7RUFDQUMsT0FBTyxFQUFFO0lBQ1A7SUFDQUMsa0JBQWtCLEVBQUUsSUFBSTtJQUN4QjtJQUNBQyxhQUFhLEVBQUUsRUFBRTtJQUNqQjtJQUNBQyxjQUFjLEVBQUU7RUFDbEI7QUFDRixDQUFDIiwiaWdub3JlTGlzdCI6W119