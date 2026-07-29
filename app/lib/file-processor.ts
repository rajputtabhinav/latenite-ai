'use client'

import mammoth from 'mammoth'
// SECURITY: xlsx package has known vulnerabilities - using sandboxed API instead
// import * as XLSX from 'xlsx'
import type { ProcessedFile, FileMetadata } from '../types'

export type { ProcessedFile }

export class FileProcessor {
  private static instance: FileProcessor

  static getInstance(): FileProcessor {
    if (!this.instance) {
      this.instance = new FileProcessor()
    }
    return this.instance
  }

  /**
   * Process uploaded file and extract content
   */
  async processFile(file: File): Promise<ProcessedFile> {
    console.log(`📎 Processing file: ${file.name} (${file.type})`)

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error(`File too large: ${file.name} (max 10MB)`)
    }

    // Convert to base64
    const base64 = await this.fileToBase64(file)

    const processed: ProcessedFile = {
      id: `file-${Date.now()}-${Math.random()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      data: base64,
      timestamp: new Date()
    }

    // Extract content based on file type
    try {
      if (file.type.startsWith('image/')) {
        processed.preview = `data:${file.type};base64,${base64}`
        processed.extractedText = `[Image: ${file.name}]`
      } else if (file.type.includes('pdf')) {
        // PDF parsing will be handled server-side for better compatibility
        processed.extractedText = await this.extractPDFText(file)
      } else if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        processed.extractedText = await this.extractExcelData(file)
      } else if (file.type.includes('document') || file.name.endsWith('.docx')) {
        processed.extractedText = await this.extractWordText(file)
      } else if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.log') || file.name.endsWith('.csv')) {
        processed.extractedText = await this.extractTextContent(file)
      }
    } catch (error) {
      console.warn(`⚠️ Could not extract content from ${file.name}:`, error)
      processed.extractedText = `[Could not extract text from ${file.name}]`
    }

    return processed
  }

  /**
   * Convert file to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix (data:image/png;base64,)
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * Extract text from Word document
   */
  private async extractWordText(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      return result.value || '[Empty document]'
    } catch (error) {
      console.error('DOCX extraction failed:', error)
      return '[Could not read DOCX file]'
    }
  }

  /**
   * Extract data from Excel file using sandboxed API
   * SECURITY: Uses isolated serverless function to contain xlsx vulnerability
   */
  private async extractExcelData(file: File): Promise<string> {
    try {
      // Convert file to base64 for API transmission
      const base64 = await this.fileToBase64(file)
      const fileData = `data:${file.type};base64,${base64}`

      // Call sandboxed XLSX processing API
      const response = await fetch('/api/xlsx/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData,
          fileName: file.name,
          options: {
            maxRows: 1000, // Limit rows for preview
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process Excel file')
      }

      const result = await response.json()

      // Convert sheets data to text format
      let text = ''
      result.sheets.forEach((sheet: any) => {
        text += `\n\n--- Sheet: ${sheet.name} (${sheet.rowCount} rows) ---\n`
        
        // Convert JSON data to CSV-like format
        if (sheet.data && sheet.data.length > 0) {
          const headers = Object.keys(sheet.data[0])
          text += headers.join(', ') + '\n'
          
          sheet.data.forEach((row: any) => {
            const values = headers.map((h) => row[h] || '')
            text += values.join(', ') + '\n'
          })
        }
      })

      return text || '[Empty spreadsheet]'
    } catch (error) {
      console.error('Excel extraction failed:', error)
      return `[Could not read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}]`
    }
  }

  /**
   * Extract text from PDF (client-side attempt, fallback to server)
   */
  private async extractPDFText(file: File): Promise<string> {
    // For now, just indicate it's a PDF
    // Server-side extraction is more reliable
    return `[PDF Document: ${file.name} - ${this.formatFileSize(file.size)}. Content will be analyzed by AI.]`
  }

  /**
   * Extract text from plain text files
   */
  private async extractTextContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /**
   * Get file icon based on type
   */
  getFileIcon(type: string): string {
    if (type.startsWith('image/')) return '🖼️'
    if (type.includes('pdf')) return '📄'
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊'
    if (type.includes('word') || type.includes('document')) return '📝'
    if (type.includes('text')) return '📃'
    if (type.includes('csv')) return '📈'
    return '📁'
  }

  /**
   * Validate file type
   */
  isSupportedFile(file: File): boolean {
    const supportedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/json'
    ]

    return supportedTypes.includes(file.type) || 
           file.name.endsWith('.txt') || 
           file.name.endsWith('.log') ||
           file.name.endsWith('.csv') ||
           file.name.endsWith('.json')
  }
}

export const fileProcessor = FileProcessor.getInstance()

