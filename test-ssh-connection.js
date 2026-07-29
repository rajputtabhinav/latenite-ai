#!/usr/bin/env node

/**
 * Comprehensive SSH Connection Test
 * Tests real SSH connections and command execution
 */

const { Client } = require('ssh2');

// Test configuration - replace with your actual SSH details
const TEST_CONFIG = {
  host: '172.16.15.114', // Your SSH server from screenshot
  username: 'user',      // Your username from screenshot
  password: 'your_password_here', // Replace with actual password
  // Alternatively, use key-based auth:
  // privateKey: require('fs').readFileSync('/path/to/your/private/key'),
  readyTimeout: 20000,
  keepaliveInterval: 30000,
  keepaliveCountMax: 5
};

console.log('🔧 Starting comprehensive SSH connection test...\n');

async function testSSHConnection() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let testResults = {
      connection: false,
      authentication: false,
      commandExecution: false,
      realOutput: false,
      sessionPersistence: false
    };

    console.log(`🔄 Connecting to ${TEST_CONFIG.host}...`);

    conn.on('ready', () => {
      console.log('✅ SSH connection established successfully');
      testResults.connection = true;
      testResults.authentication = true;

      // Test 1: Basic command execution
      console.log('\n📋 Test 1: Basic command execution');
      conn.exec('whoami', (err, stream) => {
        if (err) {
          console.error('❌ Command execution failed:', err.message);
          conn.end();
          resolve(testResults);
          return;
        }

        testResults.commandExecution = true;
        let output = '';

        stream.on('close', (code, signal) => {
          console.log(`✅ Command completed with exit code: ${code}`);
          console.log(`📤 Output: "${output.trim()}"`);
          
          if (output.trim() === TEST_CONFIG.username) {
            console.log('✅ Real output detected - not fake!');
            testResults.realOutput = true;
          } else {
            console.log('⚠️ Unexpected output - might be fake or different user');
          }

          // Test 2: System information
          console.log('\n📋 Test 2: System information');
          conn.exec('uname -a && pwd && ls -la', (err2, stream2) => {
            if (err2) {
              console.error('❌ System info command failed:', err2.message);
              conn.end();
              resolve(testResults);
              return;
            }

            let sysOutput = '';
            stream2.on('data', (data) => {
              sysOutput += data.toString();
            });

            stream2.on('close', (code2) => {
              console.log(`✅ System info command completed with exit code: ${code2}`);
              console.log(`📤 System Output:\n${sysOutput}`);

              // Test 3: Interactive command
              console.log('\n📋 Test 3: Interactive command with real-time output');
              conn.exec('echo "Test message" && sleep 1 && echo "Delayed message"', (err3, stream3) => {
                if (err3) {
                  console.error('❌ Interactive command failed:', err3.message);
                  conn.end();
                  resolve(testResults);
                  return;
                }

                let interactiveOutput = '';
                let outputCount = 0;

                stream3.on('data', (data) => {
                  const chunk = data.toString();
                  interactiveOutput += chunk;
                  outputCount++;
                  console.log(`📤 Real-time chunk ${outputCount}: "${chunk.trim()}"`);
                });

                stream3.on('close', (code3) => {
                  console.log(`✅ Interactive command completed with exit code: ${code3}`);
                  
                  if (interactiveOutput.includes('Test message') && interactiveOutput.includes('Delayed message')) {
                    console.log('✅ Session persistence confirmed - real SSH connection!');
                    testResults.sessionPersistence = true;
                  }

                  conn.end();
                  resolve(testResults);
                });
              });
            });
          });
        });

        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          console.log('stderr:', data.toString());
        });
      });
    });

    conn.on('error', (err) => {
      console.error('❌ SSH connection error:', err.message);
      resolve(testResults);
    });

    conn.on('close', () => {
      console.log('🔌 SSH connection closed');
    });

    // Connect with configuration
    conn.connect(TEST_CONFIG);
  });
}

async function runTests() {
  try {
    const results = await testSSHConnection();
    
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`Connection:         ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Authentication:     ${results.authentication ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Command Execution:  ${results.commandExecution ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Real Output:        ${results.realOutput ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Session Persistence:${results.sessionPersistence ? '✅ PASS' : '❌ FAIL'}`);

    const passCount = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 Overall Score: ${passCount}/${totalTests} tests passed`);

    if (passCount === totalTests) {
      console.log('🎉 All tests passed! Your SSH connection is working perfectly.');
    } else if (passCount >= 3) {
      console.log('⚠️ Most tests passed, but there may be some issues to investigate.');
    } else {
      console.log('❌ Multiple test failures detected. SSH connection may not be working properly.');
    }

    console.log('\n💡 If tests are failing:');
    console.log('   1. Check your SSH credentials in TEST_CONFIG');
    console.log('   2. Ensure your SSH server is accessible');
    console.log('   3. Verify firewall settings');
    console.log('   4. Check SSH server configuration');

  } catch (error) {
    console.error('💥 Test execution failed:', error);
  }
}

// Run the tests
runTests();