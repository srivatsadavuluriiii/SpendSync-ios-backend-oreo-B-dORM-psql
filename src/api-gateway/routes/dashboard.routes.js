/**
 * Dashboard Routes
 * 
 * Routes for the admin dashboard to view service status
 */

const express = require('express');
const serviceRegistry = require('../../shared/services/service-registry');
const { cacheMiddleware, clearCache, getCacheStats } = require('../../shared/middleware/cache.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const router = express.Router();

/**
 * @route GET /dashboard/services
 * @desc Get status of all services
 * @access Private (admin)
 */
router.get('/services', authenticate({ required: true, roles: ['admin'] }), (req, res) => {
  const services = serviceRegistry.getAllServicesStatus();
  res.json({ services });
});

/**
 * @route GET /dashboard/services/:name
 * @desc Get status of a specific service
 * @access Private (admin)
 */
router.get('/services/:name', authenticate({ required: true, roles: ['admin'] }), (req, res) => {
  const { name } = req.params;
  const service = serviceRegistry.getServiceStatus(name);
  res.json({ service });
});

/**
 * @route GET /dashboard/cache
 * @desc Get cache statistics
 * @access Private (admin)
 */
router.get('/cache', authenticate({ required: true, roles: ['admin'] }), (req, res) => {
  const stats = getCacheStats();
  res.json({ cache: stats });
});

/**
 * @route POST /dashboard/cache/clear
 * @desc Clear cache by pattern
 * @access Private (admin)
 */
router.post('/cache/clear', authenticate({ required: true, roles: ['admin'] }), (req, res) => {
  const { pattern } = req.body;
  const cleared = clearCache(pattern);
  res.json({
    success: true,
    message: `Cleared ${cleared} cache entries`,
    pattern: pattern || 'all'
  });
});

/**
 * @route GET /dashboard
 * @desc Admin dashboard UI
 * @access Private (admin)
 */
router.get('/', authenticate({ required: true, roles: ['admin'] }), (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SpendSync Admin Dashboard</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        header {
          background: #f4f4f4;
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 4px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        h1, h2 {
          color: #333;
        }
        .services {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .service-card {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 1rem;
          background: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .service-name {
          font-weight: bold;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          display: block;
        }
        .status {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }
        .status-UP {
          background-color: #d4edda;
          color: #155724;
        }
        .status-DOWN {
          background-color: #f8d7da;
          color: #721c24;
        }
        .status-CIRCUIT_OPEN {
          background-color: #fff3cd;
          color: #856404;
        }
        .circuit {
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }
        .circuit-CLOSED {
          color: #155724;
        }
        .circuit-OPEN {
          color: #721c24;
        }
        .circuit-HALF_OPEN {
          color: #856404;
        }
        .details {
          margin-top: 0.5rem;
          font-size: 0.9rem;
          color: #666;
        }
        .refresh-btn, .btn {
          padding: 0.5rem 1rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 1rem;
        }
        .refresh-btn:hover, .btn:hover {
          background: #0069d9;
        }
        .btn-danger {
          background: #dc3545;
        }
        .btn-danger:hover {
          background: #c82333;
        }
        .tabs {
          display: flex;
          margin-bottom: 1rem;
          border-bottom: 1px solid #ddd;
        }
        .tab {
          padding: 0.5rem 1rem;
          cursor: pointer;
          margin-right: 0.5rem;
          border: 1px solid transparent;
          border-bottom: none;
        }
        .tab.active {
          background: #f4f4f4;
          border-color: #ddd;
          border-radius: 4px 4px 0 0;
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
        .cache-form {
          margin-top: 1rem;
          padding: 1rem;
          background: #f4f4f4;
          border-radius: 4px;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
        }
        .form-group input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .cache-stats {
          margin-top: 1rem;
        }
        .cache-entry {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          background: #fff;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>SpendSync Admin Dashboard</h1>
          <p>Monitor microservices status and health</p>
        </header>
        
        <div class="tabs">
          <div class="tab active" data-tab="services">Services</div>
          <div class="tab" data-tab="cache">Cache</div>
        </div>
        
        <div id="services-tab" class="tab-content active">
          <button class="refresh-btn" onclick="refreshServices()">Refresh Services</button>
          
          <div class="services" id="services-container">
            <!-- Service cards will be added here -->
            <div class="service-card">
              <span class="service-name">Loading services...</span>
            </div>
          </div>
        </div>
        
        <div id="cache-tab" class="tab-content">
          <h2>Cache Management</h2>
          
          <div class="cache-form">
            <h3>Clear Cache</h3>
            <div class="form-group">
              <label for="cache-pattern">Pattern (leave empty to clear all)</label>
              <input type="text" id="cache-pattern" placeholder="e.g. GET:/api/v1/users">
            </div>
            <button class="btn btn-danger" onclick="clearCacheEntries()">Clear Cache</button>
          </div>
          
          <div class="cache-stats">
            <h3>Cache Statistics</h3>
            <button class="refresh-btn" onclick="refreshCache()">Refresh Cache Stats</button>
            <div id="cache-stats-container">
              Loading cache statistics...
            </div>
          </div>
        </div>
      </div>

      <script>
        // Fetch services on page load
        document.addEventListener('DOMContentLoaded', () => {
          fetchServices();
          fetchCacheStats();
          setupTabs();
        });
        
        // Set up tabs
        function setupTabs() {
          const tabs = document.querySelectorAll('.tab');
          tabs.forEach(tab => {
            tab.addEventListener('click', () => {
              // Remove active class from all tabs
              tabs.forEach(t => t.classList.remove('active'));
              
              // Add active class to clicked tab
              tab.classList.add('active');
              
              // Hide all tab content
              document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
              });
              
              // Show clicked tab content
              const tabName = tab.getAttribute('data-tab');
              document.getElementById(tabName + '-tab').classList.add('active');
            });
          });
        }

        // Refresh services
        function refreshServices() {
          fetchServices();
        }
        
        // Refresh cache stats
        function refreshCache() {
          fetchCacheStats();
        }
        
        // Clear cache entries
        async function clearCacheEntries() {
          const pattern = document.getElementById('cache-pattern').value;
          
          try {
            const response = await fetch('/dashboard/cache/clear', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ pattern })
            });
            
            const data = await response.json();
            alert(\`\${data.message}\`);
            fetchCacheStats();
          } catch (error) {
            console.error('Error clearing cache:', error);
            alert('Error clearing cache: ' + (error.message || 'Unknown error'));
          }
        }

        // Fetch services data from API
        async function fetchServices() {
          try {
            const response = await fetch('/dashboard/services');
            const data = await response.json();
            renderServices(data.services);
          } catch (error) {
            console.error('Error fetching services:', error);
            document.getElementById('services-container').innerHTML = \`
              <div class="service-card">
                <span class="service-name">Error loading services</span>
                <p class="details">\${error.message || 'Could not connect to server'}</p>
              </div>
            \`;
          }
        }
        
        // Fetch cache statistics
        async function fetchCacheStats() {
          try {
            const response = await fetch('/dashboard/cache');
            const data = await response.json();
            renderCacheStats(data.cache);
          } catch (error) {
            console.error('Error fetching cache stats:', error);
            document.getElementById('cache-stats-container').innerHTML = \`
              <p>Error loading cache statistics: \${error.message || 'Could not connect to server'}</p>
            \`;
          }
        }

        // Render services in the UI
        function renderServices(services) {
          const container = document.getElementById('services-container');
          
          if (!services || services.length === 0) {
            container.innerHTML = '<div class="service-card"><span class="service-name">No services found</span></div>';
            return;
          }

          const html = services.map(service => {
            return \`
              <div class="service-card">
                <span class="service-name">\${service.name}</span>
                <div>URL: <a href="\${service.url}" target="_blank">\${service.url}</a></div>
                <div class="status status-\${service.status}">\${service.status}</div>
                \${renderCircuitInfo(service.circuit)}
              </div>
            \`;
          }).join('');

          container.innerHTML = html;
        }
        
        // Render cache statistics
        function renderCacheStats(stats) {
          const container = document.getElementById('cache-stats-container');
          
          if (!stats) {
            container.innerHTML = '<p>No cache statistics available</p>';
            return;
          }
          
          let html = \`
            <div>
              <p><strong>Size:</strong> \${stats.size} / \${stats.maxSize} entries</p>
              <p><strong>TTL:</strong> \${stats.ttl} seconds</p>
            </div>
          \`;
          
          if (stats.entries && stats.entries.length > 0) {
            html += '<h4>Cache Entries</h4>';
            
            stats.entries.forEach(entry => {
              html += \`
                <div class="cache-entry">
                  <div><strong>Key:</strong> \${entry.key}</div>
                  <div><strong>Size:</strong> \${formatSize(entry.size)}</div>
                  <div><strong>TTL:</strong> \${entry.ttl} seconds</div>
                </div>
              \`;
            });
          } else {
            html += '<p>No cache entries</p>';
          }
          
          container.innerHTML = html;
        }
        
        // Format size in bytes to human readable
        function formatSize(bytes) {
          if (bytes < 1024) {
            return bytes + ' B';
          } else if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
          } else {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
          }
        }

        // Render circuit breaker information
        function renderCircuitInfo(circuit) {
          if (!circuit) return '';

          return \`
            <div class="circuit">
              <div>Circuit: <span class="circuit-\${circuit.state}">\${circuit.state}</span></div>
              <div class="details">
                <div>Failures: \${circuit.failureCount}</div>
                <div>Successes: \${circuit.successCount}</div>
                \${circuit.lastFailureTime ? \`<div>Last failure: \${new Date(circuit.lastFailureTime).toLocaleString()}</div>\` : ''}
                \${circuit.lastAttemptTime ? \`<div>Last attempt: \${new Date(circuit.lastAttemptTime).toLocaleString()}</div>\` : ''}
              </div>
            </div>
          \`;
        }
      </script>
    </body>
    </html>
  `);
});

module.exports = router; 