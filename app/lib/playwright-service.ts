/**
 * Playwright Browser Automation Service
 * Provides powerful cross-browser automation for Latenite AI agent
 * 
 * Based on Microsoft Playwright documentation
 * Capabilities:
 * - Cross-browser (Chromium, Firefox, WebKit)
 * - Form filling and interaction
 * - Data extraction and scraping
 * - Screenshots and PDF generation
 * - Network monitoring
 * - Mobile emulation
 * - JavaScript execution
 * - Auto-waiting for elements
 */

import { chromium, firefox, webkit, Browser, Page, BrowserContext, devices } from 'playwright'

export interface PlaywrightOptions {
  browser?: 'chromium' | 'firefox' | 'webkit'
  headless?: boolean
  viewport?: { width: number; height: number }
  userAgent?: string
  timeout?: number
  screenshot?: boolean
  fullPage?: boolean
  device?: string  // e.g., 'iPhone 11', 'Pixel 5'
}

export interface PlaywrightResult {
  success: boolean
  data?: any
  screenshot?: string  // Base64
  pdf?: Buffer
  error?: string
  timing?: {
    start: number
    end: number
    duration: number
  }
  networkActivity?: {
    requests: number
    responses: number
  }
}

class PlaywrightService {
  private static instance: PlaywrightService
  private browsers: Map<string, Browser> = new Map()

  static getInstance(): PlaywrightService {
    if (!this.instance) {
      this.instance = new PlaywrightService()
    }
    return this.instance
  }

  /**
   * Launch browser (reuse if already running)
   */
  async launchBrowser(type: 'chromium' | 'firefox' | 'webkit' = 'chromium'): Promise<Browser> {
    if (this.browsers.has(type)) {
      const browser = this.browsers.get(type)!
      if (browser.isConnected()) {
        console.log(`♻️ Reusing ${type} browser`)
        return browser
      } else {
        this.browsers.delete(type)
      }
    }

    console.log(`🎭 Launching ${type} browser...`)

    let browser: Browser
    switch (type) {
      case 'firefox':
        browser = await firefox.launch({ 
          headless: true,
          args: ['--no-sandbox']
        })
        break
      case 'webkit':
        browser = await webkit.launch({ headless: true })
        break
      case 'chromium':
      default:
        browser = await chromium.launch({ 
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        })
    }

    this.browsers.set(type, browser)
    console.log(`✅ ${type} browser ready`)
    return browser
  }

  /**
   * Navigate to URL and extract content
   */
  async navigateAndExtract(
    url: string,
    selectors?: { [key: string]: string },
    options: PlaywrightOptions = {}
  ): Promise<PlaywrightResult> {
    const startTime = Date.now()

    try {
      console.log(`🌐 Navigating to: ${url}`)
      
      const browser = await this.launchBrowser(options.browser)
      
      // Create context with device emulation if specified
      const contextOptions: any = {
        viewport: options.viewport || { width: 1920, height: 1080 },
        userAgent: options.userAgent
      }
      
      if (options.device && devices[options.device]) {
        Object.assign(contextOptions, devices[options.device])
        console.log(`📱 Emulating device: ${options.device}`)
      }
      
      const context = await browser.newContext(contextOptions)
      const page = await context.newPage()

      // Navigate with automatic waiting
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: options.timeout || 30000
      })

      // Extract data based on selectors
      const data: any = {
        url: page.url(),
        title: await page.title(),
        extractedAt: new Date().toISOString()
      }

      if (selectors) {
        // Custom selector extraction
        for (const [key, selector] of Object.entries(selectors)) {
          try {
            const elements = await page.$$(selector)
            data[key] = await Promise.all(
              elements.map(async el => {
                const text = await el.textContent()
                const html = await el.innerHTML()
                return { text: text?.trim(), html }
              })
            )
            console.log(`✅ Extracted ${data[key].length} elements for "${key}"`)
          } catch (error) {
            console.warn(`⚠️ Selector failed: ${selector}`)
            data[key] = null
          }
        }
      } else {
        // Extract all useful content
        data.body = await page.evaluate(() => document.body.innerText.substring(0, 5000))
        
        data.links = await page.evaluate(() => 
          Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.textContent?.trim(),
            href: a.href
          })).filter(l => l.text && l.href).slice(0, 30)
        )
        
        data.images = await page.evaluate(() =>
          Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt
          })).filter(i => i.src).slice(0, 20)
        )
        
        data.headings = await page.evaluate(() =>
          Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
            tag: h.tagName.toLowerCase(),
            text: h.textContent?.trim()
          })).filter(h => h.text)
        )
      }

      // Screenshot if requested
      if (options.screenshot) {
        const screenshot = await page.screenshot({ 
          type: 'png',
          fullPage: options.fullPage || false
        })
        data.screenshot = screenshot.toString('base64')
        console.log(`📸 Screenshot captured (${screenshot.length} bytes)`)
      }

      await context.close()

      const endTime = Date.now()
      
      return {
        success: true,
        data,
        screenshot: data.screenshot,
        timing: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime
        }
      }

    } catch (error) {
      console.error('❌ Playwright navigation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timing: {
          start: startTime,
          end: Date.now(),
          duration: Date.now() - startTime
        }
      }
    }
  }

  /**
   * Fill form and submit
   */
  async fillFormAndSubmit(
    url: string,
    formData: { [selector: string]: string },
    submitButton: string,
    options: PlaywrightOptions = {}
  ): Promise<PlaywrightResult> {
    const startTime = Date.now()
    
    try {
      const browser = await this.launchBrowser(options.browser)
      const context = await browser.newContext()
      const page = await context.newPage()

      console.log(`📝 Filling form on: ${url}`)
      await page.goto(url, { waitUntil: 'networkidle' })

      // Fill form fields with auto-wait
      for (const [selector, value] of Object.entries(formData)) {
        await page.fill(selector, value)
        console.log(`✅ Filled: ${selector} = ${value}`)
      }

      // Take screenshot before submit
      const beforeSubmit = await page.screenshot({ type: 'png' })

      // Click submit button
      await page.click(submitButton)
      console.log(`🖱️ Clicked submit: ${submitButton}`)
      
      // Wait for navigation or response
      await page.waitForLoadState('networkidle', { timeout: 10000 })

      const result: PlaywrightResult = {
        success: true,
        data: {
          url: page.url(),
          title: await page.title(),
          content: await page.evaluate(() => document.body.innerText.substring(0, 2000)),
          beforeSubmit: beforeSubmit.toString('base64')
        },
        timing: {
          start: startTime,
          end: Date.now(),
          duration: Date.now() - startTime
        }
      }

      await context.close()
      return result

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Form submission failed',
        timing: {
          start: startTime,
          end: Date.now(),
          duration: Date.now() - startTime
        }
      }
    }
  }

  /**
   * Generate PDF from webpage
   */
  async generatePDF(
    url: string,
    options: PlaywrightOptions = {}
  ): Promise<PlaywrightResult> {
    try {
      const browser = await this.launchBrowser(options.browser)
      const context = await browser.newContext()
      const page = await context.newPage()

      console.log(`📄 Generating PDF from: ${url}`)
      await page.goto(url, { waitUntil: 'networkidle' })
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
      })

      await context.close()

      return {
        success: true,
        pdf,
        data: {
          size: pdf.length,
          url,
          generatedAt: new Date().toISOString()
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed'
      }
    }
  }

  /**
   * Monitor network requests
   */
  async monitorNetwork(
    url: string,
    duration: number = 10000
  ): Promise<PlaywrightResult> {
    try {
      const browser = await this.launchBrowser()
      const context = await browser.newContext()
      const page = await context.newPage()

      const requests: any[] = []
      const responses: any[] = []

      console.log(`📡 Monitoring network for ${duration}ms on: ${url}`)

      page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType(),
          timestamp: Date.now()
        })
      })

      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status(),
          contentType: response.headers()['content-type'],
          timing: response.timing(),
          timestamp: Date.now()
        })
      })

      await page.goto(url, { waitUntil: 'networkidle' })
      
      // Monitor for specified duration
      await new Promise(resolve => setTimeout(resolve, duration))

      await context.close()

      return {
        success: true,
        data: {
          requests: requests.slice(0, 100),
          responses: responses.slice(0, 100),
          summary: {
            totalRequests: requests.length,
            totalResponses: responses.length,
            byMethod: this.groupByMethod(requests),
            byStatus: this.groupByStatus(responses),
            slowest: this.getSlowestRequests(responses, 5)
          }
        },
        networkActivity: {
          requests: requests.length,
          responses: responses.length
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network monitoring failed'
      }
    }
  }

  /**
   * Interact with page (click, type, select, etc.)
   */
  async interactWithPage(
    url: string,
    actions: Array<{ 
      type: 'click' | 'type' | 'press' | 'wait' | 'select' | 'check' | 'hover'
      selector?: string
      value?: string
    }>,
    options: PlaywrightOptions = {}
  ): Promise<PlaywrightResult> {
    try {
      const browser = await this.launchBrowser(options.browser)
      const context = await browser.newContext()
      const page = await context.newPage()

      console.log(`🎮 Interacting with: ${url}`)
      await page.goto(url, { waitUntil: 'networkidle' })

      for (const action of actions) {
        console.log(`🎯 Action: ${action.type} ${action.selector || ''} ${action.value || ''}`)
        
        switch (action.type) {
          case 'click':
            if (action.selector) {
              await page.click(action.selector)
            }
            break
          case 'type':
            if (action.selector && action.value) {
              await page.fill(action.selector, action.value)
            }
            break
          case 'press':
            if (action.value) {
              await page.keyboard.press(action.value)
            }
            break
          case 'wait':
            await page.waitForTimeout(parseInt(action.value || '1000'))
            break
          case 'select':
            if (action.selector && action.value) {
              await page.selectOption(action.selector, action.value)
            }
            break
          case 'check':
            if (action.selector) {
              await page.check(action.selector)
            }
            break
          case 'hover':
            if (action.selector) {
              await page.hover(action.selector)
            }
            break
        }
      }

      // Take final screenshot
      const screenshot = await page.screenshot({ type: 'png', fullPage: options.fullPage })

      const result = {
        success: true,
        data: {
          url: page.url(),
          title: await page.title(),
          content: await page.evaluate(() => document.body.innerText.substring(0, 2000))
        },
        screenshot: screenshot.toString('base64')
      }

      await context.close()
      return result

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Interaction failed'
      }
    }
  }

  /**
   * Run custom JavaScript in page context
   */
  async executeJavaScript(
    url: string,
    script: string,
    options: PlaywrightOptions = {}
  ): Promise<PlaywrightResult> {
    try {
      const browser = await this.launchBrowser(options.browser)
      const context = await browser.newContext()
      const page = await context.newPage()

      await page.goto(url, { waitUntil: 'networkidle' })
      
      console.log(`⚡ Executing JavaScript on: ${url}`)
      const result = await page.evaluate(script)

      await context.close()

      return {
        success: true,
        data: { result }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Script execution failed'
      }
    }
  }

  /**
   * Test responsive design
   */
  async testResponsive(
    url: string,
    deviceNames: string[] = ['iPhone 11', 'iPad Pro', 'Desktop Chrome']
  ): Promise<PlaywrightResult> {
    try {
      const browser = await this.launchBrowser()
      const results: any[] = []

      for (const deviceName of deviceNames) {
        const device = devices[deviceName]
        if (!device) {
          console.warn(`⚠️ Unknown device: ${deviceName}`)
          continue
        }

        const context = await browser.newContext(device)
        const page = await context.newPage()

        await page.goto(url, { waitUntil: 'networkidle' })
        
        const screenshot = await page.screenshot({ type: 'png', fullPage: false })
        
        results.push({
          device: deviceName,
          viewport: device.viewport,
          screenshot: screenshot.toString('base64'),
          title: await page.title(),
          url: page.url()
        })

        await context.close()
        console.log(`✅ Tested on ${deviceName}`)
      }

      return {
        success: true,
        data: { tests: results, deviceCount: results.length }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Responsive test failed'
      }
    }
  }

  /**
   * Helper: Group requests by method
   */
  private groupByMethod(requests: any[]): { [method: string]: number } {
    const grouped: { [key: string]: number } = {}
    requests.forEach(r => {
      grouped[r.method] = (grouped[r.method] || 0) + 1
    })
    return grouped
  }

  /**
   * Helper: Group responses by status code
   */
  private groupByStatus(responses: any[]): { [status: string]: number } {
    const grouped: { [key: string]: number } = {}
    responses.forEach(r => {
      grouped[r.status] = (grouped[r.status] || 0) + 1
    })
    return grouped
  }

  /**
   * Helper: Get slowest requests
   */
  private getSlowestRequests(responses: any[], count: number): any[] {
    return responses
      .filter(r => r.timing?.responseEnd)
      .map(r => ({
        url: r.url,
        duration: r.timing.responseEnd,
        status: r.status
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count)
  }

  /**
   * Cleanup all browsers
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Playwright browsers...')
    
    for (const [type, browser] of this.browsers.entries()) {
      try {
        await browser.close()
        console.log(`✅ Closed ${type} browser`)
      } catch (error) {
        console.error(`❌ Failed to close ${type}:`, error)
      }
    }
    
    this.browsers.clear()
  }
}

export const playwrightService = PlaywrightService.getInstance()

// Cleanup on process exit
process.on('exit', () => {
  playwrightService.cleanup()
})


