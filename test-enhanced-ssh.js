#!/usr/bin/env node

// Enhanced SSH System Test Script
// Tests the new SSH capabilities and diagnostics

const axios = require('axios')

const BASE_URL = 'http://localhost:3000'

// ANSI color codes for better output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}🚀 ${msg}${colors.reset}\n`)
}

async function testSSHDiagnostics(host) {
  try {
    log.test(`Testing SSH diagnostics for ${host}`)
    
    const response = await axios.post(`${BASE_URL}/api/ssh/diagnostics`, {
      host: host,
      port: 22
    })
    
    if (response.data.success) {
      const diagnostics = response.data.diagnostics
      log.success(`Diagnostics completed - Overall status: ${diagnostics.overall}`)
      
      diagnostics.results.forEach(result => {
        const status = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
        console.log(`  ${status} ${result.test}: ${result.message}`)
      })
      
      if (diagnostics.recommendations.length > 0) {
        log.warning('Recommendations:')
        diagnostics.recommendations.forEach(rec => {
          console.log(`    • ${rec}`)
        })
      }
      
      return diagnostics.overall === 'healthy'
    } else {
      log.error(`Diagnostics failed: ${response.data.message}`)
      return false
    }
  } catch (error) {
    log.error(`Diagnostics error: ${error.message}`)
    return false
  }
}

async function testSSHConnection(host, username, password) {
  try {
    log.test(`Testing SSH connection to ${username}@${host}`)
    
    const response = await axios.post(`${BASE_URL}/api/ssh/connect`, {
      host: host,
      username: username,
      password: password,
      useKey: false
    })
    
    if (response.data.success) {
      log.success(`Connection successful! Session: ${response.data.sessionId}`)
      log.info(`Auth method: ${response.data.authMethod}`)
      log.info(`Server info: ${response.data.serverInfo.os}`)
      return response.data.sessionId
    } else {
      log.error(`Connection failed: ${response.data.message}`)
      return null
    }
  } catch (error) {
    log.error(`Connection error: ${error.response?.data?.message || error.message}`)
    return null
  }
}

async function testSSHHealth() {
  try {
    log.test('Testing SSH health monitoring')
    
    const response = await axios.get(`${BASE_URL}/api/ssh/health`)
    
    if (response.data.success) {
      const health = response.data.health
      log.success(`Health check completed - Overall: ${health.overall}`)
      log.info(`Total sessions: ${health.totalSessions}`)
      log.info(`Healthy: ${health.healthySessions}, Degraded: ${health.degradedSessions}, Unhealthy: ${health.unhealthySessions}`)
      
      if (health.recommendations.length > 0) {
        log.warning('Health recommendations:')
        health.recommendations.forEach(rec => {
          console.log(`    • ${rec}`)
        })
      }
      
      return true
    } else {
      log.error(`Health check failed: ${response.data.message}`)
      return false
    }
  } catch (error) {
    log.error(`Health check error: ${error.message}`)
    return false
  }
}

async function testTerminalCommand(sessionId, command) {
  try {
    log.test(`Testing terminal command: "${command}"`)
    
    const response = await axios.post(`${BASE_URL}/api/ssh/terminal`, {
      type: 'command',
      content: command,
      sessionId: sessionId
    })
    
    if (response.data.success) {
      log.success(`Command executed successfully`)
      console.log(`Output: ${response.data.output.substring(0, 100)}${response.data.output.length > 100 ? '...' : ''}`)
      return true
    } else {
      log.error(`Command failed: ${response.data.message}`)
      return false
    }
  } catch (error) {
    log.error(`Command error: ${error.response?.data?.message || error.message}`)
    return false
  }
}

async function runTests() {
  log.header('Enhanced SSH System Testing')
  
  // Get test parameters from command line or use defaults
  const host = process.argv[2] || '192.168.1.100'
  const username = process.argv[3] || 'root' 
  const password = process.argv[4] || 'your_password'
  
  log.info(`Testing with: ${username}@${host}`)
  log.info('Note: Update credentials in command line arguments if needed')
  console.log('Usage: node test-enhanced-ssh.js <host> <username> <password>\n')
  
  let testResults = {
    diagnostics: false,
    health: false,
    connection: false,
    terminal: false
  }
  
  // Test 1: SSH Diagnostics
  log.header('Test 1: SSH Diagnostics')
  testResults.diagnostics = await testSSHDiagnostics(host)
  
  // Test 2: Health Monitoring
  log.header('Test 2: SSH Health Monitoring')
  testResults.health = await testSSHHealth()
  
  // Test 3: SSH Connection (only if diagnostics passed)
  if (testResults.diagnostics) {
    log.header('Test 3: SSH Connection')
    const sessionId = await testSSHConnection(host, username, password)
    testResults.connection = !!sessionId
    
    // Test 4: Terminal Commands (only if connection succeeded)
    if (sessionId) {
      log.header('Test 4: Terminal Commands')
      
      const commands = [
        'whoami',
        'pwd', 
        'uname -a',
        'echo "Enhanced SSH system test successful!"'
      ]
      
      let commandResults = []
      for (const cmd of commands) {
        const result = await testTerminalCommand(sessionId, cmd)
        commandResults.push(result)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait between commands
      }
      
      testResults.terminal = commandResults.every(r => r)
    }
  } else {
    log.warning('Skipping connection tests due to diagnostic failures')
  }
  
  // Final Results
  log.header('Test Results Summary')
  
  console.log(`🔍 Diagnostics: ${testResults.diagnostics ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`🏥 Health Monitor: ${testResults.health ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`🔗 SSH Connection: ${testResults.connection ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`💻 Terminal Commands: ${testResults.terminal ? '✅ PASSED' : '❌ FAILED'}`)
  
  const passedTests = Object.values(testResults).filter(r => r).length
  const totalTests = Object.keys(testResults).length
  
  console.log(`\n📊 Overall: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    log.success('🎉 All tests passed! Enhanced SSH system is working perfectly!')
  } else if (passedTests > 0) {
    log.warning(`⚠️  Partial success: ${passedTests}/${totalTests} tests passed`)
  } else {
    log.error('❌ All tests failed. Check server connectivity and credentials.')
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('Enhanced SSH System Test Complete')
  console.log('='.repeat(60))
}

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    log.error(`Test suite failed: ${error.message}`)
    process.exit(1)
  })
}

module.exports = { runTests }