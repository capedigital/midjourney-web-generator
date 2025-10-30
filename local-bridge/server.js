#!/usr/bin/env node

/**
 * Local WebSocket Bridge Server
 * Connects the Railway web app to your local browser extension
 * 
 * Security Features:
 * - Localhost binding only (127.0.0.1)
 * - Random auth token (regenerates on restart)
 * - Origin header verification
 * - Connection limit
 */

const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

// Configuration
const PORT = 3001;
const HOST = '127.0.0.1'; // Localhost only - NOT exposed to network
const MAX_CONNECTIONS = 5;
const ALLOWED_ORIGINS = [
  'https://midjourney-web-production.up.railway.app',
  'http://localhost:3000', // For local development
  'http://localhost:5000'
];

// Generate random auth token on startup
const AUTH_TOKEN = crypto.randomBytes(32).toString('hex');

console.log('🔐 Local Bridge Server Starting...');
console.log('📋 Auth Token:', AUTH_TOKEN);
console.log('💡 Add this to your web app connection settings');
console.log('');

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      connections: wss.clients.size,
      authenticated: authenticatedClients.size
    }));
  } else if (req.url === '/token') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ token: AUTH_TOKEN }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info, callback) => {
    // Verify origin
    const origin = info.origin || info.req.headers.origin;
    
    if (!origin) {
      console.log('❌ Connection rejected: No origin header');
      return callback(false, 403, 'Origin required');
    }

    const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
    
    if (!isAllowed) {
      console.log('❌ Connection rejected: Invalid origin:', origin);
      return callback(false, 403, 'Invalid origin');
    }

    // Check connection limit
    if (wss.clients.size >= MAX_CONNECTIONS) {
      console.log('❌ Connection rejected: Max connections reached');
      return callback(false, 429, 'Too many connections');
    }

    console.log('✅ Connection verified from:', origin);
    callback(true);
  }
});

// Track authenticated clients
const authenticatedClients = new Set();
const extensionClients = new Set();
const webAppClients = new Set();

wss.on('connection', (ws, req) => {
  console.log('🔌 New connection from:', req.headers.origin);
  
  let isAuthenticated = false;
  let clientType = null;
  let authTimeout = null;

  // Require authentication within 5 seconds
  authTimeout = setTimeout(() => {
    if (!isAuthenticated) {
      console.log('⏱️ Connection timeout: No authentication');
      ws.close(4001, 'Authentication timeout');
    }
  }, 5000);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      // Handle authentication
      if (message.type === 'auth') {
        if (message.token === AUTH_TOKEN) {
          isAuthenticated = true;
          clientType = message.clientType || 'unknown';
          authenticatedClients.add(ws);
          
          if (clientType === 'extension') {
            extensionClients.add(ws);
          } else if (clientType === 'webapp') {
            webAppClients.add(ws);
          }
          
          clearTimeout(authTimeout);
          
          ws.send(JSON.stringify({
            type: 'auth_success',
            clientType: clientType
          }));
          
          console.log(`✅ Client authenticated as: ${clientType}`);
          console.log(`📊 Status: ${extensionClients.size} extension(s), ${webAppClients.size} web app(s)`);
          
          // Notify all web apps about extension availability
          broadcastToWebApps({
            type: 'extension_status',
            available: extensionClients.size > 0
          });
        } else {
          console.log('❌ Authentication failed: Invalid token');
          ws.close(4002, 'Invalid token');
        }
        return;
      }

      // Require authentication for all other messages
      if (!isAuthenticated) {
        console.log('⚠️ Message rejected: Not authenticated');
        ws.close(4003, 'Not authenticated');
        return;
      }

      // Route messages based on type
      if (message.type === 'submit_prompt' || message.type === 'submit_batch') {
        // Forward from web app to extension
        console.log(`📤 Forwarding ${message.type} to extension(s)`);
        broadcastToExtensions(message);
      } else if (message.type === 'prompt_result' || message.type === 'batch_result') {
        // Forward from extension to web apps
        console.log(`📥 Forwarding ${message.type} to web app(s)`);
        broadcastToWebApps(message);
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      } else {
        console.log('⚠️ Unknown message type:', message.type);
      }

    } catch (error) {
      console.error('❌ Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    authenticatedClients.delete(ws);
    extensionClients.delete(ws);
    webAppClients.delete(ws);
    clearTimeout(authTimeout);
    
    console.log(`🔌 Client disconnected (${clientType || 'unauthenticated'})`);
    console.log(`📊 Status: ${extensionClients.size} extension(s), ${webAppClients.size} web app(s)`);
    
    // Notify web apps if extension disconnected
    if (clientType === 'extension') {
      broadcastToWebApps({
        type: 'extension_status',
        available: extensionClients.size > 0
      });
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
});

function broadcastToExtensions(message) {
  extensionClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastToWebApps(message) {
  webAppClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Start server
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('✅ Local Bridge Server running');
  console.log(`🌐 WebSocket: ws://${HOST}:${PORT}`);
  console.log(`🏥 Health: http://${HOST}:${PORT}/health`);
  console.log(`🔑 Token: http://${HOST}:${PORT}/token`);
  console.log('');
  console.log('🔒 Security:');
  console.log('   ✓ Localhost only (not exposed to network)');
  console.log('   ✓ Origin verification enabled');
  console.log('   ✓ Authentication required');
  console.log('   ✓ Connection limit:', MAX_CONNECTIONS);
  console.log('');
  console.log('Press Ctrl+C to stop');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  wss.clients.forEach(client => {
    client.close(1000, 'Server shutting down');
  });
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
