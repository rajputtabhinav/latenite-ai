'use client'

import jsPDF from 'jspdf'
import type { TerminalSession, CommandRecord, SystemInfo, SessionMetrics } from '../types'

export type { TerminalSession, CommandRecord, SystemInfo, SessionMetrics }

export interface DocumentOptions {
  format: 'pdf' | 'docx' | 'markdown'
  includeCharts: boolean
  includeSystemInfo: boolean
  includeTimestamps: boolean
  theme: 'professional' | 'technical' | 'minimal'
}

export class TerminalDocumentGenerator {
  private static instance: TerminalDocumentGenerator

  static getInstance(): TerminalDocumentGenerator {
    if (!this.instance) {
      this.instance = new TerminalDocumentGenerator()
    }
    return this.instance
  }

  /**
   * Generate AI-analyzed documentation from terminal session
   */
  async generateDocument(
    session: TerminalSession,
    options: DocumentOptions = {
      format: 'pdf',
      includeCharts: true,
      includeSystemInfo: true,
      includeTimestamps: true,
      theme: 'professional'
    }
  ): Promise<Blob> {
    console.log('📄 Generating document for session:', session.sessionId)

    // Step 1: AI Analysis of terminal session
    const analysis = await this.analyzeSessionWithAI(session)

    // Step 2: Generate structured content
    const content = this.generateStructuredContent(session, analysis, options)

    // Step 3: Create document based on format
    switch (options.format) {
      case 'pdf':
        return await this.generatePDF(content, session, analysis, options)
      case 'docx':
        return this.generateMarkdown(content, session, analysis, options) // Fallback to markdown for now
      case 'markdown':
        return this.generateMarkdown(content, session, analysis, options)
      default:
        throw new Error(`Unsupported format: ${options.format}`)
    }
  }

  /**
   * AI Analysis of terminal session
   */
  private async analyzeSessionWithAI(session: TerminalSession): Promise<any> {
    try {
      const response = await fetch('/api/ai/analyze-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: session.commands.map(cmd => ({
            command: cmd.command,
            output: cmd.output.slice(0, 500), // Limit for AI
            success: cmd.exitCode === 0,
            duration: cmd.duration
          })),
          systemInfo: session.systemInfo,
          metrics: session.metrics
        })
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      return await response.json()
    } catch (error) {
      console.error('❌ AI analysis failed:', error)
      // Return default analysis if AI fails
      return {
        summary: this.generateExecutiveSummary(session),
        keyPoints: this.extractKeyPoints(session),
        findings: ['Session completed successfully'],
        recommendations: ['Review command outputs for any warnings or errors']
      }
    }
  }

  /**
   * Generate structured content (public for preview)
   */
  generateStructuredContent(
    session: TerminalSession,
    analysis: any,
    options: DocumentOptions
  ): any {
    return {
      title: `Terminal Session Report - ${session.host}`,
      subtitle: `Session ID: ${session.sessionId}`,
      executiveSummary: analysis.summary || this.generateExecutiveSummary(session),
      sections: [
        {
          title: '📊 Executive Summary',
          content: analysis.summary || this.generateExecutiveSummary(session),
          bullets: analysis.keyPoints || this.extractKeyPoints(session)
        },
        {
          title: '🖥️ System Information',
          content: this.formatSystemInfo(session.systemInfo),
          visible: options.includeSystemInfo
        },
        {
          title: '⚡ Session Metrics',
          content: this.formatMetrics(session.metrics),
          charts: options.includeCharts ? this.generateChartData(session) : null
        },
        {
          title: '📝 Commands Executed',
          content: this.formatCommandHistory(session.commands, options.includeTimestamps),
          bullets: null
        },
        {
          title: '🎯 Key Findings',
          content: '',
          bullets: analysis.findings || []
        },
        {
          title: '💡 Recommendations',
          content: '',
          bullets: analysis.recommendations || []
        }
      ]
    }
  }

  /**
   * Generate PDF document with professional formatting
   */
  private async generatePDF(
    content: any,
    session: TerminalSession,
    analysis: any,
    options: DocumentOptions
  ): Promise<Blob> {
    const doc = new jsPDF()
    let yPosition = 20

    // Title Page
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 107, 53) // Orange
    doc.text(content.title, 105, yPosition, { align: 'center' })
    yPosition += 15

    // Subtitle
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(128, 128, 128)
    doc.text(content.subtitle, 105, yPosition, { align: 'center' })
    yPosition += 10

    // Date range
    doc.setFontSize(9)
    const dateStr = `${session.startTime.toLocaleString()} - ${session.endTime.toLocaleString()}`
    doc.text(dateStr, 105, yPosition, { align: 'center' })
    yPosition += 20

    // Divider
    doc.setDrawColor(255, 107, 53)
    doc.setLineWidth(0.5)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 15

    // Sections
    for (const section of content.sections) {
      if (section.visible === false) continue

      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      // Section title
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 107, 53)
      doc.text(section.title, 20, yPosition)
      yPosition += 8

      // Section content
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)

      if (section.bullets && section.bullets.length > 0) {
        section.bullets.forEach((bullet: string) => {
          const lines = doc.splitTextToSize(`• ${bullet}`, 170)
          lines.forEach((line: string) => {
            if (yPosition > 270) {
              doc.addPage()
              yPosition = 20
            }
            doc.text(line, 25, yPosition)
            yPosition += 6
          })
        })
        yPosition += 5
      } else if (section.content) {
        const lines = doc.splitTextToSize(section.content, 170)
        lines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, 20, yPosition)
          yPosition += 6
        })
        yPosition += 5
      }

      yPosition += 5
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(128, 128, 128)
      doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' })
      doc.text('Generated by Latenite AI', 105, 290, { align: 'center' })
    }

    return doc.output('blob')
  }

  /**
   * Generate Markdown document
   */
  private generateMarkdown(
    content: any,
    session: TerminalSession,
    analysis: any,
    options: DocumentOptions
  ): Blob {
    let markdown = `# ${content.title}\n\n`
    markdown += `**${content.subtitle}**\n\n`
    markdown += `📅 **Session Duration:** ${session.startTime.toLocaleString()} - ${session.endTime.toLocaleString()}\n\n`
    markdown += `---\n\n`

    content.sections.forEach((section: any) => {
      if (section.visible === false) return

      markdown += `## ${section.title}\n\n`

      if (section.bullets && section.bullets.length > 0) {
        section.bullets.forEach((bullet: string) => {
          markdown += `- ${bullet}\n`
        })
        markdown += `\n`
      } else if (section.content) {
        markdown += `${section.content}\n\n`
      }
    })

    markdown += `\n---\n\n`
    markdown += `*Generated by Latenite AI Terminal - ${new Date().toLocaleString()}*\n`

    return new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  }

  private generateExecutiveSummary(session: TerminalSession): string {
    const duration = session.endTime.getTime() - session.startTime.getTime()
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    const successRate = session.metrics.totalCommands > 0
      ? (session.metrics.successfulCommands / session.metrics.totalCommands * 100).toFixed(1)
      : '0'

    return `This ${minutes > 0 ? `${minutes}-minute` : `${seconds}-second`} terminal session on ${session.host} executed ${session.metrics.totalCommands} commands with a ${successRate}% success rate. The session focused on ${this.detectSessionPurpose(session)}.`
  }

  private detectSessionPurpose(session: TerminalSession): string {
    const commands = session.commands.map(c => c.command.toLowerCase())
    
    if (commands.some(c => c.includes('stress') || c.includes('benchmark') || c.includes('sysbench'))) {
      return 'system performance testing and benchmarking'
    }
    if (commands.some(c => c.includes('docker') || c.includes('kubectl') || c.includes('k8s'))) {
      return 'container orchestration and deployment'
    }
    if (commands.some(c => c.includes('npm') || c.includes('yarn') || c.includes('git') || c.includes('node'))) {
      return 'software development and version control'
    }
    if (commands.some(c => c.includes('top') || c.includes('htop') || c.includes('ps') || c.includes('vmstat'))) {
      return 'system monitoring and diagnostics'
    }
    if (commands.some(c => c.includes('apt') || c.includes('yum') || c.includes('dnf') || c.includes('pacman'))) {
      return 'package management and system updates'
    }
    
    return 'general system administration'
  }

  private extractKeyPoints(session: TerminalSession): string[] {
    const points: string[] = []
    
    // Add key metrics
    points.push(`Total commands executed: ${session.metrics.totalCommands}`)
    
    if (session.metrics.totalCommands > 0) {
      const successRate = (session.metrics.successfulCommands / session.metrics.totalCommands * 100).toFixed(1)
      points.push(`Success rate: ${successRate}% (${session.metrics.successfulCommands} successful, ${session.metrics.failedCommands} failed)`)
    }
    
    if (session.metrics.averageExecutionTime > 0) {
      points.push(`Average command execution time: ${session.metrics.averageExecutionTime.toFixed(0)}ms`)
    }
    
    // Add system-specific points
    if (session.metrics.cpuUsage && session.metrics.cpuUsage.length > 0) {
      const maxCPU = Math.max(...session.metrics.cpuUsage)
      const avgCPU = session.metrics.cpuUsage.reduce((a, b) => a + b, 0) / session.metrics.cpuUsage.length
      points.push(`CPU Usage: Average ${avgCPU.toFixed(1)}%, Peak ${maxCPU.toFixed(1)}%`)
    }
    
    if (session.metrics.memoryUsage && session.metrics.memoryUsage.length > 0) {
      const maxMem = Math.max(...session.metrics.memoryUsage)
      const avgMem = session.metrics.memoryUsage.reduce((a, b) => a + b, 0) / session.metrics.memoryUsage.length
      points.push(`Memory Usage: Average ${avgMem.toFixed(1)}%, Peak ${maxMem.toFixed(1)}%`)
    }
    
    // Session duration
    const duration = session.endTime.getTime() - session.startTime.getTime()
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    points.push(`Session duration: ${minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}`)
    
    return points
  }

  private formatSystemInfo(systemInfo: SystemInfo): string {
    const entries = Object.entries(systemInfo).filter(([_, value]) => value)
    if (entries.length === 0) {
      return 'System information not available'
    }
    
    return entries
      .map(([key, value]) => `**${key.charAt(0).toUpperCase() + key.slice(1)}:** ${value}`)
      .join('\n')
  }

  private formatMetrics(metrics: SessionMetrics): string {
    const successRate = metrics.totalCommands > 0
      ? (metrics.successfulCommands / metrics.totalCommands * 100).toFixed(1)
      : '0'
    
    return `
**Total Commands:** ${metrics.totalCommands}
**Successful:** ${metrics.successfulCommands} (${successRate}%)
**Failed:** ${metrics.failedCommands}
**Average Execution Time:** ${metrics.averageExecutionTime.toFixed(0)}ms
    `.trim()
  }

  private formatCommandHistory(commands: CommandRecord[], includeTimestamps: boolean): string {
    if (commands.length === 0) {
      return 'No commands executed'
    }
    
    return commands.map((cmd, i) => {
      const timestamp = includeTimestamps ? `[${cmd.timestamp.toLocaleTimeString()}] ` : ''
      const status = cmd.exitCode === 0 ? '✅' : '❌'
      return `${i + 1}. ${timestamp}${status} \`${cmd.command}\` (${cmd.duration}ms)`
    }).join('\n')
  }

  private generateChartData(session: TerminalSession): any {
    return {
      cpuChart: session.metrics.cpuUsage,
      memoryChart: session.metrics.memoryUsage,
      commandTimeline: session.commands.map(cmd => ({
        time: cmd.timestamp,
        duration: cmd.duration,
        success: cmd.exitCode === 0
      }))
    }
  }
}

export const documentGenerator = TerminalDocumentGenerator.getInstance()

