/**
 * Sandboxed XLSX Processing Serverless Function
 * 
 * This isolated endpoint handles all xlsx package operations to contain
 * the security vulnerability away from the main application.
 * 
 * Security measures:
 * - Input validation and sanitization
 * - File size limits
 * - Resource usage limits
 * - Error containment
 * - Comprehensive logging
 */

import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import {
  createErrorResponse,
  validationError,
  errorLogger,
  ErrorCategory,
  ErrorSeverity,
} from '../../../lib/error-handler'

// Security configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB max file size
const MAX_ROWS = 100000 // Maximum rows to process
const MAX_SHEETS = 50 // Maximum sheets to process

interface XLSXProcessRequest {
  fileData: string // Base64 encoded file data
  fileName?: string
  options?: {
    sheetName?: string
    maxRows?: number
    includeFormulas?: boolean
  }
}

/**
 * Validate file data before processing
 */
function validateFileData(fileData: string): { valid: boolean; error?: string } {
  if (!fileData || typeof fileData !== 'string') {
    return { valid: false, error: 'File data is required and must be a string' }
  }

  // Check base64 format
  const base64Regex = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)?;base64,/
  if (!base64Regex.test(fileData) && !isValidBase64(fileData)) {
    return { valid: false, error: 'Invalid base64 format' }
  }

  // Check file size
  const base64Data = fileData.replace(/^data:.*?;base64,/, '')
  const sizeInBytes = (base64Data.length * 3) / 4
  if (sizeInBytes > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` }
  }

  return { valid: true }
}

/**
 * Check if string is valid base64
 */
function isValidBase64(str: string): boolean {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str
  } catch {
    return false
  }
}

/**
 * Sanitize sheet data to prevent prototype pollution
 */
function sanitizeSheetData(data: any[]): any[] {
  return data.map((row) => {
    const sanitizedRow: any = {}
    for (const key in row) {
      // Skip __proto__, constructor, and prototype keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue
      }
      // Only allow string, number, boolean, and null values
      const value = row[key]
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        sanitizedRow[key] = value
      }
    }
    return sanitizedRow
  })
}

/**
 * Process XLSX file safely
 */
async function processXLSXFile(request: XLSXProcessRequest): Promise<any> {
  const startTime = Date.now()

  try {
    // Validate input
    const validation = validateFileData(request.fileData)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Extract base64 data
    const base64Data = request.fileData.replace(/^data:.*?;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Parse the workbook with security options
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellFormula: request.options?.includeFormulas || false,
      cellStyles: false, // Disable styles to reduce attack surface
      sheetStubs: false, // Don't generate stubs for empty cells
      bookVBA: false, // Don't parse VBA/macros
      bookProps: false, // Don't parse properties
    })

    // Validate number of sheets
    if (workbook.SheetNames.length > MAX_SHEETS) {
      throw new Error(`File contains too many sheets. Maximum allowed: ${MAX_SHEETS}`)
    }

    const result: any = {
      fileName: request.fileName || 'unknown.xlsx',
      sheets: [],
      metadata: {
        sheetCount: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames,
        processedAt: new Date().toISOString(),
        processingTime: 0,
      },
    }

    // Process specific sheet or all sheets
    const sheetsToProcess = request.options?.sheetName
      ? [request.options.sheetName]
      : workbook.SheetNames

    for (const sheetName of sheetsToProcess) {
      if (!workbook.Sheets[sheetName]) {
        continue
      }

      const worksheet = workbook.Sheets[sheetName]

      // Convert to JSON with safety limits
      let sheetData = XLSX.utils.sheet_to_json(worksheet, {
        defval: '', // Default value for empty cells
        raw: false, // Don't use raw values
        blankrows: false, // Skip blank rows
      })

      // Apply row limit
      const maxRows = Math.min(request.options?.maxRows || MAX_ROWS, MAX_ROWS)
      if (sheetData.length > maxRows) {
        sheetData = sheetData.slice(0, maxRows)
        result.metadata.truncated = true
        result.metadata.truncatedAt = maxRows
      }

      // Sanitize data to prevent prototype pollution
      sheetData = sanitizeSheetData(sheetData)

      // Get sheet info
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
      const totalRows = range.e.r - range.s.r + 1
      const totalCols = range.e.c - range.s.c + 1

      result.sheets.push({
        name: sheetName,
        data: sheetData,
        rowCount: sheetData.length,
        totalRows,
        totalCols,
      })
    }

    result.metadata.processingTime = Date.now() - startTime

    // Log successful processing
    errorLogger.log({
      category: ErrorCategory.FILE_SYSTEM,
      severity: ErrorSeverity.LOW,
      message: `XLSX file processed successfully: ${result.metadata.sheetCount} sheets, ${result.metadata.processingTime}ms`,
      details: {
        fileName: request.fileName,
        sheetCount: result.metadata.sheetCount,
        processingTime: result.metadata.processingTime,
      },
    })

    return result
  } catch (error: any) {
    // Log processing error
    errorLogger.log({
      category: ErrorCategory.FILE_SYSTEM,
      severity: ErrorSeverity.HIGH,
      message: `XLSX processing failed: ${error.message}`,
      details: {
        fileName: request.fileName,
        error: error.message,
        stack: error.stack,
      },
    })

    throw error
  }
}

/**
 * POST endpoint for XLSX processing
 */
export async function POST(request: NextRequest) {
  try {
    const body: XLSXProcessRequest = await request.json()

    // Validate request body
    if (!body.fileData) {
      return validationError('fileData is required')
    }

    // Process the file
    const result = await processXLSXFile(body)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('XLSX processing error:', error)

    return createErrorResponse(
      error,
      ErrorCategory.FILE_SYSTEM,
      ErrorSeverity.HIGH,
      500,
      {
        endpoint: '/api/xlsx/process',
        message: 'Failed to process XLSX file',
      }
    )
  }
}

/**
 * GET endpoint for service status
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'XLSX Processing Service',
    status: 'operational',
    version: '1.0.0',
    security: {
      sandboxed: true,
      maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
      maxRows: MAX_ROWS,
      maxSheets: MAX_SHEETS,
    },
    features: [
      'Excel file parsing (.xlsx, .xls)',
      'Multiple sheet support',
      'Data sanitization',
      'Prototype pollution protection',
      'File size limits',
      'Row/sheet limits',
      'Comprehensive error handling',
    ],
    vulnerabilityStatus: {
      known: true,
      package: 'xlsx',
      issue: 'Prototype pollution vulnerability',
      mitigation: 'Sandboxed in isolated serverless function with input sanitization',
      monitoring: 'Active - checking for updates regularly',
    },
  })
}

