import { jsPDF } from 'jspdf'

export class ProfessionalReportGenerator {
  private doc: jsPDF
  private y: number = 20
  private readonly colors = {
    tyrone: [227, 6, 19],       // Tyrone Red (main brand color)
    success: [16, 185, 129],     // Green
    info: [59, 130, 246],        // Blue
    warning: [245, 158, 11],     // Yellow
    error: [239, 68, 68],        // Red
    purple: [168, 85, 247],      // Purple
    dark: [30, 30, 30],
    light: [249, 250, 251],
    white: [255, 255, 255]
  }

  constructor() {
    this.doc = new jsPDF()
  }

  generate(data: any, session: any): Blob {
    this.createCover(data, session)
    this.createHighlights(data.highlights)
    this.createWorkflow(data.workflow)
    this.createMetrics(data.metrics)
    this.createInsights(data.insights)
    this.createRecommendations(data.recommendations)
    this.createTechStack(data.techStack)
    this.addFooters()
    return this.doc.output('blob')
  }

  private createCover(data: any, session: any) {
    // **TYRONE BRANDED HEADER** - Red background
    this.doc.setFillColor(...this.colors.tyrone)
    this.doc.rect(0, 0, 210, 65, 'F')
    
    // **TYRONE LOGO** - Bold sans-serif style
    this.doc.setFontSize(42)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('Tyrone', 105, 28, { align: 'center' })
    
    // Subtitle
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('Professional Session Report', 105, 40, { align: 'center' })
    
    // Thin white line separator
    this.doc.setDrawColor(255, 255, 255)
    this.doc.setLineWidth(0.5)
    this.doc.line(40, 48, 170, 48)

    // Session info card - light background
    this.y = 80
    this.doc.setFillColor(249, 250, 251)
    this.doc.roundedRect(20, this.y, 170, 40, 3, 3, 'F')
    
    // Red accent bar on left
    this.doc.setFillColor(...this.colors.tyrone)
    this.doc.roundedRect(20, this.y, 4, 40, 3, 3, 'F')
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(30, 30, 30)
    this.doc.text(data.title, 28, this.y + 8)
    
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 100, 100)
    
    const duration = Math.floor((session.endTime - session.startTime) / 60000)
    this.doc.text(`🖥️  ${session.host}`, 28, this.y + 18)
    this.doc.text(`⏱️  ${duration} minutes`, 28, this.y + 24)
    this.doc.text(`⚡ ${session.commands.length} commands`, 28, this.y + 30)
    this.doc.text(`📅 ${new Date().toLocaleDateString()}`, 120, this.y + 18)

    // Success badge - Tyrone red
    const rate = ((session.metrics.successfulCommands / session.metrics.totalCommands) * 100).toFixed(0)
    this.doc.setFillColor(...this.colors.tyrone)
    this.doc.roundedRect(155, this.y + 5, 28, 12, 2, 2, 'F')
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text(`${rate}%`, 169, this.y + 12, { align: 'center' })
    
    this.doc.setFontSize(7)
    this.doc.setTextColor(100, 100, 100)
    this.doc.text('Success', 169, this.y + 20, { align: 'center' })

    this.y = 130
  }

  private createHighlights(highlights: string[]) {
    this.addHeader('🎯 Key Highlights', this.colors.tyrone)
    
    highlights.forEach((h, i) => {
      // Use Tyrone red for primary highlight
      const colors = [this.colors.tyrone, this.colors.success, this.colors.info]
      this.doc.setFillColor(...colors[i % 3])
      this.doc.circle(23, this.y - 2, 2, 'F')
      
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(30, 30, 30)
      this.doc.text(h, 28, this.y)
      this.y += 8
    })
    this.y += 8
  }

  private createWorkflow(workflow: any[]) {
    this.addHeader('🔄 Workflow', this.colors.tyrone)
    
    workflow.forEach((phase, i) => {
      this.doc.setFillColor(248, 250, 252)
      this.doc.roundedRect(20, this.y, 170, 25, 2, 2, 'F')
      
      // Use Tyrone red for first phase
      const colors = [this.colors.tyrone, this.colors.success, this.colors.info]
      this.doc.setFillColor(...colors[i % 3])
      this.doc.circle(26, this.y + 6, 4, 'F')
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(255, 255, 255)
      this.doc.text(`${i + 1}`, 26, this.y + 7.5, { align: 'center' })
      
      this.doc.setFontSize(10)
      this.doc.setTextColor(30, 30, 30)
      this.doc.text(`${phase.icon} ${phase.step}`, 33, this.y + 7)
      
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(80, 80, 80)
      phase.actions.slice(0, 2).forEach((a: string, j: number) => {
        this.doc.text(`• ${a}`, 33, this.y + 14 + (j * 5))
      })
      
      // Tyrone red for completion badge
      this.doc.setFillColor(...this.colors.tyrone)
      this.doc.roundedRect(140, this.y + 16, 45, 7, 1.5, 1.5, 'F')
      this.doc.setFontSize(7)
      this.doc.setTextColor(255, 255, 255)
      this.doc.text(`✓ ${phase.result}`, 162.5, this.y + 20.5, { align: 'center' })
      
      this.y += 30
    })
    this.y += 5
  }

  private createMetrics(metrics: any) {
    this.checkPage(45)
    this.addHeader('📊 Performance', this.colors.tyrone)
    
    const data = [
      { label: 'Efficiency', value: metrics.efficiency, icon: '⚡', color: this.colors.tyrone },
      { label: 'Quality', value: metrics.quality, icon: '✨', color: this.colors.success },
      { label: 'Speed', value: metrics.speed, icon: '🚀', color: this.colors.info },
      { label: 'Complexity', value: metrics.complexity, icon: '🎯', color: this.colors.purple }
    ]
    
    data.forEach((m, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = 20 + (col * 87.5)
      const y = this.y + (row * 23)
      
      this.doc.setFillColor(248, 250, 252)
      this.doc.roundedRect(x, y, 82.5, 20, 2, 2, 'F')
      
      // Tyrone red accent bar
      this.doc.setFillColor(...m.color)
      this.doc.roundedRect(x, y, 82.5, 2.5, 2, 2, 'F')
      
      this.doc.setFontSize(14)
      this.doc.text(m.icon, x + 6, y + 12)
      
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(100, 100, 100)
      this.doc.text(m.label, x + 16, y + 8)
      
      this.doc.setFontSize(11)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(30, 30, 30)
      this.doc.text(m.value, x + 16, y + 16)
    })
    
    this.y += 50
  }

  private createInsights(insights: any[]) {
    this.addHeader('💡 Insights', this.colors.tyrone)
    
    insights.forEach((ins) => {
      this.checkPage(25)
      
      this.doc.setFillColor(252, 252, 254)
      this.doc.roundedRect(20, this.y, 170, 20, 2, 2, 'F')
      
      const catColor = ins.category === 'Performance' ? this.colors.tyrone :
                       ins.category === 'Security' ? this.colors.error : this.colors.info
      
      this.doc.setFillColor(...catColor)
      this.doc.roundedRect(23, this.y + 3, 22, 6, 1, 1, 'F')
      this.doc.setFontSize(7)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(255, 255, 255)
      this.doc.text(ins.category.toUpperCase(), 34, this.y + 7, { align: 'center' })
      
      this.doc.setFontSize(12)
      this.doc.text(ins.icon, 50, this.y + 8)
      
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(30, 30, 30)
      this.doc.text(ins.finding, 57, this.y + 8)
      
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(100, 100, 100)
      this.doc.text(`→ ${ins.impact}`, 57, this.y + 15)
      
      this.y += 23
    })
    this.y += 5
  }

  private createRecommendations(recs: any[]) {
    this.addHeader('🚀 Next Steps', this.colors.tyrone)
    
    recs.forEach((rec) => {
      this.checkPage(15)
      
      const priColor = rec.priority === 'High' ? this.colors.tyrone :
                       rec.priority === 'Medium' ? this.colors.warning : this.colors.info
      
      this.doc.setFillColor(...priColor)
      this.doc.circle(23, this.y - 1, 2.5, 'F')
      
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(30, 30, 30)
      this.doc.text(`${rec.icon} ${rec.action}`, 28, this.y)
      
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(100, 100, 100)
      this.doc.text(`↳ ${rec.benefit}`, 28, this.y + 5)
      
      this.y += 12
    })
  }

  private createTechStack(stack: string[]) {
    this.checkPage(30)
    this.addHeader('🛠️ Tech Stack', this.colors.tyrone)
    
    let x = 20
    stack.forEach((tech) => {
      if (x + 38 > 190) {
        x = 20
        this.y += 12
      }
      
      this.doc.setFillColor(241, 245, 249)
      this.doc.roundedRect(x, this.y, 38, 9, 1.5, 1.5, 'F')
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(30, 30, 30)
      this.doc.text(tech.slice(0, 10), x + 19, this.y + 6, { align: 'center' })
      x += 40
    })
    
    this.y += 15
  }

  private addHeader(title: string, color: number[]) {
    this.checkPage(12)
    
    // Tyrone red accent bar
    this.doc.setFillColor(...color)
    this.doc.rect(20, this.y, 3, 7, 'F')
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...color)
    this.doc.text(title, 26, this.y + 5)
    this.y += 12
  }

  private checkPage(space: number) {
    if (this.y + space > 270) {
      this.doc.addPage()
      this.y = 20
    }
  }

  private addFooters() {
    const pages = this.doc.getNumberOfPages()
    
    for (let i = 1; i <= pages; i++) {
      this.doc.setPage(i)
      
      // Footer line
      this.doc.setDrawColor(230, 230, 230)
      this.doc.setLineWidth(0.3)
      this.doc.line(20, 282, 190, 282)
      
      // Page number
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(150, 150, 150)
      this.doc.text(`Page ${i} of ${pages}`, 105, 287, { align: 'center' })
      
      // **TYRONE LOGO** in footer - Tyrone red, no background
      this.doc.setFontSize(11)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.tyrone)
      this.doc.text('Tyrone', 185, 287, { align: 'right' })
    }
  }
}

