/**
 * Monitoring Configuration
 * 
 * Defines configuration for monitoring, alerts, and performance tracking
 */

const validateConfig = () => {
  const requiredEnvVars = {
    email: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'ALERT_EMAIL_RECIPIENTS'],
    slack: ['ALERT_SLACK_WEBHOOK']
  };

  const missingVars = [];
  
  if (process.env.ENABLE_EMAIL_ALERTS === 'true') {
    requiredEnvVars.email.forEach(varName => {
      if (!process.env[varName]) missingVars.push(varName);
    });
  }

  if (process.env.ENABLE_SLACK_ALERTS === 'true') {
    requiredEnvVars.slack.forEach(varName => {
      if (!process.env[varName]) missingVars.push(varName);
    });
  }

  if (missingVars.length > 0) {
    console.warn(`Warning: Missing required environment variables for alerts: ${missingVars.join(', ')}`);
  }
};

validateConfig();

module.exports = {
  // Performance monitoring thresholds
  performance: {
    // Response time thresholds in milliseconds
    responseTime: {
      warning: parseInt(process.env.ALERT_THRESHOLD_RESPONSE_TIME_WARNING, 10) || 1000,
      critical: parseInt(process.env.ALERT_THRESHOLD_RESPONSE_TIME_CRITICAL, 10) || 3000
    },
    // Memory usage thresholds
    memoryUsage: {
      warning: parseFloat(process.env.ALERT_THRESHOLD_MEMORY_WARNING) || 0.6,
      critical: parseFloat(process.env.ALERT_THRESHOLD_MEMORY_CRITICAL) || 0.75
    },
    // CPU usage thresholds
    cpuUsage: {
      warning: parseInt(process.env.ALERT_THRESHOLD_CPU_WARNING, 10) || 60,
      critical: parseInt(process.env.ALERT_THRESHOLD_CPU_CRITICAL, 10) || 75
    }
  },

  // Error monitoring thresholds
  errors: {
    // Error rate thresholds (errors per minute)
    errorRate: {
      warning: 5,       // 5 errors/minute
      critical: 10      // 10 errors/minute
    },
    // 4xx rate thresholds (per minute)
    clientErrorRate: {
      warning: 50,      // 50 per minute
      critical: 100     // 100 per minute
    },
    // 5xx rate thresholds (per minute)
    serverErrorRate: {
      warning: 5,       // 5 per minute
      critical: 10      // 10 per minute
    }
  },

  // Security monitoring thresholds
  security: {
    // Failed authentication attempts (per minute)
    failedAuth: {
      warning: 10,      // 10 per minute
      critical: 20      // 20 per minute
    },
    // Rate limit exceeded events (per minute)
    rateLimitExceeded: {
      warning: 50,      // 50 per minute
      critical: 100     // 100 per minute
    }
  },

  // Alert notification channels
  alerts: {
    // Email notifications
    email: {
      enabled: process.env.ENABLE_EMAIL_ALERTS === 'true',
      config: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
      from: process.env.ALERT_EMAIL_FROM || 'alerts@spendsync.com'
    },
    // Slack notifications
    slack: {
      enabled: process.env.ENABLE_SLACK_ALERTS === 'true',
      webhook: process.env.ALERT_SLACK_WEBHOOK,
      channel: process.env.ALERT_SLACK_CHANNEL || '#alerts'
    }
  },

  // Metrics collection
  metrics: {
    // Interval for collecting metrics in milliseconds
    interval: 60000,    // 1 minute
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
  },

  // Request handling
  request: {
    // Body size limits
    bodyLimit: '256kb',
    // Request timeout
    timeout: 15000,
    // Maximum concurrent requests
    maxConcurrent: 5,
    // Request queue settings
    queue: {
      // Maximum requests in queue
      maxSize: 10,
      // Maximum wait time in queue (ms)
      maxWait: 5000,
      // Whether to enable request prioritization
      enablePriority: true,
      // Priority levels (higher number = higher priority)
      priorities: {
        health: 10,     // Health checks
        auth: 8,        // Authentication requests
        user: 5,        // User operations
        default: 1      // Default priority
      }
    },
    // Throttling settings
    throttling: {
      enabled: true,
      // Requests per window per IP
      windowMs: 60000, // 1 minute
      // Different rate limits for different endpoints
      limits: {
        default: {
          windowMs: 60000,
          max: 10      // Reduced from 30 to 10
        },
        auth: {
          windowMs: 300000,
          max: 5       // Reduced from 20 to 5
        },
        user: {
          windowMs: 60000,
          max: 20      // Reduced from 60 to 20
        },
        expenses: {
          windowMs: 60000,
          max: 30      // Reduced from 120 to 30
        },
        settlements: {
          windowMs: 60000,
          max: 20      // Reduced from 60 to 20
        }
      },
      // Burst handling
      burst: {
        enabled: true,
        maxBurst: 2,   // Reduced from 5 to 2
        burstTTL: 500  // Reduced from 1000ms to 500ms
      }
    },
    // Per-client settings
    client: {
      // Maximum requests per client
      maxRequestsPerClient: 2,
      // Track client memory usage
      trackMemoryUsage: true,
      // Maximum memory per client (bytes)
      maxMemoryPerClient: 1 * 1024 * 1024 // Reduced from 5MB to 1MB
    }
  },

  // Cache settings
  cache: {
    // Enable response caching
    enabled: true,
    // Default TTL in seconds
    defaultTTL: 60,
    // Maximum cache size in bytes
    maxSize: 20 * 1024 * 1024,
    // Cache rules by path
    rules: {
      // User data - shorter TTL
      '^/api/v1/users': {
        ttl: 30,
        methods: ['GET']
      },
      // Expense data
      '^/api/v1/expenses': {
        ttl: 60,
        methods: ['GET']
      },
      // Settlement data
      '^/api/v1/settlements': {
        ttl: 120,
        methods: ['GET']
      },
      // Static content
      '^/static/': {
        ttl: 1800,
        methods: ['GET']
      }
    },
    // Excluded paths (never cache these)
    exclude: [
      '^/api/v1/auth',
      '^/health$',
      '^/metrics$'
    ]
  },

  // Memory optimization
  memory: {
    // Garbage collection settings
    gc: {
      // Trigger GC when heap usage exceeds this percentage
      heapThreshold: 0.3,
      // Minimum interval between GC triggers (ms)
      minInterval: 3000,
      // Force GC if memory usage keeps increasing
      forceThreshold: 0.5
    },
    // Memory monitoring settings
    monitoring: {
      // How often to check memory usage (ms)
      interval: 1000,
      // How many snapshots to keep
      snapshotRetention: 10,
      // Consecutive growth checks for leak detection
      leakDetectionThreshold: 2
    },
    // Response size thresholds
    response: {
      // Size in bytes above which to stream response
      streamThreshold: 64 * 1024,
      // Maximum response size to hold in memory
      maxSize: 512 * 1024
    }
  }
}; 