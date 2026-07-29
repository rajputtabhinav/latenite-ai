import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'ssh2'

// SSH Connection Diagnostics System
// Based on web research for common SSH connectivity issues

interface DiagnosticResult {
  test: string
  status: 'pass' | 'fail' | 'warning'  
  message: string
  details?: any
}

interface ConnectionDiagnostics {
  host: string
  results: DiagnosticResult[]
  overall: 'healthy' | 'issues' | 'failed'
  recommendations: string[]
}

// Test basic TCP connectivity
async function testTCPConnection(host: string, port: number = 22): Promise<DiagnosticResult> {
  return new Promise((resolve) => {
    const net = require('net')
    const socket = new net.Socket()
    
    const timeout = setTimeout(() => {
      socket.destroy()
      resolve({
        test: 'TCP Connectivity',
        status: 'fail',
        message: `Cannot reach ${host}:${port} - Connection timeout`,
        details: { error: 'ETIMEDOUT', port }
      })
    }, 10000)
    
    socket.connect(port, host, () => {
      clearTimeout(timeout)
      socket.destroy()
      resolve({
        test: 'TCP Connectivity',
        status: 'pass',
        message: `Successfully connected to ${host}:${port}`,
        details: { port, latency: '< 10s' }
      })
    })
    
    socket.on('error', (err: any) => {
      clearTimeout(timeout)
      socket.destroy()
      
      let status: 'fail' | 'warning' = 'fail'
      let message = `Connection failed: ${err.message}`
      
      if (err.code === 'ECONNREFUSED') {
        message = `SSH service not running on ${host}:${port} or port blocked`
      } else if (err.code === 'EHOSTUNREACH') {
        message = `Host ${host} is unreachable - check network/firewall`
      } else if (err.code === 'ENOTFOUND') {
        message = `Hostname ${host} cannot be resolved - check DNS`
      }
      
      resolve({
        test: 'TCP Connectivity',
        status,
        message,
        details: { error: err.code, port }
      })
    })
  })
}

// Test SSH protocol handshake
async function testSSHHandshake(host: string, port: number = 22): Promise<DiagnosticResult> {
  return new Promise((resolve) => {
    const conn = new Client()
    
    const timeout = setTimeout(() => {
      conn.destroy()
      resolve({
        test: 'SSH Protocol',
        status: 'fail',
        message: 'SSH handshake timeout - server may not support SSH or is overloaded',
        details: { timeout: '15s' }
      })
    }, 15000)
    
    conn.on('ready', () => {
      clearTimeout(timeout)
      conn.end()
      resolve({
        test: 'SSH Protocol',
        status: 'pass',
        message: 'SSH protocol handshake successful',
        details: { version: 'SSH-2.0' }
      })
    })
    
    conn.on('error', (err: any) => {
      clearTimeout(timeout)
      conn.destroy()
      
      let message = 'SSH handshake failed'
      if (err.message.includes('Protocol')) {
        message = 'SSH protocol version mismatch or unsupported'
      } else if (err.message.includes('timeout')) {
        message = 'SSH handshake timeout - slow network or overloaded server'
      }
      
      resolve({
        test: 'SSH Protocol',
        status: 'fail',
        message: `${message}: ${err.message}`,
        details: { error: err.code || err.level }
      })
    })
    
    try {
      conn.connect({
        host,
        port,
        username: 'diagnostic-test', // This will fail auth but test protocol
        password: 'test'
      })
    } catch (error: any) {
      clearTimeout(timeout)
      resolve({
        test: 'SSH Protocol',
        status: 'fail',
        message: `Connection setup failed: ${error.message}`,
        details: { error: 'CONNECTION_SETUP' }
      })
    }
  })
}

// Test DNS resolution
async function testDNSResolution(host: string): Promise<DiagnosticResult> {
  return new Promise((resolve) => {
    const dns = require('dns')
    
    // Skip DNS test for IP addresses
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      resolve({
        test: 'DNS Resolution',
        status: 'pass',
        message: 'Using IP address - DNS resolution not required',
        details: { type: 'ip_address', host }
      })
      return
    }
    
    dns.lookup(host, (err: any, address: string) => {
      if (err) {
        resolve({
          test: 'DNS Resolution',
          status: 'fail',
          message: `Cannot resolve hostname ${host}: ${err.message}`,
          details: { error: err.code, hostname: host }
        })
        return
      }
      
      resolve({
        test: 'DNS Resolution',
        status: 'pass',
        message: `Successfully resolved ${host} to ${address}`,
        details: { hostname: host, ip: address }
      })
    })
  })
}

// Test supported SSH algorithms
async function testSSHAlgorithms(host: string, port: number = 22): Promise<DiagnosticResult> {
  return new Promise((resolve) => {
    const conn = new Client()
    let serverAlgorithms: any = {}
    
    const timeout = setTimeout(() => {
      conn.destroy()
      resolve({
        test: 'SSH Algorithms',
        status: 'warning',
        message: 'Could not determine supported algorithms - connection timeout',
        details: { timeout: '10s' }
      })
    }, 10000)
    
    conn.on('handshake', (handshake: any) => {
      clearTimeout(timeout)
      serverAlgorithms = handshake
      conn.destroy()
      
      const supportedAlgs = {
        kex: handshake.kex || [],
        cipher: handshake.serverHostKey || [],
        mac: handshake.mac || []
      }
      
      resolve({
        test: 'SSH Algorithms',
        status: 'pass',
        message: `Server supports ${handshake.kex?.length || 0} key exchange algorithms`,
        details: supportedAlgs
      })
    })
    
    conn.on('error', (err: any) => {
      clearTimeout(timeout)
      resolve({
        test: 'SSH Algorithms',
        status: 'fail',
        message: `Cannot determine algorithms: ${err.message}`,
        details: { error: err.code }
      })
    })
    
    conn.connect({
      host,
      port,
      username: 'test-algorithms',
      password: 'test'
    })
  })
}

// Main diagnostic function
async function runSSHDiagnostics(host: string, port: number = 22): Promise<ConnectionDiagnostics> {
  console.log(`🔍 Running SSH diagnostics for ${host}:${port}`)
  
  const results: DiagnosticResult[] = []
  const recommendations: string[] = []
  
  // Run all diagnostic tests
  const tests = [
    testDNSResolution(host),
    testTCPConnection(host, port),
    testSSHHandshake(host, port),
    testSSHAlgorithms(host, port)
  ]
  
  const testResults = await Promise.all(tests)
  results.push(...testResults)
  
  // Analyze results and generate recommendations
  let overall: 'healthy' | 'issues' | 'failed' = 'healthy'
  let passCount = 0
  let failCount = 0
  
  results.forEach(result => {
    if (result.status === 'pass') passCount++
    if (result.status === 'fail') failCount++
  })
  
  if (failCount > 0) {
    overall = failCount >= 2 ? 'failed' : 'issues'
  }
  
  // Generate specific recommendations based on results
  results.forEach(result => {
    if (result.status === 'fail') {
      if (result.test === 'DNS Resolution') {
        recommendations.push('Use IP address instead of hostname, or check DNS settings')
      } else if (result.test === 'TCP Connectivity') {
        recommendations.push('Check firewall rules and ensure SSH service is running on the server')
        recommendations.push('Verify the correct port (default is 22) and host address')
      } else if (result.test === 'SSH Protocol') {
        recommendations.push('Server may be overloaded - try again in a few minutes')
        recommendations.push('Check if SSH service is properly configured on the server')
      } else if (result.test === 'SSH Algorithms') {
        recommendations.push('Server may have restrictive algorithm policies')
        recommendations.push('Try using different SSH client algorithms or update SSH server')
      }
    }
  })
  
  // Add general recommendations for failed connections
  if (overall === 'failed') {
    recommendations.push('Based on web research, try these SSH keep-alive settings:')
    recommendations.push('- Set ServerAliveInterval=60 and ServerAliveCountMax=5 in SSH config')
    recommendations.push('- Use "ssh -o ServerAliveInterval=60 username@host" for one-time connections')
    recommendations.push('- Check if ClientAliveInterval is set on the server side')
  }
  
  return {
    host: `${host}:${port}`,
    results,
    overall,
    recommendations
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { host, port = 22 } = body
    
    if (!host) {
      return NextResponse.json({
        success: false,
        message: 'Host is required for diagnostics'
      }, { status: 400 })
    }
    
    console.log(`🔍 Starting SSH diagnostics for ${host}:${port}`)
    
    const diagnostics = await runSSHDiagnostics(host, port)
    
    return NextResponse.json({
      success: true,
      message: `SSH diagnostics completed for ${host}`,
      diagnostics,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('SSH diagnostics error:', error)
    return NextResponse.json({
      success: false,
      message: 'Diagnostics failed: ' + error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const host = searchParams.get('host')
    const port = parseInt(searchParams.get('port') || '22')
    
    if (action && host) {
      // Handle individual diagnostic tests
      switch (action) {
        case 'ping':
          const tcpResult = await testTCPConnection(host, port)
          return NextResponse.json({
            success: tcpResult.status === 'pass',
            result: tcpResult
          })
          
        case 'ssh_handshake':
          const sshResult = await testSSHHandshake(host, port)
          return NextResponse.json({
            success: sshResult.status === 'pass',
            result: sshResult,
            serverInfo: sshResult.details
          })
          
        case 'dns':
          const dnsResult = await testDNSResolution(host)
          return NextResponse.json({
            success: dnsResult.status === 'pass',
            result: dnsResult
          })
          
        case 'algorithms':
          const algResult = await testSSHAlgorithms(host, port)
          return NextResponse.json({
            success: algResult.status === 'pass',
            result: algResult
          })
          
        default:
          return NextResponse.json({
            success: false,
            message: `Unknown diagnostic action: ${action}`,
            available_actions: ['ping', 'ssh_handshake', 'dns', 'algorithms']
          }, { status: 400 })
      }
    }
    
    // Default GET response
    return NextResponse.json({
      success: true,
      message: 'SSH Diagnostics endpoint ready',
      status: 'operational',
      features: [
        'TCP connectivity testing',
        'DNS resolution verification', 
        'SSH protocol handshake testing',
        'SSH algorithm compatibility check',
        'Comprehensive error analysis',
        'Actionable recommendations'
      ],
      usage: {
        full_diagnostics: 'POST /api/ssh/diagnostics',
        individual_tests: 'GET /api/ssh/diagnostics?action=[ping|ssh_handshake|dns|algorithms]&host=HOST&port=PORT',
        parameters: {
          host: 'required - hostname or IP address',
          port: 'optional - SSH port (default: 22)'
        }
      }
    })
    
  } catch (error: any) {
    console.error('SSH diagnostics GET error:', error)
    return NextResponse.json({
      success: false,
      message: 'Diagnostics request failed: ' + error.message
    }, { status: 500 })
  }
}