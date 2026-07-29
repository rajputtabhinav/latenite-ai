// Enhanced SSH Connection Handler with Diagnostics
'use client'
import { SSHDiagnostics, DiagnosticResult, SSHConnectionInfo } from './ssh-diagnostics'

export interface SSHCredentials {
  host: string
  username: string
  password?: string
  useKey: boolean
  keyContent?: string
  passphrase?: string
}

export interface ConnectionResult {
  success: boolean
  sessionId?: string
  message: string
  diagnostics?: DiagnosticResult[]
  suggestions?: string[]
  authMethod?: string
  serverInfo?: any
}

export class SSHConnectionHandler {
  
  // Enhanced connection with pre-flight diagnostics
  static async connectWithDiagnostics(
    credentials: SSHCredentials,
    runDiagnostics: boolean = true
  ): Promise<ConnectionResult> {
    const { host, username, useKey, password, keyContent } = credentials
    
    console.log(`🔄 Starting SSH connection to ${username}@${host}...`)
    
    // Step 1: Run diagnostics if requested
    let diagnostics: DiagnosticResult[] = []
    if (runDiagnostics) {
      console.log('🔍 Running pre-flight diagnostics...')
      
      const connectionInfo: SSHConnectionInfo = {
        host,
        port: 22,
        username,
        authMethod: useKey ? 'key' : 'password'
      }
      
      const authCredentials = useKey ? { keyContent } : { password }
      
      try {
        diagnostics = await SSHDiagnostics.runFullDiagnostics(connectionInfo, authCredentials)
        
        // Check if any critical tests failed
        const criticalFailures = diagnostics.filter(d => 
          d.status === 'fail' && 
          (d.test === 'Network Connectivity' || d.test === 'SSH Service')
        )
        
        if (criticalFailures.length > 0) {
          const suggestions = criticalFailures.flatMap(d => d.suggestions || [])
          return {
            success: false,
            message: `Pre-flight diagnostics failed: ${criticalFailures[0].message}`,
            diagnostics,
            suggestions
          }
        }
      } catch (error) {
        console.warn('Diagnostics failed, proceeding with connection attempt:', error)
      }
    }
    
    // Step 2: Attempt SSH connection
    try {
      const response = await fetch('/api/ssh/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          username,
          useKey,
          password: useKey ? undefined : password,
          keyContent: useKey ? keyContent : undefined,
          passphrase: credentials.passphrase
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        return {
          success: true,
          sessionId: result.sessionId,
          message: `Successfully connected to ${host}`,
          diagnostics,
          authMethod: result.authMethod,
          serverInfo: result.serverInfo
        }
      } else {
        // Enhanced error handling with specific suggestions
        const suggestions = this.getConnectionErrorSuggestions(result.message || 'Connection failed')
        
        return {
          success: false,
          message: result.message || 'SSH connection failed',
          diagnostics,
          suggestions
        }
      }
      
    } catch (error: any) {
      console.error('SSH connection error:', error)
      
      const suggestions = this.getConnectionErrorSuggestions(error.message)
      
      return {
        success: false,
        message: `Connection error: ${error.message}`,
        diagnostics,
        suggestions
      }
    }
  }
  
  // Get specific suggestions based on error message
  private static getConnectionErrorSuggestions(errorMessage: string): string[] {
    const error = errorMessage.toLowerCase()
    
    if (error.includes('connection refused') || error.includes('econnrefused')) {
      return [
        '🔧 SSH service is not running on the target host',
        '🔧 Check if SSH daemon is installed and started',
        '🔧 Verify the correct port (default is 22)',
        '🔧 Check firewall rules on the target host',
        '🔧 Try: sudo systemctl start ssh (Ubuntu) or sudo systemctl start sshd (CentOS)',
        '🔧 Verify SSH is configured to accept connections: sudo nano /etc/ssh/sshd_config'
      ]
    }
    
    if (error.includes('host not found') || error.includes('enotfound')) {
      return [
        '🌐 Check if the hostname/IP address is correct',
        '🌐 Verify DNS resolution for the hostname',
        '🌐 Try using IP address instead of hostname',
        '🌐 Check your internet connection',
        '🌐 Try: ping [hostname] to test basic connectivity'
      ]
    }
    
    if (error.includes('timeout') || error.includes('etimedout')) {
      return [
        '⏱️ Network connection is slow or unstable',
        '⏱️ Firewall may be blocking the connection',
        '⏱️ The host might be overloaded',
        '⏱️ Try increasing connection timeout',
        '⏱️ Check network connectivity: ping [hostname]',
        '⏱️ Try connecting from a different network'
      ]
    }
    
    if (error.includes('authentication') || error.includes('permission denied')) {
      return [
        '🔐 Verify username and password are correct',
        '🔐 Check if the user account exists on the target host',
        '🔐 Ensure user has SSH login permissions',
        '🔐 Check SSH daemon config: grep "PasswordAuthentication\\|PubkeyAuthentication" /etc/ssh/sshd_config',
        '🔐 Try creating the user: sudo useradd [username]',
        '🔐 Check user login shell: grep [username] /etc/passwd'
      ]
    }
    
    if (error.includes('key') || error.includes('publickey')) {
      return [
        '🔑 Check SSH private key format and validity',
        '🔑 Ensure public key is in ~/.ssh/authorized_keys on server',
        '🔑 Verify SSH key permissions: chmod 600 ~/.ssh/id_rsa',
        '🔑 Check authorized_keys permissions: chmod 644 ~/.ssh/authorized_keys',
        '🔑 Try generating new keys: ssh-keygen -t rsa -b 4096',
        '🔑 Copy public key: ssh-copy-id user@host'
      ]
    }
    
    if (error.includes('host unreachable') || error.includes('ehostunreach')) {
      return [
        '🌐 Host is not reachable from your network',
        '🌐 Check routing and network configuration',
        '🌐 Verify VPN connection if required',
        '🌐 Try: traceroute [hostname] to see routing path',
        '🌐 Check if host is behind firewall or NAT'
      ]
    }
    
    return [
      '🔍 Run diagnostics to identify specific issues',
      '🔍 Check network connectivity with ping',
      '🔍 Verify SSH service status on target host',
      '🔍 Review SSH server logs: tail -f /var/log/auth.log',
      '🔍 Test with verbose SSH client: ssh -v user@host'
    ]
  }
  
  // Validate SSH credentials before connection
  static validateCredentials(credentials: SSHCredentials): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Basic validation
    if (!credentials.host?.trim()) {
      errors.push('Host address is required')
    }
    
    if (!credentials.username?.trim()) {
      errors.push('Username is required')
    }
    
    // Authentication method validation
    if (credentials.useKey) {
      if (!credentials.keyContent?.trim()) {
        errors.push('SSH private key content is required for key authentication')
      } else {
        // Validate key format
        const keyContent = credentials.keyContent.trim()
        const validHeaders = [
          '-----BEGIN RSA PRIVATE KEY-----',
          '-----BEGIN DSA PRIVATE KEY-----',
          '-----BEGIN EC PRIVATE KEY-----',
          '-----BEGIN OPENSSH PRIVATE KEY-----',
          '-----BEGIN PRIVATE KEY-----'
        ]
        
        const hasValidHeader = validHeaders.some(header => keyContent.startsWith(header))
        if (!hasValidHeader) {
          errors.push('Invalid SSH key format. Key must start with proper header (e.g., -----BEGIN RSA PRIVATE KEY-----)')
        }
      }
    } else {
      if (!credentials.password?.trim()) {
        errors.push('Password is required for password authentication')
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  // Test connection without storing session
  static async testConnection(credentials: SSHCredentials): Promise<ConnectionResult> {
    try {
      const response = await fetch('/api/ssh/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: credentials.host,
          port: 22,
          username: credentials.username,
          authMethod: credentials.useKey ? 'key' : 'password',
          ...(credentials.useKey ? 
            { keyContent: credentials.keyContent } : 
            { password: credentials.password }
          )
        })
      })
      
      const result = await response.json()
      
      return {
        success: result.success,
        message: result.success ? 
          `Connection test successful for ${credentials.username}@${credentials.host}` :
          `Connection test failed: ${result.message}`,
        diagnostics: result.diagnostics?.results || []
      }
      
    } catch (error: any) {
      return {
        success: false,
        message: `Connection test error: ${error.message}`,
        suggestions: this.getConnectionErrorSuggestions(error.message)
      }
    }
  }
}
