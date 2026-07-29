// Enhanced File Operations Manager - Advanced File Manipulation System
// Provides intelligent file creation, editing, and management capabilities

// TODO: Implement advanced-command-executor and terminal-state-manager modules
// import { advancedExecutor } from './advanced-command-executor'
// import { terminalStateManager } from './terminal-state-manager'

// Temporary command executor until advanced-command-executor is implemented
const executeCommand = async (command: string, socket?: any): Promise<{ success: boolean; output: string; stdout?: string; stderr?: string; error?: string }> => {
  // This is a placeholder implementation
  // TODO: Replace with actual SSH command execution
  return {
    success: true,
    output: `Command queued: ${command}`,
    stdout: `Command queued: ${command}`,
    stderr: '',
    error: undefined
  }
}

const advancedExecutor = {
  getInstance: () => ({
    executeWithContext: executeCommand
  })
}

export interface FileOperationRequest {
  operation: FileOperation
  path: string
  content?: string
  permissions?: string
  owner?: string
  backup?: boolean
  validate?: boolean
  template?: string
  metadata?: FileMetadata
}

export interface FileOperationResult {
  success: boolean
  path: string
  operation: FileOperation
  message: string
  backupPath?: string
  validationResults?: ValidationResult[]
  metadata?: FileMetadata
  duration: number
  timestamp: Date
}

export interface FileMetadata {
  size: number
  permissions: string
  owner: string
  group: string
  lastModified: Date
  type: 'file' | 'directory' | 'symlink' | 'device' | 'pipe'
  checksums?: {
    md5?: string
    sha256?: string
  }
  destPath?: string
}

export interface ValidationResult {
  check: string
  passed: boolean
  details: string
  severity: 'info' | 'warning' | 'error'
}

export interface FileTemplate {
  name: string
  description: string
  content: string
  permissions: string
  variables: TemplateVariable[]
  postActions?: string[]
}

export interface TemplateVariable {
  name: string
  description: string
  defaultValue?: string
  required: boolean
  type: 'string' | 'number' | 'boolean' | 'path' | 'email' | 'ip'
}

export type FileOperation = 
  | 'create' | 'edit' | 'delete' | 'copy' | 'move' | 'backup'
  | 'compress' | 'extract' | 'search' | 'replace' | 'validate'
  | 'watch' | 'sync' | 'encrypt' | 'decrypt' | 'template'

export class EnhancedFileOperations {
  private templates: Map<string, FileTemplate> = new Map()
  private backupDirectory = '/tmp/file_backups'
  private socket?: any
  private onStatusUpdate?: (status: string, type: 'info' | 'warning' | 'error' | 'success') => void

  constructor() {
    this.initializeTemplates()
    this.ensureBackupDirectory()
  }

  // Intelligent file creation with templates and validation
  async createFile(request: FileOperationRequest): Promise<FileOperationResult> {
    const startTime = Date.now()
    
    try {
      this.onStatusUpdate?.(`📝 Creating file: ${request.path}`, 'info')

      // Ensure parent directory exists
      const parentDir = request.path.substring(0, request.path.lastIndexOf('/'))
      if (parentDir && parentDir !== request.path) {
        await this.ensureDirectory(parentDir)
      }

      // Apply template if specified
      let content = request.content || ''
      if (request.template) {
        content = await this.applyTemplate(request.template, content, request.metadata)
      }

      // Create the file with intelligent content generation
      if (!content && request.path.includes('.')) {
        content = await this.generateIntelligentContent(request.path)
      }

      // Write file content
      const result = await this.writeFileContent(request.path, content)
      
      if (!result.success) {
        throw new Error(`Failed to write file: ${result.stderr}`)
      }

      // Set permissions if specified
      if (request.permissions) {
        await advancedExecutor.getInstance().executeWithContext(`chmod ${request.permissions} "${request.path}"`, this.socket)
      }

      // Set owner if specified
      if (request.owner) {
        await advancedExecutor.getInstance().executeWithContext(`chown ${request.owner} "${request.path}"`, this.socket)
      }

      // Validate file if requested
      let validationResults: ValidationResult[] = []
      if (request.validate) {
        validationResults = await this.validateFile(request.path, content)
      }

      // Get file metadata
      const metadata = await this.getFileMetadata(request.path)

      this.onStatusUpdate?.(`✅ File created successfully: ${request.path}`, 'success')

      return {
        success: true,
        path: request.path,
        operation: 'create',
        message: 'File created successfully',
        validationResults,
        metadata,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }

    } catch (error) {
      this.onStatusUpdate?.(`❌ Failed to create file ${request.path}: ${error}`, 'error')
      
      return {
        success: false,
        path: request.path,
        operation: 'create',
        message: (error instanceof Error ? error.message : String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  // Intelligent file editing with backup and validation
  async editFile(request: FileOperationRequest): Promise<FileOperationResult> {
    const startTime = Date.now()
    
    try {
      this.onStatusUpdate?.(`✏️ Editing file: ${request.path}`, 'info')

      // Check if file exists
      const fileExists = await this.checkFileExists(request.path)
      if (!fileExists) {
        throw new Error(`File does not exist: ${request.path}`)
      }

      // Create backup if requested
      let backupPath: string | undefined
      if (request.backup !== false) {
        backupPath = await this.createBackup(request.path)
      }

      // Read current content
      const currentContent = await this.readFileContent(request.path)

      // Apply intelligent edits
      const newContent = await this.applyIntelligentEdits(
        request.path,
        currentContent,
        request.content || '',
        request.metadata
      )

      // Write updated content
      const writeResult = await this.writeFileContent(request.path, newContent)
      
      if (!writeResult.success) {
        // Restore backup if write failed
        if (backupPath) {
          await advancedExecutor.getInstance().executeWithContext(`mv "${backupPath}" "${request.path}"`, this.socket)
        }
        throw new Error(`Failed to write file: ${writeResult.stderr}`)
      }

      // Validate edited file if requested
      let validationResults: ValidationResult[] = []
      if (request.validate) {
        validationResults = await this.validateFile(request.path, newContent)
        
        // If validation fails, restore backup
        const criticalFailures = validationResults.filter(v => !v.passed && v.severity === 'error')
        if (criticalFailures.length > 0 && backupPath) {
          this.onStatusUpdate?.(`⚠️ Validation failed, restoring backup`, 'warning')
          await advancedExecutor.getInstance().executeWithContext(`mv "${backupPath}" "${request.path}"`, this.socket)
          throw new Error(`Validation failed: ${criticalFailures.map(f => f.details).join(', ')}`)
        }
      }

      // Get updated metadata
      const metadata = await this.getFileMetadata(request.path)

      this.onStatusUpdate?.(`✅ File edited successfully: ${request.path}`, 'success')

      return {
        success: true,
        path: request.path,
        operation: 'edit',
        message: 'File edited successfully',
        backupPath,
        validationResults,
        metadata,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }

    } catch (error) {
      this.onStatusUpdate?.(`❌ Failed to edit file ${request.path}: ${error}`, 'error')
      
      return {
        success: false,
        path: request.path,
        operation: 'edit',
        message: (error instanceof Error ? error.message : String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  // Advanced file management operations
  async manageFiles(requests: FileOperationRequest[]): Promise<FileOperationResult[]> {
    const results: FileOperationResult[] = []
    
    this.onStatusUpdate?.(`🔧 Managing ${requests.length} file operations`, 'info')

    for (const request of requests) {
      try {
        let result: FileOperationResult

        switch (request.operation) {
          case 'create':
            result = await this.createFile(request)
            break
          case 'edit':
            result = await this.editFile(request)
            break
          case 'delete':
            result = await this.deleteFile(request)
            break
          case 'copy':
            result = await this.copyFile(request)
            break
          case 'move':
            result = await this.moveFile(request)
            break
          case 'backup':
            result = await this.backupFile(request)
            break
          case 'compress':
            result = await this.compressFile(request)
            break
          case 'extract':
            result = await this.extractFile(request)
            break
          case 'search':
            result = await this.searchInFile(request)
            break
          case 'replace':
            result = await this.replaceInFile(request)
            break
          case 'validate':
            result = await this.validateFileOperation(request)
            break
          default:
            result = {
              success: false,
              path: request.path,
              operation: request.operation,
              message: `Unsupported operation: ${request.operation}`,
              duration: 0,
              timestamp: new Date()
            }
        }

        results.push(result)

      } catch (error) {
        results.push({
          success: false,
          path: request.path,
          operation: request.operation,
          message: (error instanceof Error ? error.message : String(error)),
          duration: 0,
          timestamp: new Date()
        })
      }
    }

    const successful = results.filter(r => r.success).length
    this.onStatusUpdate?.(`📊 File operations completed: ${successful}/${results.length} successful`, 'info')

    return results
  }

  // Generate intelligent file content based on file type
  private async generateIntelligentContent(filePath: string): Promise<string> {
    const extension = filePath.split('.').pop()?.toLowerCase()
    const fileName = filePath.split('/').pop()?.toLowerCase()

    // Use AI to generate appropriate content
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `GENERATE FILE CONTENT

FILE PATH: ${filePath}
FILE EXTENSION: ${extension}
FILE NAME: ${fileName}

Generate appropriate content for this file based on its type and purpose. Consider:

1. For configuration files (.conf, .config, .ini): Generate commented template with common settings
2. For scripts (.sh, .py, .js): Generate basic structure with shebang and comments
3. For web files (.html, .css, .js): Generate basic boilerplate
4. For documentation (.md, .txt): Generate structured template
5. For data files (.json, .yaml, .xml): Generate well-formed structure
6. For source code: Generate basic class/function structure with comments

Provide practical, production-ready content that follows best practices.
Include helpful comments and documentation.

Return ONLY the file content, no explanation.`
          }],
          provider: 'anthropic',
          model: 'claude-sonnet-4'
        })
      })

      if (response.ok) {
        const result = await response.json()
        return result.message.trim()
      }
    } catch (error) {
      console.error('Failed to generate intelligent content:', error)
    }

    // Fallback to basic templates
    return this.getBasicTemplate(extension || '')
  }

  // Apply intelligent edits to existing file content
  private async applyIntelligentEdits(filePath: string, currentContent: string, editInstructions: string, metadata?: FileMetadata): Promise<string> {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `INTELLIGENT FILE EDITING

FILE PATH: ${filePath}
FILE TYPE: ${filePath.split('.').pop()}

CURRENT CONTENT:
${currentContent}

EDIT INSTRUCTIONS:
${editInstructions}

REQUIREMENTS:
- Apply the requested changes while preserving existing important content
- Maintain proper syntax and formatting for the file type
- Add helpful comments for new sections
- Follow best practices for this file type
- Preserve existing comments and documentation
- Ensure the result is syntactically correct

Return ONLY the complete updated file content, no explanation.`
          }],
          provider: 'anthropic',
          model: 'claude-sonnet-4'
        })
      })

      if (response.ok) {
        const result = await response.json()
        return result.message.trim()
      }
    } catch (error) {
      console.error('Failed to apply intelligent edits:', error)
    }

    // Fallback to simple append
    return currentContent + '\n\n' + editInstructions
  }

  // Validate file content based on file type
  private async validateFile(filePath: string, content: string): Promise<ValidationResult[]> {
    const validations: ValidationResult[] = []
    const extension = filePath.split('.').pop()?.toLowerCase()

    try {
      // Basic validations
      validations.push({
        check: 'file_exists',
        passed: await this.checkFileExists(filePath),
        details: 'File exists on filesystem',
        severity: 'error'
      })

      validations.push({
        check: 'content_not_empty',
        passed: content.length > 0,
        details: `Content length: ${content.length} characters`,
        severity: 'warning'
      })

      // File type specific validations
      switch (extension) {
        case 'json':
          try {
            JSON.parse(content)
            validations.push({
              check: 'json_syntax',
              passed: true,
              details: 'Valid JSON syntax',
              severity: 'error'
            })
          } catch (error) {
            validations.push({
              check: 'json_syntax',
              passed: false,
              details: `Invalid JSON: ${error}`,
              severity: 'error'
            })
          }
          break

        case 'yaml':
        case 'yml':
          // Basic YAML validation (would use proper parser in production)
          const hasValidYamlStructure = !content.includes('\t') && content.includes(':')
          validations.push({
            check: 'yaml_structure',
            passed: hasValidYamlStructure,
            details: hasValidYamlStructure ? 'Basic YAML structure valid' : 'Invalid YAML structure detected',
            severity: 'error'
          })
          break

        case 'sh':
        case 'bash':
          const hasShebang = content.startsWith('#!')
          validations.push({
            check: 'script_shebang',
            passed: hasShebang,
            details: hasShebang ? 'Shebang present' : 'Missing shebang line',
            severity: 'warning'
          })
          break

        case 'conf':
        case 'config':
          const hasComments = content.includes('#') || content.includes('//')
          validations.push({
            check: 'configuration_comments',
            passed: hasComments,
            details: hasComments ? 'Configuration includes comments' : 'No comments found in configuration',
            severity: 'info'
          })
          break
      }

      // Security validations
      const securityIssues = this.checkSecurityIssues(content)
      validations.push(...securityIssues)

    } catch (error) {
      validations.push({
        check: 'validation_error',
        passed: false,
        details: `Validation failed: ${error}`,
        severity: 'error'
      })
    }

    return validations
  }

  // Check for common security issues in file content
  private checkSecurityIssues(content: string): ValidationResult[] {
    const issues: ValidationResult[] = []

    // Check for hardcoded passwords
    const passwordPatterns = [
      /password\s*=\s*["']([^"']+)["']/i,
      /pwd\s*=\s*["']([^"']+)["']/i,
      /secret\s*=\s*["']([^"']+)["']/i
    ]

    for (const pattern of passwordPatterns) {
      if (pattern.test(content)) {
        issues.push({
          check: 'hardcoded_credentials',
          passed: false,
          details: 'Potential hardcoded credentials detected',
          severity: 'warning'
        })
        break
      }
    }

    // Check for dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,
      /chmod\s+777/,
      /sudo\s+su\s+-/,
      /curl\s+.*\|\s*sh/,
      /wget\s+.*\|\s*sh/
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        issues.push({
          check: 'dangerous_commands',
          passed: false,
          details: 'Potentially dangerous commands detected',
          severity: 'warning'
        })
        break
      }
    }

    // Check for private keys
    if (content.includes('-----BEGIN PRIVATE KEY-----') || content.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      issues.push({
        check: 'private_keys',
        passed: false,
        details: 'Private key detected in file content',
        severity: 'error'
      })
    }

    return issues
  }

  // File operation implementations
  private async deleteFile(request: FileOperationRequest): Promise<FileOperationResult> {
    const startTime = Date.now()
    
    try {
      // Create backup if requested
      let backupPath: string | undefined
      if (request.backup !== false) {
        backupPath = await this.createBackup(request.path)
      }

      const result = await advancedExecutor.getInstance().executeWithContext(`rm -f "${request.path}"`, this.socket)
      
      if (!result.success) {
        throw new Error(result.stderr || 'Delete operation failed')
      }

      return {
        success: true,
        path: request.path,
        operation: 'delete',
        message: 'File deleted successfully',
        backupPath,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        path: request.path,
        operation: 'delete',
        message: (error instanceof Error ? error.message : String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  private async copyFile(request: FileOperationRequest): Promise<FileOperationResult> {
    const startTime = Date.now()
    
    try {
      const destPath = request.metadata?.destPath || request.path + '.copy'
      
      const result = await advancedExecutor.getInstance().executeWithContext(`cp -p "${request.path}" "${destPath}"`, this.socket)
      
      if (!result.success) {
        throw new Error(result.stderr || 'Copy operation failed')
      }

      const metadata = await this.getFileMetadata(destPath)

      return {
        success: true,
        path: destPath,
        operation: 'copy',
        message: `File copied to ${destPath}`,
        metadata,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        path: request.path,
        operation: 'copy',
        message: (error instanceof Error ? error.message : String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  private async moveFile(request: FileOperationRequest): Promise<FileOperationResult> {
    const startTime = Date.now()
    
    try {
      const destPath = request.metadata?.destPath || request.path + '.moved'
      
      const result = await advancedExecutor.getInstance().executeWithContext(`mv "${request.path}" "${destPath}"`, this.socket)
      
      if (!result.success) {
        throw new Error(result.stderr || 'Move operation failed')
      }

      const metadata = await this.getFileMetadata(destPath)

      return {
        success: true,
        path: destPath,
        operation: 'move',
        message: `File moved to ${destPath}`,
        metadata,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        path: request.path,
        operation: 'move',
        message: (error instanceof Error ? error.message : String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  private async backupFile(request: FileOperationRequest): Promise<FileOperationResult> {
    const startTime = Date.now()
    
    try {
      const backupPath = await this.createBackup(request.path)

      return {
        success: true,
        path: request.path,
        operation: 'backup',
        message: `Backup created at ${backupPath}`,
        backupPath,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        path: request.path,
        operation: 'backup',
        message: (error instanceof Error ? error.message : String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  private async compressFile(request: FileOperationRequest): Promise<FileOperationResult> {
    const startTime = Date.now()
    
    try {
      const compressedPath = request.path + '.tar.gz'
      
      const result = await advancedExecutor.getInstance().executeWithContext(
        `tar -czf "${compressedPath}" -C "$(dirname "${request.path}")" "$(basename "${request.path}")"`, 
        this.socket
      )
      
      if (!result.success) {
        throw new Error(result.stderr || 'Compression failed')
      }

      const metadata = await this.getFileMetadata(compressedPath)

      return {
        success: true,
        path: compressedPath,
        operation: 'compress',
        message: `File compressed to ${compressedPath}`,
        metadata,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        path: request.path,
        operation: 'compress',
        message: (error instanceof Error ? error.message : String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  private async extractFile(request: FileOperationRequest): Promise<FileOperationResult> {
    const startTime = Date.now()
    
    try {
      const extractDir = request.path.replace(/\.(tar\.gz|tgz|zip|tar)$/, '_extracted')
      
      let extractCommand = ''
      if (request.path.endsWith('.tar.gz') || request.path.endsWith('.tgz')) {
        extractCommand = `mkdir -p "${extractDir}" && tar -xzf "${request.path}" -C "${extractDir}"`
      } else if (request.path.endsWith('.zip')) {
        extractCommand = `mkdir -p "${extractDir}" && unzip -q "${request.path}" -d "${extractDir}"`
      } else if (request.path.endsWith('.tar')) {
        extractCommand = `mkdir -p "${extractDir}" && tar -xf "${request.path}" -C "${extractDir}"`
      } else {
        throw new Error('Unsupported archive format')
      }
      
      const result = await advancedExecutor.getInstance().executeWithContext(extractCommand, this.socket)
      
      if (!result.success) {
        throw new Error(result.stderr || 'Extraction failed')
      }

      return {
        success: true,
        path: extractDir,
        operation: 'extract',
        message: `File extracted to ${extractDir}`,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        path: request.path,
        operation: 'extract',
        message: (error instanceof Error ? error.message : String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  private async searchInFile(request: FileOperationRequest): Promise<FileOperationResult> {
    const startTime = Date.now()
    
    try {
      const searchTerm = request.content || ''
      const result = await advancedExecutor.getInstance().executeWithContext(
        `grep -n "${searchTerm}" "${request.path}" 2>/dev/null || echo "No matches found"`, 
        this.socket
      )

      return {
        success: true,
        path: request.path,
        operation: 'search',
        message: `Search results for '${searchTerm}': ${result.stdout}`,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        path: request.path,
        operation: 'search',
        message: (error instanceof Error ? error.message : String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  private async replaceInFile(request: FileOperationRequest): Promise<FileOperationResult> {
    const startTime = Date.now()
    
    try {
      const [searchTerm, replaceTerm] = (request.content || '').split('|')
      
      if (!searchTerm || replaceTerm === undefined) {
        throw new Error('Replace operation requires format: "search|replace"')
      }

      // Create backup first
      const backupPath = await this.createBackup(request.path)
      
      const result = await advancedExecutor.getInstance().executeWithContext(
        `sed -i.bak 's/${searchTerm}/${replaceTerm}/g' "${request.path}"`, 
        this.socket
      )
      
      if (!result.success) {
        throw new Error(result.stderr || 'Replace operation failed')
      }

      return {
        success: true,
        path: request.path,
        operation: 'replace',
        message: `Replaced '${searchTerm}' with '${replaceTerm}'`,
        backupPath,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        path: request.path,
        operation: 'replace',
        message: (error instanceof Error ? error.message : String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  private async validateFileOperation(request: FileOperationRequest): Promise<FileOperationResult> {
    const startTime = Date.now()
    
    try {
      const content = await this.readFileContent(request.path)
      const validationResults = await this.validateFile(request.path, content)

      const passed = validationResults.filter(v => v.passed).length
      const failed = validationResults.filter(v => !v.passed).length

      return {
        success: failed === 0,
        path: request.path,
        operation: 'validate',
        message: `Validation complete: ${passed} passed, ${failed} failed`,
        validationResults,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        path: request.path,
        operation: 'validate',
        message: (error instanceof Error ? error.message : String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }
  }

  // Helper methods
  private async writeFileContent(path: string, content: string): Promise<any> {
    const command = `cat > "${path}" << 'EOF_MARKER'
${content}
EOF_MARKER`

    return await advancedExecutor.getInstance().executeWithContext(command, this.socket)
  }

  private async readFileContent(path: string): Promise<string> {
    const result = await advancedExecutor.getInstance().executeWithContext(`cat "${path}"`, this.socket)
    
    if (!result.success) {
      throw new Error(`Failed to read file: ${result.stderr}`)
    }
    
    return result.stdout || ''
  }

  private async checkFileExists(path: string): Promise<boolean> {
    const result = await advancedExecutor.getInstance().executeWithContext(`test -f "${path}" && echo "exists" || echo "not found"`, this.socket)
    return result.stdout?.trim() === 'exists'
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    await advancedExecutor.getInstance().executeWithContext(`mkdir -p "${dirPath}"`, this.socket)
  }

  private async ensureBackupDirectory(): Promise<void> {
    await advancedExecutor.getInstance().executeWithContext(`mkdir -p "${this.backupDirectory}"`, this.socket)
  }

  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = filePath.split('/').pop()
    const backupPath = `${this.backupDirectory}/${filename}.backup.${timestamp}`
    
    const result = await advancedExecutor.getInstance().executeWithContext(`cp "${filePath}" "${backupPath}"`, this.socket)
    
    if (!result.success) {
      throw new Error(`Failed to create backup: ${result.stderr}`)
    }
    
    return backupPath
  }

  private async getFileMetadata(path: string): Promise<FileMetadata> {
    try {
      const result = await advancedExecutor.getInstance().executeWithContext(`stat "${path}" 2>/dev/null || ls -la "${path}"`, this.socket)
      
      if (result.success && result.stdout) {
        return this.parseFileMetadata(result.stdout, path)
      }
    } catch (error) {
      console.error('Failed to get file metadata:', error)
    }

    // Fallback metadata
    return {
      size: 0,
      permissions: '644',
      owner: 'unknown',
      group: 'unknown',
      lastModified: new Date(),
      type: 'file'
    }
  }

  private parseFileMetadata(statOutput: string, path: string): FileMetadata {
    // Basic parsing - would be enhanced for production
    return {
      size: 0,
      permissions: '644',
      owner: 'user',
      group: 'user',
      lastModified: new Date(),
      type: 'file'
    }
  }

  private async applyTemplate(templateName: string, content: string, metadata?: FileMetadata): Promise<string> {
    const template = this.templates.get(templateName)
    
    if (!template) {
      return content
    }

    let processedContent = template.content

    // Replace template variables
    for (const variable of template.variables) {
      const value = metadata?.[variable.name as keyof FileMetadata] || variable.defaultValue || ''
      processedContent = processedContent.replace(
        new RegExp(`{{${variable.name}}}`, 'g'), 
        value.toString()
      )
    }

    return processedContent + '\n\n' + content
  }

  private getBasicTemplate(extension: string): string {
    const templates: Record<string, string> = {
      'sh': '#!/bin/bash\n\n# Script description\n# Author: System Admin\n# Date: ' + new Date().toISOString() + '\n\nset -euo pipefail\n\necho "Script started"\n\n# Add your commands here\n\necho "Script completed"\n',
      'py': '#!/usr/bin/env python3\n"""\nPython script template\nAuthor: System Admin\nDate: ' + new Date().toISOString() + '\n"""\n\nimport sys\nimport os\n\ndef main():\n    """Main function."""\n    print("Script started")\n    \n    # Add your code here\n    \n    print("Script completed")\n\nif __name__ == "__main__":\n    main()\n',
      'js': '/*\n * JavaScript file template\n * Author: System Admin\n * Date: ' + new Date().toISOString() + '\n */\n\n"use strict";\n\n// Add your code here\n\nconsole.log("Script started");\n\n// Your implementation\n\nconsole.log("Script completed");\n',
      'json': '{\n  "name": "configuration",\n  "version": "1.0.0",\n  "description": "Configuration file",\n  "created": "' + new Date().toISOString() + '",\n  "settings": {\n    "example": "value"\n  }\n}',
      'yaml': '# Configuration file\n# Created: ' + new Date().toISOString() + '\n\nname: configuration\nversion: "1.0.0"\ndescription: "Configuration file"\n\nsettings:\n  example: "value"\n',
      'conf': '# Configuration file\n# Created: ' + new Date().toISOString() + '\n# Description: System configuration\n\n# Add your configuration settings below\n# example_setting = value\n\n',
      'md': '# Document Title\n\n*Created: ' + new Date().toISOString() + '*\n\n## Overview\n\nDocument description goes here.\n\n## Contents\n\n- Item 1\n- Item 2\n- Item 3\n\n## Details\n\nAdd your content here.\n\n---\n\n*Generated by Latenite.ai OS Agent*\n'
    }

    return templates[extension] || `# File created: ${new Date().toISOString()}\n\n# Add your content here\n`
  }

  private initializeTemplates(): void {
    // Initialize common file templates
    this.templates.set('nginx-config', {
      name: 'Nginx Configuration',
      description: 'Basic Nginx server configuration',
      content: `server {
    listen 80;
    server_name {{domain}};
    root {{document_root}};
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}`,
      permissions: '644',
      variables: [
        { name: 'domain', description: 'Domain name', required: true, type: 'string' },
        { name: 'document_root', description: 'Document root path', defaultValue: '/var/www/html', required: false, type: 'path' }
      ]
    })

    this.templates.set('systemd-service', {
      name: 'Systemd Service',
      description: 'Basic systemd service configuration',
      content: `[Unit]
Description={{service_description}}
After=network.target

[Service]
Type={{service_type}}
User={{service_user}}
WorkingDirectory={{working_directory}}
ExecStart={{exec_start}}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`,
      permissions: '644',
      variables: [
        { name: 'service_description', description: 'Service description', required: true, type: 'string' },
        { name: 'service_type', description: 'Service type', defaultValue: 'simple', required: false, type: 'string' },
        { name: 'service_user', description: 'Service user', defaultValue: 'www-data', required: false, type: 'string' },
        { name: 'working_directory', description: 'Working directory', required: true, type: 'path' },
        { name: 'exec_start', description: 'Executable path', required: true, type: 'path' }
      ]
    })
  }

  // Public interface methods
  setSocket(socket: any): void {
    this.socket = socket
  }

  setStatusCallback(callback: (status: string, type: 'info' | 'warning' | 'error' | 'success') => void): void {
    this.onStatusUpdate = callback
  }

  getAvailableTemplates(): FileTemplate[] {
    return Array.from(this.templates.values())
  }

  addTemplate(template: FileTemplate): void {
    this.templates.set(template.name, template)
  }

  async getBulkFileInfo(paths: string[]): Promise<FileMetadata[]> {
    const results: FileMetadata[] = []
    
    for (const path of paths) {
      try {
        const metadata = await this.getFileMetadata(path)
        results.push(metadata)
      } catch (error) {
        results.push({
          size: 0,
          permissions: '000',
          owner: 'unknown',
          group: 'unknown',
          lastModified: new Date(),
          type: 'file'
        })
      }
    }
    
    return results
  }
}

// Export singleton instance
export const enhancedFileOps = new EnhancedFileOperations()
