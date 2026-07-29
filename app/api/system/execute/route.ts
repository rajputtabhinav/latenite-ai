import { NextRequest, NextResponse } from 'next/server'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execAsync = promisify(exec)

interface ExecuteRequest {
  command: string
  type: 'shell' | 'script' | 'file_operation' | 'system_admin'
  workingDirectory?: string
  environment?: Record<string, string>
  timeout?: number
  requiresAdmin?: boolean
  fileContent?: string
  filePath?: string
}

// Security whitelist for commands (can be expanded)
const SAFE_COMMANDS = [
  // File operations
  'ls', 'dir', 'cat', 'type', 'head', 'tail', 'find', 'grep', 'tree', 'du', 'df',
  // System info
  'pwd', 'whoami', 'uname', 'hostname', 'uptime', 'date', 'ps', 'top', 'htop', 'free', 'lscpu', 'lsblk',
  // Network
  'ping', 'curl', 'wget', 'netstat', 'ss', 'nslookup', 'dig', 'traceroute',
  // Development
  'node', 'npm', 'yarn', 'git', 'python', 'pip', 'python3', 'pip3', 'java', 'javac', 'gcc', 'make', 'cmake',
  // Package management
  'apt', 'apt-get', 'yum', 'dnf', 'pacman', 'brew', 'choco', 'winget', 'scoop',
  // Services and processes
  'systemctl', 'service', 'docker', 'docker-compose', 'kubectl', 'helm',
  // Text editors and IDEs
  'vim', 'nano', 'emacs', 'code', 'subl',
  // Archive operations
  'tar', 'zip', 'unzip', 'gzip', 'gunzip',
  // File permissions
  'chmod', 'chown', 'chgrp', 'su', 'sudo',
  // Environment
  'export', 'env', 'set', 'which', 'where', 'whereis'
]

// Enhanced command validation - Less restrictive, more intelligent
function isCommandSafe(command: string): boolean {
  // Remove sudo prefix for validation
  const cleanCommand = command.replace(/^sudo\s+/, '').trim()
  const baseCommand = cleanCommand.split(' ')[0]
  
  // Block only truly dangerous commands
  const dangerousPatterns = [
    /rm\s+-rf\s+\/(?![a-zA-Z])|rm\s+-rf\s+\*/, // Don't delete root or everything with wildcards
    /dd\s+if=.*of=\/dev\/\w+/, // Don't write to system devices
    /mkfs\s+\/dev\/\w+/, // Don't format system drives
    /fdisk.*\/dev\/\w+/, // Don't partition system drives
    />.*\/dev\/(?:null|zero|random|urandom)$/, // Allow redirects to safe devices only
    /shutdown\s+now|halt\s+now|reboot\s+now/, // Block immediate shutdowns (allow scheduled ones)
    /iptables\s+.*-F/, // Don't flush all iptables rules
    /killall\s+-9\s+.*/, // Block aggressive kill commands
    /chown\s+-R\s+.*\s+\/$/, // Don't change ownership of root
    /chmod\s+-R\s+777\s+\/$/, // Don't make root world-writable
  ]

  // Allow command if it doesn't match dangerous patterns
  const isDangerous = dangerousPatterns.some(pattern => pattern.test(cleanCommand))
  
  if (isDangerous) {
    console.log(`🚫 Blocked dangerous command: ${command}`)
    return false
  }

  console.log(`✅ Allowing command: ${command}`)
  return true
}

// Execute shell commands with full power
async function executeShellCommand(request: ExecuteRequest): Promise<any> {
  const { command, workingDirectory = process.cwd(), environment = {}, timeout = 30000 } = request
  
  try {
    // Enhanced security check
    if (!isCommandSafe(command)) {
      return {
        success: false,
        error: 'Command blocked for security reasons',
        output: '',
        exitCode: 1
      }
    }

    const options = {
      cwd: workingDirectory,
      env: { ...process.env, ...environment },
      timeout,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    }

    const { stdout, stderr } = await execAsync(command, options)
    
    return {
      success: true,
      output: stdout || stderr,
      error: stderr,
      exitCode: 0,
      command,
      workingDirectory,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
      exitCode: error.code || 1,
      command,
      workingDirectory,
      timestamp: new Date().toISOString()
    }
  }
}

// File operations with full access
async function executeFileOperation(request: ExecuteRequest): Promise<any> {
  const { command, filePath, fileContent, workingDirectory = process.cwd() } = request
  
  try {
    const fullPath = filePath ? path.resolve(workingDirectory, filePath) : ''
    
    switch (command) {
      case 'read_file':
        if (!filePath) throw new Error('File path required')
        const content = await fs.readFile(fullPath, 'utf-8')
        return {
          success: true,
          output: content,
          filePath: fullPath,
          size: content.length
        }
        
      case 'write_file':
        if (!filePath || fileContent === undefined) throw new Error('File path and content required')
        await fs.writeFile(fullPath, fileContent, 'utf-8')
        return {
          success: true,
          output: `File written successfully: ${fullPath}`,
          filePath: fullPath,
          size: fileContent.length
        }
        
      case 'append_file':
        if (!filePath || fileContent === undefined) throw new Error('File path and content required')
        await fs.appendFile(fullPath, fileContent, 'utf-8')
        return {
          success: true,
          output: `Content appended to: ${fullPath}`,
          filePath: fullPath
        }
        
      case 'delete_file':
        if (!filePath) throw new Error('File path required')
        await fs.unlink(fullPath)
        return {
          success: true,
          output: `File deleted: ${fullPath}`,
          filePath: fullPath
        }
        
      case 'create_directory':
        if (!filePath) throw new Error('Directory path required')
        await fs.mkdir(fullPath, { recursive: true })
        return {
          success: true,
          output: `Directory created: ${fullPath}`,
          filePath: fullPath
        }
        
      case 'list_directory':
        const dirPath = filePath || workingDirectory
        const files = await fs.readdir(dirPath, { withFileTypes: true })
        const fileList = files.map(file => ({
          name: file.name,
          type: file.isDirectory() ? 'directory' : 'file',
          path: path.join(dirPath, file.name)
        }))
        return {
          success: true,
          output: fileList.map(f => `${f.type === 'directory' ? 'd' : '-'} ${f.name}`).join('\n'),
          files: fileList,
          directory: dirPath
        }
        
      default:
        throw new Error(`Unknown file operation: ${command}`)
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      command,
      filePath,
      workingDirectory
    }
  }
}

// System administration tasks
async function executeSystemAdmin(request: ExecuteRequest): Promise<any> {
  const { command } = request
  
  // System administration commands with elevated privileges
  const adminCommands: Record<string, string> = {
    'install_package': 'npm install -g',
    'update_system': process.platform === 'win32' ? 'winget upgrade --all' : 'sudo apt update && sudo apt upgrade -y',
    'list_services': process.platform === 'win32' ? 'sc query' : 'systemctl list-units --type=service',
    'restart_service': process.platform === 'win32' ? 'sc stop && sc start' : 'sudo systemctl restart',
    'check_disk_space': 'df -h',
    'check_memory': process.platform === 'win32' ? 'wmic computersystem get TotalPhysicalMemory' : 'free -h',
    'list_processes': process.platform === 'win32' ? 'tasklist' : 'ps aux',
    'network_info': process.platform === 'win32' ? 'ipconfig /all' : 'ip addr show',
    'system_info': process.platform === 'win32' ? 'systeminfo' : 'uname -a && lsb_release -a'
  }
  
  const actualCommand = adminCommands[command] || command
  
  return await executeShellCommand({
    command: actualCommand,
    type: 'shell',
    workingDirectory: request.workingDirectory,
    timeout: 60000 // Longer timeout for admin tasks
  })
}

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteRequest = await request.json()
    
    if (!body.command) {
      return NextResponse.json({
        success: false,
        error: 'Command is required'
      }, { status: 400 })
    }
    
    let result: any
    
    switch (body.type) {
      case 'shell':
        result = await executeShellCommand(body)
        break
      case 'file_operation':
        result = await executeFileOperation(body)
        break
      case 'system_admin':
        result = await executeSystemAdmin(body)
        break
      case 'script':
        // For scripts, write to temp file and execute
        const tempPath = path.join(process.cwd(), 'temp_script.js')
        await fs.writeFile(tempPath, body.fileContent || '', 'utf-8')
        result = await executeShellCommand({
          command: `node ${tempPath}`,
          type: 'shell',
          workingDirectory: body.workingDirectory
        })
        // Clean up
        await fs.unlink(tempPath).catch(() => {})
        break
      default:
        result = await executeShellCommand(body)
    }
    
    return NextResponse.json({
      success: true,
      ...result,
      capabilities: {
        fileOperations: true,
        systemAdmin: true,
        codeExecution: true,
        packageManagement: true,
        networkOperations: true
      }
    })
    
  } catch (error) {
    console.error('System execution error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown execution error'
    }, { status: 500 })
  }
} 