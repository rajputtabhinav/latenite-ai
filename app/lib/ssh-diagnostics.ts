// SSH Connection Diagnostics and Validation System
'use client'

export interface DiagnosticResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: string
  suggestions?: string[]
  duration?: number
}

export interface SSHConnectionInfo {
  host: string
  port: number
  username: string
  authMethod: 'password' | 'key'
}

export class SSHDiagnostics {
  
  // Test basic network connectivity
  static async testNetworkConnectivity(host: string, port: number = 22): Promise<DiagnosticResult> {
    const startTime = Date.now()
    
    try {
      // Use fetch with a timeout to test basic connectivity
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      
      try {
        await fetch(`/api/ssh/diagnostics?action=ping&host=${host}&port=${port}`, {
          signal: controller.signal
        })
        clearTimeout(timeout)
      } catch (error: any) {
        clearTimeout(timeout)
        
        if (error.name === 'AbortError') {
          return {
            test: 'Network Connectivity',
            status: 'fail',
            message: `Connection timeout to ${host}:${port}`,
            details: 'The connection attempt timed out after 10 seconds',
            suggestions: [
              'Check if the host IP/hostname is correct',
              'Verify the host is reachable from your network',
              'Check firewall settings on both client and server',
              'Try connecting from a different network'
            ],
            duration: Date.now() - startTime
          }
        }
      }
      
      return {
        test: 'Network Connectivity',
        status: 'pass',
        message: `Successfully reached ${host}:${port}`,
        duration: Date.now() - startTime
      }
      
    } catch (error: any) {
      return {
        test: 'Network Connectivity',
        status: 'fail',
        message: `Failed to connect to ${host}:${port}`,
        details: error.message,
        suggestions: [
          'Verify the hostname/IP address is correct',
          'Check if the host is online and accessible',
          'Ensure port 22 (SSH) is open on the target host',
          'Check your network connection'
        ],
        duration: Date.now() - startTime
      }
    }
  }

  // Test SSH service availability
  static async testSSHService(host: string, port: number = 22): Promise<DiagnosticResult> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`/api/ssh/diagnostics?action=ssh_handshake&host=${host}&port=${port}`)
      const result = await response.json()
      
      if (result.success) {
        return {
          test: 'SSH Service',
          status: 'pass',
          message: `SSH service is running on ${host}:${port}`,
          details: result.serverInfo || 'SSH handshake successful',
          duration: Date.now() - startTime
        }
      } else {
        return {
          test: 'SSH Service',
          status: 'fail',
          message: result.message || `SSH service not available on ${host}:${port}`,
          suggestions: [
            'Ensure SSH daemon is running on the target host',
            'Check if SSH is listening on port 22',
            'Verify SSH is not blocked by firewall',
            'Try: sudo systemctl status ssh (on Ubuntu/Debian)',
            'Try: sudo systemctl status sshd (on CentOS/RHEL)'
          ],
          duration: Date.now() - startTime
        }
      }
      
    } catch (error: any) {
      return {
        test: 'SSH Service',
        status: 'fail',
        message: `Failed to test SSH service on ${host}:${port}`,
        details: error.message,
        suggestions: [
          'The host may be unreachable',
          'SSH service might not be installed or running',
          'Port 22 might be blocked or changed'
        ],
        duration: Date.now() - startTime
      }
    }
  }

  // Test authentication methods
  static async testAuthentication(connectionInfo: SSHConnectionInfo, credentials: any): Promise<DiagnosticResult> {
    const startTime = Date.now()
    const { host, port, username, authMethod } = connectionInfo
    
    try {
      const response = await fetch('/api/ssh/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_auth',
          host,
          port,
          username,
          authMethod,
          ...credentials
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        return {
          test: 'Authentication',
          status: 'pass',
          message: `${authMethod} authentication successful for ${username}@${host}`,
          duration: Date.now() - startTime
        }
      } else {
        return {
          test: 'Authentication',
          status: 'fail',
          message: result.message || `${authMethod} authentication failed`,
          details: result.details,
          suggestions: authMethod === 'password' ? [
            'Verify the username and password are correct',
            'Check if the user account exists on the target host',
            'Ensure the user has SSH login permissions',
            'Check if password authentication is enabled in SSH config'
          ] : [
            'Verify the SSH private key is correct and properly formatted',
            'Ensure the corresponding public key is in ~/.ssh/authorized_keys',
            'Check SSH key permissions (private key should be 600)',
            'Verify the key format is supported (RSA, ECDSA, Ed25519)'
          ],
          duration: Date.now() - startTime
        }
      }
      
    } catch (error: any) {
      return {
        test: 'Authentication',
        status: 'fail',
        message: `Authentication test failed for ${username}@${host}`,
        details: error.message,
        suggestions: [
          'Check network connectivity first',
          'Ensure SSH service is running on the target host'
        ],
        duration: Date.now() - startTime
      }
    }
  }

  // Run comprehensive diagnostics
  static async runFullDiagnostics(connectionInfo: SSHConnectionInfo, credentials: any): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = []
    const { host, port } = connectionInfo
    
    console.log(`🔍 Running SSH diagnostics for ${connectionInfo.username}@${host}:${port}`)
    
    // Test 1: Network connectivity
    const networkResult = await this.testNetworkConnectivity(host, port)
    results.push(networkResult)
    
    // If network fails, don't continue with other tests
    if (networkResult.status === 'fail') {
      return results
    }
    
    // Test 2: SSH service availability
    const sshServiceResult = await this.testSSHService(host, port)
    results.push(sshServiceResult)
    
    // If SSH service fails, don't test authentication
    if (sshServiceResult.status === 'fail') {
      return results
    }
    
    // Test 3: Authentication
    const authResult = await this.testAuthentication(connectionInfo, credentials)
    results.push(authResult)
    
    return results
  }

  // Generate diagnostic report
  static generateReport(results: DiagnosticResult[]): string {
    let report = '🔍 SSH Connection Diagnostics Report\n'
    report += '=' .repeat(50) + '\n\n'
    
    results.forEach((result, index) => {
      const statusIcon = result.status === 'pass' ? '✅' : 
                        result.status === 'warning' ? '⚠️' : '❌'
      
      report += `${index + 1}. ${statusIcon} ${result.test}\n`
      report += `   Status: ${result.status.toUpperCase()}\n`
      report += `   Message: ${result.message}\n`
      
      if (result.details) {
        report += `   Details: ${result.details}\n`
      }
      
      if (result.duration) {
        report += `   Duration: ${result.duration}ms\n`
      }
      
      if (result.suggestions && result.suggestions.length > 0) {
        report += `   Suggestions:\n`
        result.suggestions.forEach(suggestion => {
          report += `   • ${suggestion}\n`
        })
      }
      
      report += '\n'
    })
    
    // Summary
    const passed = results.filter(r => r.status === 'pass').length
    const failed = results.filter(r => r.status === 'fail').length
    const warnings = results.filter(r => r.status === 'warning').length
    
    report += `📊 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings\n`
    
    return report
  }

  // Get common connection error solutions
  static getErrorSolutions(error: string): string[] {
    const errorLower = error.toLowerCase()
    
    if (errorLower.includes('connection refused')) {
      return [
        'SSH service is not running on the target host',
        'Check if SSH daemon is installed and started',
        'Verify the correct port (default is 22)',
        'Check firewall rules on the target host',
        'Run: sudo systemctl start ssh (Ubuntu) or sshd (CentOS)'
      ]
    }
    
    if (errorLower.includes('host not found') || errorLower.includes('enotfound')) {
      return [
        'Check if the hostname/IP address is correct',
        'Verify DNS resolution for the hostname',
        'Try using IP address instead of hostname',
        'Check your internet connection'
      ]
    }
    
    if (errorLower.includes('timeout')) {
      return [
        'Network connection is slow or unstable',
        'Firewall may be blocking the connection',
        'The host might be overloaded',
        'Try increasing connection timeout',
        'Check network connectivity between client and server'
      ]
    }
    
    if (errorLower.includes('authentication') || errorLower.includes('permission denied')) {
      return [
        'Verify username and password/SSH key are correct',
        'Check if the user account exists on the target host',
        'Ensure SSH keys are properly configured',
        'Check SSH daemon configuration (/etc/ssh/sshd_config)',
        'Verify user has SSH login permissions'
      ]
    }
    
    if (errorLower.includes('key')) {
      return [
        'Check SSH private key format and validity',
        'Ensure public key is in ~/.ssh/authorized_keys on the server',
        'Verify SSH key permissions (600 for private key)',
        'Try generating a new SSH key pair',
        'Check if the key algorithm is supported by the server'
      ]
    }
    
    return [
      'Check network connectivity',
      'Verify SSH service is running',
      'Review SSH configuration',
      'Check firewall settings',
      'Consult system logs for more details'
    ]
  }
}
