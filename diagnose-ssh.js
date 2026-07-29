#!/usr/bin/env node

/**
 * SSH Connection Diagnostic Tool
 * Helps diagnose SSH connection issues without requiring credentials
 */

const { Client } = require('ssh2');
const net = require('net');

console.log('🔍 SSH Connection Diagnostic Tool\n');

// Test basic network connectivity
async function testNetworkConnectivity(host, port = 22) {
  return new Promise((resolve) => {
    console.log(`🌐 Testing network connectivity to ${host}:${port}...`);
    
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      console.log('❌ Network connection timeout');
      resolve(false);
    }, 5000);

    socket.connect(port, host, () => {
      clearTimeout(timeout);
      console.log('✅ Network connectivity successful');
      socket.destroy();
      resolve(true);
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      console.log(`❌ Network connection failed: ${err.message}`);
      resolve(false);
    });
  });
}

// Test SSH server availability
async function testSSHServerAvailability(host, port = 22) {
  return new Promise((resolve) => {
    console.log(`🔐 Testing SSH server availability on ${host}:${port}...`);
    
    const conn = new Client();
    
    conn.on('banner', (message) => {
      console.log(`📋 SSH Banner: ${message}`);
    });

    conn.on('greeting', (greeting) => {
      console.log(`👋 SSH Greeting: ${greeting}`);
    });

    conn.on('ready', () => {
      console.log('✅ SSH server is responding (authentication not tested)');
      conn.end();
      resolve(true);
    });

    conn.on('error', (err) => {
      if (err.message.includes('authentication')) {
        console.log('✅ SSH server is available (authentication required)');
        resolve(true);
      } else {
        console.log(`❌ SSH server error: ${err.message}`);
        resolve(false);
      }
    });

    // Try to connect without credentials to test server availability
    conn.connect({
      host: host,
      port: port,
      username: 'test',
      password: 'test',
      readyTimeout: 10000
    });
  });
}

// Check SSH2 library installation
function checkSSH2Installation() {
  console.log('📦 Checking SSH2 library installation...');
  try {
    const ssh2Version = require('ssh2/package.json').version;
    console.log(`✅ SSH2 library installed: v${ssh2Version}`);
    return true;
  } catch (error) {
    console.log('❌ SSH2 library not found or corrupted');
    return false;
  }
}

// Check WebSocket dependencies
function checkWebSocketDependencies() {
  console.log('🌐 Checking WebSocket dependencies...');
  const deps = [];
  
  try {
    const wsVersion = require('ws/package.json').version;
    console.log(`✅ ws library installed: v${wsVersion}`);
    deps.push('ws');
  } catch (error) {
    console.log('❌ ws library not found');
  }

  try {
    const socketioVersion = require('socket.io/package.json').version;
    console.log(`✅ socket.io library installed: v${socketioVersion}`);
    deps.push('socket.io');
  } catch (error) {
    console.log('❌ socket.io library not found');
  }

  return deps.length > 0;
}

// Main diagnostic function
async function runDiagnostics() {
  console.log('🚀 Starting SSH diagnostics...\n');

  const results = {
    ssh2Library: false,
    websocketDeps: false,
    networkConnectivity: false,
    sshServerAvailability: false
  };

  // Test 1: Check SSH2 library
  results.ssh2Library = checkSSH2Installation();
  console.log('');

  // Test 2: Check WebSocket dependencies
  results.websocketDeps = checkWebSocketDependencies();
  console.log('');

  // Test 3: Network connectivity (using the host from your screenshot)
  results.networkConnectivity = await testNetworkConnectivity('172.16.15.114');
  console.log('');

  // Test 4: SSH server availability
  results.sshServerAvailability = await testSSHServerAvailability('172.16.15.114');
  console.log('');

  // Summary
  console.log('📊 Diagnostic Results Summary:');
  console.log('==============================');
  console.log(`SSH2 Library:         ${results.ssh2Library ? '✅ OK' : '❌ MISSING'}`);
  console.log(`WebSocket Dependencies: ${results.websocketDeps ? '✅ OK' : '❌ MISSING'}`);
  console.log(`Network Connectivity:  ${results.networkConnectivity ? '✅ OK' : '❌ FAILED'}`);
  console.log(`SSH Server Available:  ${results.sshServerAvailability ? '✅ OK' : '❌ FAILED'}`);

  const passCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🎯 Overall Health: ${passCount}/4 checks passed\n`);

  // Recommendations
  console.log('💡 Recommendations:');
  if (!results.ssh2Library) {
    console.log('   📦 Install SSH2: npm install ssh2 @types/ssh2');
  }
  if (!results.websocketDeps) {
    console.log('   🌐 Install WebSocket deps: npm install ws @types/ws socket.io socket.io-client');
  }
  if (!results.networkConnectivity) {
    console.log('   🌐 Check network connection and firewall settings');
  }
  if (!results.sshServerAvailability) {
    console.log('   🔐 Verify SSH server is running and accessible');
  }
  
  if (passCount === 4) {
    console.log('   🎉 All systems operational! Your SSH setup should work perfectly.');
  }

  console.log('\n🔧 Next Steps:');
  console.log('   1. Ensure you have valid SSH credentials');
  console.log('   2. Test the connection in your Latenite.ai terminal');
  console.log('   3. Use the WebSocket terminal for real-time experience');
}

// Run diagnostics
runDiagnostics().catch(console.error);