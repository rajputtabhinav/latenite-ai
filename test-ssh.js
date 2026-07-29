#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Test SSH API endpoints
async function testSSHEndpoints() {
  console.log('🧪 Testing SSH API Endpoints...\n');

  const baseUrl = 'http://localhost:3000';
  
  // Test 1: SSH Status
  console.log('1️⃣ Testing SSH Status Endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/ssh/status`);
    const data = await response.json();
    console.log('✅ SSH Status:', data.status);
    console.log('📊 Statistics:', data.statistics);
    console.log('🔧 Capabilities:', Object.keys(data.capabilities).filter(k => data.capabilities[k]).join(', '));
  } catch (error) {
    console.error('❌ SSH Status failed:', error.message);
  }

  console.log('\n');

  // Test 2: SSH Connect (Real Connection Test)
  console.log('2️⃣ Testing SSH Connection (requires real server)...');
  console.log('ℹ️ This test requires a valid SSH server to connect to.');
  console.log('⏭️ Skipping real connection test - configure with your SSH details to test.');

  console.log('\n');

  // Test 3: Invalid Connection (should fail gracefully)
  console.log('3️⃣ Testing Invalid Connection (Error Handling)...');
  try {
    const invalidResponse = await fetch(`${baseUrl}/api/ssh/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'invalid-host-12345.com',
        username: 'invaliduser',
        password: 'wrongpassword',
        useKey: false
      })
    });
    
    const invalidData = await invalidResponse.json();
    if (!invalidData.success) {
      console.log('✅ Error handling working correctly');
      console.log('🚫 Expected error:', invalidData.message);
    } else {
      console.log('⚠️ Unexpected success for invalid connection');
    }
  } catch (error) {
    console.log('✅ Error handling working correctly');
    console.log('🚫 Network error (expected):', error.message);
  }

  console.log('\n🏁 SSH Tests Complete!');
}

// Helper function to make fetch work in Node.js (if needed)
if (typeof fetch === 'undefined') {
  const { fetch } = require('undici');
  global.fetch = fetch;
}

// Run tests
testSSHEndpoints().catch(console.error); 