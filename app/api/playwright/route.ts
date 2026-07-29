import { NextRequest, NextResponse } from 'next/server'
import { playwrightService } from '../../lib/playwright-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      action, 
      url, 
      options = {}, 
      selectors, 
      formData, 
      submitButton, 
      actions, 
      duration,
      script,
      devices: deviceList
    } = body

    if (!action || !url) {
      return NextResponse.json({
        success: false,
        error: 'Action and URL are required'
      }, { status: 400 })
    }

    console.log(`🎭 Playwright ${action} request: ${url}`)

    let result

    switch (action) {
      case 'navigate':
      case 'extract':
        result = await playwrightService.navigateAndExtract(url, selectors, options)
        break

      case 'fill_form':
        if (!formData || !submitButton) {
          return NextResponse.json({
            success: false,
            error: 'formData and submitButton required for fill_form action'
          }, { status: 400 })
        }
        result = await playwrightService.fillFormAndSubmit(url, formData, submitButton, options)
        break

      case 'screenshot':
        result = await playwrightService.navigateAndExtract(url, undefined, { 
          ...options, 
          screenshot: true,
          fullPage: options.fullPage !== false  // Default to fullPage
        })
        break

      case 'pdf':
        result = await playwrightService.generatePDF(url, options)
        break

      case 'monitor':
      case 'monitor_network':
        result = await playwrightService.monitorNetwork(url, duration || 10000)
        break

      case 'interact':
        if (!actions || !Array.isArray(actions)) {
          return NextResponse.json({
            success: false,
            error: 'actions array required for interact action'
          }, { status: 400 })
        }
        result = await playwrightService.interactWithPage(url, actions, options)
        break

      case 'execute_script':
      case 'run_javascript':
        if (!script) {
          return NextResponse.json({
            success: false,
            error: 'script required for execute_script action'
          }, { status: 400 })
        }
        result = await playwrightService.executeJavaScript(url, script, options)
        break

      case 'test_responsive':
        result = await playwrightService.testResponsive(url, deviceList)
        break

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Supported: navigate, extract, fill_form, screenshot, pdf, monitor, interact, execute_script, test_responsive`
        }, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Playwright API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


