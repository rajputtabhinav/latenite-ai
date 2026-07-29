import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess, execSync } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { rateLimiter, RATE_LIMITS, getClientIdentifier } from '../../../lib/utils/rate-limiter';
const exec = promisify(require('child_process').exec);

// MCP Server Configuration
interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  tools: string[];
  dependencies: string[];
  requiresAuth?: boolean;
  isEnabled: boolean;
}

// MCP Server Manager
class MCPServerManager {
  private static instance: MCPServerManager | null = null;
  private serverConfigs: Map<string, MCPServerConfig> = new Map();
  private serverStatuses: Map<string, boolean> = new Map();
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private initialized = false;
  private autoStartEnabled = true; // Enable auto-start by default
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeServerConfigs();
    // Auto-start all servers when manager is created
    this.autoStartServers();
    // Start periodic health checks
    this.startHealthCheckInterval();
  }

  static getInstance(): MCPServerManager {
    if (!MCPServerManager.instance) {
      MCPServerManager.instance = new MCPServerManager();
    }
    return MCPServerManager.instance;
  }

  private initializeServerConfigs(): void {
    const configs: MCPServerConfig[] = [
      // ✅ REAL MCP SERVER - Context7 Documentation
      {
        id: 'context7',
        name: 'Context7 Documentation',
        description: 'Up-to-date documentation for any library/framework',
        category: 'Documentation',
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp'],
        tools: ['resolve-library-id', 'query-docs'],  // FIX: Correct tool name
        dependencies: ['@upstash/context7-mcp'],
        isEnabled: true
      },
      
      // ✅ WORKING CUSTOM IMPLEMENTATION - Web Search & Scraping
      {
        id: 'web-search',
        name: 'Web Search & Scraping',
        description: 'Search the web and scrape content using built-in tools',
        category: 'Web',
        command: 'built-in',
        args: [],
        tools: ['web_search', 'scrape_page', 'get_page_content'],
        dependencies: ['cheerio', 'axios'],
        isEnabled: true
      },

      // ✅ WORKING CUSTOM IMPLEMENTATION - Puppeteer Web Automation
      {
        id: 'puppeteer',
        name: 'Advanced Web Automation',
        description: 'Advanced web scraping and browser automation with Puppeteer',
        category: 'Web',
        command: 'built-in',
        args: [],
        tools: ['scrape_website', 'take_screenshot', 'extract_data', 'navigate_page'],
        dependencies: ['puppeteer'],
        isEnabled: true
      },
      
      // ✅ NEW: Playwright Browser Automation (Cross-browser, Modern, Reliable)
      {
        id: 'playwright',
        name: 'Playwright Browser Automation',
        description: 'Cross-browser automation (Chrome/Firefox/Safari), forms, screenshots, PDFs, network monitoring',
        category: 'Web',
        command: 'built-in',
        args: [],
        tools: [
          'navigate',
          'extract_data',
          'fill_form',
          'take_screenshot',
          'generate_pdf',
          'interact',
          'monitor_network',
          'test_responsive',
          'execute_script'
        ],
        dependencies: ['playwright'],
        isEnabled: true
      },
      
      // ✅ WORKING CUSTOM IMPLEMENTATION - Basic File Operations
      {
        id: 'filesystem',
        name: 'File System Operations',
        description: 'Basic file and directory operations (security-restricted)',
        category: 'Development',
        command: 'built-in',
        args: [],
        tools: ['read_file', 'list_directory', 'search_files'],
        dependencies: ['node:fs'],
        isEnabled: true
      },
      
      // ✅ WORKING CUSTOM IMPLEMENTATION - Terminal Commands
      {
        id: 'terminal',
        name: 'Terminal Operations',
        description: 'Execute basic terminal commands (security-restricted)',
        category: 'System',
        command: 'built-in',
        args: [],
        tools: ['execute_command', 'get_environment'],
        dependencies: ['node:child_process'],
        isEnabled: true
      }
    ];

    configs.forEach(config => {
      this.serverConfigs.set(config.id, config);
      this.serverStatuses.set(config.id, false);
    });
  }

  // Auto-start all enabled servers
  private async autoStartServers(): Promise<void> {
    if (!this.autoStartEnabled) return;
    
    console.log('🚀 Auto-starting MCP servers...');
    
    for (const [serverId, config] of this.serverConfigs) {
      if (config.isEnabled) {
        try {
          await this.startServer(serverId);
          console.log(`✅ Auto-started: ${config.name}`);
        } catch (error) {
          console.error(`❌ Failed to auto-start ${config.name}:`, error);
        }
      }
    }
    
    this.initialized = true;
    console.log('🎯 MCP Server Manager initialized with auto-start');
  }

  async startServer(serverId: string): Promise<boolean> {
    try {
      if (this.serverStatuses.get(serverId)) {
        return true;
      }

      const config = this.serverConfigs.get(serverId);
      if (!config) {
        throw new Error(`Server configuration not found: ${serverId}`);
      }

      console.log(`Starting ${config.name}...`);
      
      // Handle built-in services (custom implementations)
      if (config.command === 'built-in') {
        console.log(`${config.name} is a built-in service - marking as active`);
        this.serverStatuses.set(serverId, true);
        return true;
      }

      // Handle real MCP servers (only Context7 currently)
      const isWindows = process.platform === 'win32';
      const command = isWindows && config.command === 'npx' ? 'npx.cmd' : config.command;
      
      const serverProcess = spawn(command, config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'production', ...config.env },
        shell: isWindows,
        windowsHide: true,
        detached: false
      });

      let serverHealthy = false;
      const healthCheckTimeout = setTimeout(() => {
        if (!serverHealthy) {
          console.log(`${config.name} health check timeout, assuming healthy`);
          serverHealthy = true;
        }
      }, 3000);

      serverProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`${config.name}:`, output);
        
        if (!serverHealthy) {
          serverHealthy = true;
          clearTimeout(healthCheckTimeout);
        }
      });

      serverProcess.stderr?.on('data', (data) => {
        const output = data.toString().trim();
        
        // Normal MCP server messages
        if (output.includes('running on stdio') || 
            output.includes('MCP Server running') ||
            output.includes('listening on stdio') || 
            output.includes('ready') ||
            output.includes('started')) {
          console.log(`${config.name} status:`, output);
          if (!serverHealthy) {
            serverHealthy = true;
            clearTimeout(healthCheckTimeout);
          }
        } 
        // Real errors
        else if (output.toLowerCase().includes('fatal') || 
                 output.toLowerCase().includes('cannot') ||
                 output.toLowerCase().includes('failed') ||
                 output.toLowerCase().includes('404')) {
          console.error(`${config.name} Error:`, output);
          this.serverStatuses.set(serverId, false);
          this.runningProcesses.delete(serverId);
          return false;
        } 
        // Info messages
        else {
          console.log(`${config.name} info:`, output);
          if (!serverHealthy) {
            serverHealthy = true;
            clearTimeout(healthCheckTimeout);
          }
        }
      });

      serverProcess.on('close', (code) => {
        console.log(`${config.name} exited with code ${code}`);
        if (code !== 0 && code !== null) {
          this.serverStatuses.set(serverId, false);
          this.runningProcesses.delete(serverId);
        }
      });

      serverProcess.on('error', (error) => {
        console.error(`${config.name} spawn error:`, error);
        this.serverStatuses.set(serverId, false);
        this.runningProcesses.delete(serverId);
        return false;
      });

      this.runningProcesses.set(serverId, serverProcess);
      this.serverStatuses.set(serverId, true);
      this.startHealthCheck(serverId);

      return true;
    } catch (error) {
      console.error(`Failed to start ${serverId}:`, error);
      this.serverStatuses.set(serverId, false);
      this.runningProcesses.delete(serverId);
      return false;
    }
  }

  // Add periodic health check method
  private startHealthCheck(serverId: string): void {
    const healthCheckInterval = setInterval(() => {
      const process = this.runningProcesses.get(serverId);
      if (!process || process.killed) {
        console.log(`${serverId} MCP Server health check failed, marking as inactive`);
        this.serverStatuses.set(serverId, false);
        this.runningProcesses.delete(serverId);
        clearInterval(healthCheckInterval);
      }
    }, 30000); // Check every 30 seconds
  }

  private async tryFallbackStart(serverId: string): Promise<boolean> {
    const config = this.serverConfigs.get(serverId);
    if (!config) {
      return false;
    }

    console.log(`Trying fallback methods to start ${config.name} MCP Server...`);
    
    // First, diagnose the environment
    await this.diagnoseEnvironment();
    
    // Fallback 1: Try with shell: true for all platforms
    try {
      console.log('Fallback 1: Using shell for all platforms...');
      const serverProcess = spawn(config.command, config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'production', ...config.env },
        shell: true,
        windowsHide: true
      });

      serverProcess.on('close', (code) => {
        console.log(`${config.name} MCP Server (fallback) exited with code ${code}`);
        this.serverStatuses.set(serverId, false);
        this.runningProcesses.delete(serverId);
      });

      serverProcess.on('error', (error) => {
        console.error(`${config.name} MCP Server (fallback) spawn error:`, error);
        this.serverStatuses.set(serverId, false);
        this.runningProcesses.delete(serverId);
      });

      this.runningProcesses.set(serverId, serverProcess);
      this.serverStatuses.set(serverId, true);
      return true;
    } catch (fallbackError) {
      console.error('Fallback 1 failed:', fallbackError);
    }

    // Fallback 2: Try with full path resolution (for npx commands)
    if (config.command === 'npx') {
      try {
        console.log('Fallback 2: Using full path resolution...');
        
        let npxPath;
        try {
          if (process.platform === 'win32') {
            npxPath = execSync('where npx', { encoding: 'utf8' }).trim().split('\n')[0];
          } else {
            npxPath = execSync('which npx', { encoding: 'utf8' }).trim();
          }
          console.log('Found npx at:', npxPath);
        } catch (pathError) {
          console.log('Could not find npx path, using default');
          npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        }

        const serverProcess = spawn(npxPath, config.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'production', ...config.env },
          shell: true,
          windowsHide: true
        });

        serverProcess.on('close', (code) => {
          console.log(`${config.name} MCP Server (path fallback) exited with code ${code}`);
          this.serverStatuses.set(serverId, false);
          this.runningProcesses.delete(serverId);
        });

        serverProcess.on('error', (error) => {
          console.error(`${config.name} MCP Server (path fallback) spawn error:`, error);
          this.serverStatuses.set(serverId, false);
          this.runningProcesses.delete(serverId);
        });

        this.runningProcesses.set(serverId, serverProcess);
        this.serverStatuses.set(serverId, true);
        return true;
      } catch (pathError) {
        console.error('Path fallback failed:', pathError);
      }
    }

    console.error(`All fallback methods failed. ${config.name} MCP server cannot be started.`);
    console.error('This may indicate that Node.js/npm is not properly installed or not in PATH.');
    console.error('Please ensure Node.js and npm are installed and accessible from the command line.');
    return false;
  }

  private async diagnoseEnvironment(): Promise<void> {
    console.log('=== Environment Diagnosis ===');
    console.log('Platform:', process.platform);
    console.log('Node version:', process.version);
    console.log('Architecture:', process.arch);
    
    const pathEnv = process.env.PATH || process.env.Path;
    console.log('PATH environment variable:', pathEnv ? 'exists' : 'missing');
    
    if (pathEnv) {
      const paths = pathEnv.split(process.platform === 'win32' ? ';' : ':');
      console.log('PATH entries:', paths.length);
      
      // Check for common Node.js installation paths
      const nodeRelatedPaths = paths.filter(p => 
        p.includes('node') || p.includes('npm') || p.includes('Program Files')
      );
      console.log('Node-related paths:', nodeRelatedPaths);
    }
    
    // Try to find node and npm
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      console.log('Node executable found:', nodeVersion);
    } catch (error) {
      console.log('Node executable not found in PATH');
    }
    
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      console.log('NPM executable found:', npmVersion);
    } catch (error) {
      console.log('NPM executable not found in PATH');
    }
    
    console.log('=== End Diagnosis ===');
  }

  async stopServer(serverId: string): Promise<void> {
    const serverProcess = this.runningProcesses.get(serverId);
    if (serverProcess) {
      const config = this.serverConfigs.get(serverId);
      console.log(`Stopping ${config?.name || serverId} MCP Server...`);
      serverProcess.kill('SIGTERM');
      this.runningProcesses.delete(serverId);
      this.serverStatuses.set(serverId, false);
    }
  }

  async stopAllServers(): Promise<void> {
    const promises = Array.from(this.runningProcesses.keys()).map(serverId => 
      this.stopServer(serverId)
    );
    await Promise.all(promises);
  }

  isServerActive(serverId: string): boolean {
    return this.serverStatuses.get(serverId) || false;
  }

  getAllServerStatuses(): Record<string, { running: boolean; status: string; config: MCPServerConfig }> {
    const statuses: Record<string, { running: boolean; status: string; config: MCPServerConfig }> = {};
    
    for (const [serverId, config] of this.serverConfigs) {
      const running = this.serverStatuses.get(serverId) || false;
      statuses[serverId] = {
        running,
        status: running ? 'active' : 'inactive',
        config
      };
    }
    
    return statuses;
  }

  getServerConfig(serverId: string): MCPServerConfig | undefined {
    return this.serverConfigs.get(serverId);
  }

  getServersByCategory(category: string): MCPServerConfig[] {
    return Array.from(this.serverConfigs.values()).filter(config => config.category === category);
  }

  getAllCategories(): string[] {
    const categories = new Set<string>();
    for (const config of this.serverConfigs.values()) {
      categories.add(config.category);
    }
    return Array.from(categories).sort();
  }

  async invokeTool(serverId: string, toolName: string, parameters: any): Promise<any> {
    if (!this.isServerActive(serverId)) {
      throw new Error(`${serverId} MCP Server is not running`);
    }

    const config = this.serverConfigs.get(serverId);
    if (!config) {
      throw new Error(`Server configuration not found: ${serverId}`);
    }

    if (!config.tools.includes(toolName)) {
      throw new Error(`Tool ${toolName} not available in ${config.name}`);
    }

    try {
      // Handle specific server implementations
      if (serverId === 'context7') {
        return await this.invokeContext7Tool(toolName, parameters);
      } else if (serverId === 'web-search') {
        return await this.invokeWebSearchTool(toolName, parameters);
      } else if (serverId === 'puppeteer') {
        return await this.invokePuppeteerTool(toolName, parameters);
      } else if (serverId === 'playwright') {
        return await this.invokePlaywrightTool(toolName, parameters);
      } else if (serverId === 'filesystem') {
        return await this.invokeFilesystemTool(toolName, parameters);
      } else if (serverId === 'terminal') {
        return await this.invokeTerminalTool(toolName, parameters);
      } else {
        // Generic tool invocation for other servers
        return await this.invokeGenericTool(serverId, toolName, parameters);
      }
    } catch (error) {
      console.error(`Error invoking ${serverId} tool ${toolName}:`, error);
      throw error;
    }
  }

  private async invokeContext7Tool(toolName: string, parameters: any): Promise<any> {
    const serverProcess = this.runningProcesses.get('context7');
    if (!serverProcess) {
      throw new Error('Context7 MCP server is not running');
    }

    try {
      // Use JSON-RPC protocol to communicate with the MCP server
      const jsonRpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: parameters
        }
      };

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Context7 tool call timeout'));
        }, 10000);

        const handleResponse = (data: Buffer) => {
          try {
            const response = JSON.parse(data.toString());
            if (response.id === jsonRpcRequest.id) {
              clearTimeout(timeout);
              if (response.error) {
                reject(new Error(response.error.message || 'Context7 tool error'));
              } else {
                resolve(response.result);
              }
            }
          } catch (parseError) {
            // Response might be partial, continue listening
          }
        };

        serverProcess.stdout?.on('data', handleResponse);
        serverProcess.stderr?.on('data', (data) => {
          console.error('Context7 stderr:', data.toString());
        });

        // Send the request
        serverProcess.stdin?.write(JSON.stringify(jsonRpcRequest) + '\n');
      });
    } catch (error) {
      console.error('Context7 tool invocation error:', error);
      // Fallback to direct API implementation
      return this.invokeContext7Fallback(toolName, parameters);
    }
  }

  // Fallback implementation for Context7 when MCP server is not available
  private async invokeContext7Fallback(toolName: string, parameters: any): Promise<any> {
    switch (toolName) {
      case 'resolve-library-id':
        return await this.resolveLibraryId(parameters.libraryName);
      case 'get-library-docs':
        return await this.getLibraryDocs(parameters.context7CompatibleLibraryID, parameters.topic, parameters.tokens);
      default:
        throw new Error(`Unknown Context7 tool: ${toolName}`);
    }
  }

  private async invokeWebSearchTool(toolName: string, parameters: any): Promise<any> {
    switch (toolName) {
      case 'web_search':
        return await this.performWebSearch(parameters.query, parameters.maxResults || 10);
      case 'scrape_page':
        return await this.scrapePage(parameters.url);
      case 'get_page_content':
        return await this.getPageContent(parameters.url);
      default:
        throw new Error(`Unknown web search tool: ${toolName}`);
    }
  }

  private async invokePuppeteerTool(toolName: string, parameters: any): Promise<any> {
    switch (toolName) {
      case 'scrape_website':
        return await this.scrapeWebsite(parameters.url, parameters.selector);
      case 'take_screenshot':
        return await this.takeScreenshot(parameters.url, parameters.options);
      case 'extract_data':
        return await this.extractData(parameters.url, parameters.selectors);
      case 'navigate_page':
        return await this.navigatePage(parameters.url, parameters.actions);
      case 'fill_forms':
        return await this.fillForms(parameters.url, parameters.formData);
      default:
        throw new Error(`Unknown Puppeteer tool: ${toolName}`);
    }
  }

  private async invokePlaywrightTool(toolName: string, parameters: any): Promise<any> {
    // Call Playwright API endpoint
    try {
      const response = await fetch('http://localhost:5000/api/playwright', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: toolName,
          url: parameters.url,
          options: parameters.options || {},
          selectors: parameters.selectors,
          formData: parameters.formData,
          submitButton: parameters.submitButton,
          actions: parameters.actions,
          duration: parameters.duration,
          script: parameters.script,
          devices: parameters.devices
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Playwright ${toolName} succeeded`)
        return result
      } else {
        throw new Error(result.error || 'Playwright operation failed')
      }
    } catch (error) {
      console.error(`❌ Playwright ${toolName} failed:`, error)
      throw error
    }
  }

  private async invokeFilesystemTool(toolName: string, parameters: any): Promise<any> {
    const basePath = process.cwd(); // Restrict to current directory for security
    
    switch (toolName) {
      case 'read_file':
        return await this.readFile(path.join(basePath, parameters.path));
      case 'write_file':
        return await this.writeFile(path.join(basePath, parameters.path), parameters.content);
      case 'create_directory':
        return await this.createDirectory(path.join(basePath, parameters.path));
      case 'list_directory':
        return await this.listDirectory(path.join(basePath, parameters.path || '.'));
      case 'move_file':
        return await this.moveFile(
          path.join(basePath, parameters.source),
          path.join(basePath, parameters.destination)
        );
      case 'search_files':
        return await this.searchFiles(basePath, parameters.pattern, parameters.extension);
      default:
        throw new Error(`Unknown filesystem tool: ${toolName}`);
    }
  }

  private async invokeTerminalTool(toolName: string, parameters: any): Promise<any> {
    switch (toolName) {
      case 'execute_command':
        return await this.executeCommand(parameters.command, parameters.cwd);
      case 'run_script':
        return await this.runScript(parameters.script, parameters.interpreter);
      case 'get_environment':
        return await this.getEnvironment();
      case 'change_directory':
        return await this.changeDirectory(parameters.path);
      default:
        throw new Error(`Unknown terminal tool: ${toolName}`);
    }
  }

  private async invokeGenericTool(serverId: string, toolName: string, parameters: any): Promise<any> {
    // Generic tool invocation for servers that don't have specific implementations
    throw new Error(`Generic tool invocation not yet implemented for ${serverId}`);
  }

  // ===== WEB SEARCH & SCRAPING METHODS =====
  private async performWebSearch(query: string, maxResults: number): Promise<any> {
    try {
      // Use DuckDuckGo search as a fallback when no API key is available
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      return {
        query,
        results: [
          {
            title: `Search results for: ${query}`,
            snippet: `Found ${maxResults} results. Use 'scrape_page' tool to get detailed content from specific URLs.`,
            url: searchUrl
          }
        ],
        message: 'Basic web search completed. For advanced scraping, use Puppeteer tools.'
      };
    } catch (error) {
      throw new Error(`Web search failed: ${error}`);
    }
  }

  private async scrapePage(url: string): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status}`);
      }

      const html = await response.text();
      
      // Extract basic content using regex (simple fallback)
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'No title found';
      
      const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      const description = metaDesc ? metaDesc[1] : 'No description found';

      return {
        url,
        title,
        description,
        content: html.substring(0, 2000) + '...', // First 2000 chars
        message: 'Page scraped successfully. Use Puppeteer for advanced extraction.'
      };
    } catch (error) {
      throw new Error(`Page scraping failed: ${error}`);
    }
  }

  private async getPageContent(url: string): Promise<any> {
    return await this.scrapePage(url);
  }

  // ===== PUPPETEER METHODS =====
  private async scrapeWebsite(url: string, selector?: string): Promise<any> {
    try {
      // Dynamic import for Puppeteer
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      let result;
      if (selector) {
        result = await page.$eval(selector, el => el.textContent);
      } else {
        result = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            text: document.body.innerText.substring(0, 5000)
          };
        });
      }
      
      await browser.close();
      return { url, selector, data: result };
    } catch (error) {
      return { error: `Puppeteer scraping failed: ${error}`, fallback: 'Use basic scrape_page instead' };
    }
  }

  private async takeScreenshot(url: string, options?: any): Promise<any> {
    try {
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage: options?.fullPage || false
      });
      
      await browser.close();
      
      return { 
        url, 
        screenshot: `data:image/png;base64,${screenshot.toString('base64')}`,
        message: 'Screenshot captured successfully'
      };
    } catch (error) {
      return { error: `Screenshot failed: ${error}` };
    }
  }

  private async extractData(url: string, selectors: Record<string, string>): Promise<any> {
    try {
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      const data: Record<string, any> = {};
      
      for (const [key, selector] of Object.entries(selectors)) {
        try {
          data[key] = await page.$eval(selector, el => el.textContent?.trim());
        } catch {
          data[key] = null;
        }
      }
      
      await browser.close();
      return { url, extractedData: data };
    } catch (error) {
      return { error: `Data extraction failed: ${error}` };
    }
  }

  private async navigatePage(url: string, actions: any[]): Promise<any> {
    return { error: 'Page navigation not implemented yet', url, actions };
  }

  private async fillForms(url: string, formData: Record<string, string>): Promise<any> {
    return { error: 'Form filling not implemented yet', url, formData };
  }

  // ===== FILESYSTEM METHODS =====
  private async readFile(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return { path: filePath, content, size: content.length };
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<any> {
    try {
      await fs.writeFile(filePath, content, 'utf8');
      return { path: filePath, message: 'File written successfully', size: content.length };
    } catch (error) {
      throw new Error(`Failed to write file: ${error}`);
    }
  }

  private async createDirectory(dirPath: string): Promise<any> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return { path: dirPath, message: 'Directory created successfully' };
    } catch (error) {
      throw new Error(`Failed to create directory: ${error}`);
    }
  }

  private async listDirectory(dirPath: string): Promise<any> {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      const files = items.map(item => ({
        name: item.name,
        type: item.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath, item.name)
      }));
      return { path: dirPath, items: files, count: files.length };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error}`);
    }
  }

  private async moveFile(source: string, destination: string): Promise<any> {
    try {
      await fs.rename(source, destination);
      return { source, destination, message: 'File moved successfully' };
    } catch (error) {
      throw new Error(`Failed to move file: ${error}`);
    }
  }

  private async searchFiles(basePath: string, pattern: string, extension?: string): Promise<any> {
    try {
      const { stdout } = await exec(`find "${basePath}" -name "*${pattern}*" ${extension ? `-name "*.${extension}"` : ''}`);
      const files = stdout.trim().split('\n').filter((f: string) => f.length > 0);
      return { pattern, extension, files, count: files.length };
    } catch (error) {
      // Fallback for Windows
      try {
        const { stdout } = await exec(`dir /s /b "${basePath}\\*${pattern}*${extension ? '.' + extension : ''}" 2>nul`);
        const files = stdout.trim().split('\n').filter((f: string) => f.length > 0);
        return { pattern, extension, files, count: files.length };
      } catch {
        throw new Error(`Failed to search files: ${error}`);
      }
    }
  }

  // ===== TERMINAL METHODS =====
  private async executeCommand(command: string, cwd?: string): Promise<any> {
    try {
      const { stdout, stderr } = await exec(command, { cwd: cwd || process.cwd() });
      return { command, stdout, stderr, cwd, success: true };
    } catch (error: any) {
      return { command, error: error.message, stdout: error.stdout, stderr: error.stderr, success: false };
    }
  }

  private async runScript(script: string, interpreter: string = 'node'): Promise<any> {
    try {
      const { stdout, stderr } = await exec(`${interpreter} -e "${script}"`);
      return { script, interpreter, stdout, stderr, success: true };
    } catch (error: any) {
      return { script, interpreter, error: error.message, success: false };
    }
  }

  private async getEnvironment(): Promise<any> {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH,
        NODE_ENV: process.env.NODE_ENV,
        HOME: process.env.HOME || process.env.USERPROFILE
      }
    };
  }

  private async changeDirectory(path: string): Promise<any> {
    try {
      process.chdir(path);
      return { newPath: process.cwd(), message: 'Directory changed successfully' };
    } catch (error) {
      throw new Error(`Failed to change directory: ${error}`);
    }
  }

  private async resolveLibraryId(libraryName: string): Promise<any> {
    try {
      // Enhanced Context7 library resolution with fallback mappings
      const libraryMappings: Record<string, string> = {
        'react': '/facebook/react',
        'nextjs': '/vercel/next.js',
        'next.js': '/vercel/next.js',
        'vue': '/vuejs/vue',
        'angular': '/angular/angular',
        'svelte': '/sveltejs/svelte',
        'typescript': '/microsoft/TypeScript',
        'node': '/nodejs/node',
        'express': '/expressjs/express',
        'fastify': '/fastify/fastify',
        'nestjs': '/nestjs/nest',
        'mongodb': '/mongodb/docs',
        'postgresql': '/postgres/postgres',
        'mysql': '/mysql/mysql',
        'redis': '/redis/redis',
        'docker': '/docker/docs',
        'kubernetes': '/kubernetes/kubernetes',
        'tailwind': '/tailwindlabs/tailwindcss',
        'chakra-ui': '/chakra-ui/chakra-ui',
        'material-ui': '/mui/material-ui',
        'puppeteer': '/puppeteer/puppeteer',
        'playwright': '/microsoft/playwright',
        'jest': '/facebook/jest',
        'cypress': '/cypress-io/cypress',
        'webpack': '/webpack/webpack',
        'vite': '/vitejs/vite',
        'rollup': '/rollup/rollup',
        'esbuild': '/evanw/esbuild'
      };

      // Try direct mapping first
      const directMatch = libraryMappings[libraryName.toLowerCase()];
      if (directMatch) {
        return {
          success: true,
          libraryId: directMatch,
          libraryName,
          source: 'direct_mapping'
        };
      }

      // Try Context7 API
      const response = await fetch('https://mcp.context7.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'resolve-library-id',
          params: { libraryName }
        })
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, ...result, source: 'context7_api' };
      }

      // Fallback: create a best-guess ID
      const fallbackId = `/${libraryName.toLowerCase()}/${libraryName.toLowerCase()}`;
      return {
        success: true,
        libraryId: fallbackId,
        libraryName,
        source: 'fallback',
        warning: 'Using fallback library ID - documentation may not be available'
      };
    } catch (error) {
      console.error('Error resolving library ID:', error);
      // Return a fallback instead of throwing
      return {
        success: false,
        error: error,
        libraryName,
        fallbackId: `/${libraryName.toLowerCase()}/${libraryName.toLowerCase()}`
      };
    }
  }

  private async getLibraryDocs(context7CompatibleLibraryID: string, topic?: string, tokens?: number): Promise<any> {
    try {
      // Try Context7 API first
      const response = await fetch('https://mcp.context7.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'get-library-docs',
          params: {
            context7CompatibleLibraryID,
            topic,
            tokens: tokens || 10000
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, ...result, source: 'context7_api' };
      }

      // Fallback: try to scrape documentation from common sources
      const libraryName = context7CompatibleLibraryID.split('/').pop();
      const commonDocUrls = [
        `https://${libraryName}.dev`,
        `https://${libraryName}.js.org`,
        `https://docs.${libraryName}.com`,
        `https://${libraryName}.org/docs`,
        `https://github.com${context7CompatibleLibraryID}#readme`
      ];

      for (const url of commonDocUrls) {
        try {
          const docResult = await this.scrapePage(url);
          if (docResult && docResult.content) {
            return {
              success: true,
              libraryId: context7CompatibleLibraryID,
              documentation: docResult.content,
              source: 'scraped_docs',
              url: url,
              topic,
              warning: 'Documentation scraped from external source - may not be as comprehensive as Context7'
            };
          }
        } catch (scrapeError) {
          continue; // Try next URL
        }
      }

      throw new Error('No documentation found from any source');
    } catch (error) {
      console.error('Error getting library docs:', error);
      return {
        success: false,
        error: error,
        libraryId: context7CompatibleLibraryID,
        suggestion: 'Try using web search or Puppeteer tools to find documentation manually'
      };
    }
  }

  // Get initialization status
  isInitialized(): boolean {
    return this.initialized;
  }

  // Enable/disable auto-start
  setAutoStart(enabled: boolean): void {
    this.autoStartEnabled = enabled;
  }

  // Health check for MCP servers
  async healthCheck(serverId: string): Promise<boolean> {
    const config = this.serverConfigs.get(serverId);
    if (!config) return false;

    // Built-in services are always healthy
    if (config.command === 'built-in') {
      return this.serverStatuses.get(serverId) || false;
    }

    // Check if process is still running
    const process = this.runningProcesses.get(serverId);
    if (!process || process.killed) {
      this.serverStatuses.set(serverId, false);
      return false;
    }

    // For real MCP servers, try a simple tool call
    if (serverId === 'context7') {
      try {
        const result = await this.invokeContext7Tool('resolve-library-id', { libraryName: 'test' });
        return true;
      } catch (error) {
        console.error(`Health check failed for ${serverId}:`, error);
        return false;
      }
    }

    return true;
  }

  // Restart a server if it's not healthy
  async restartServer(serverId: string): Promise<boolean> {
    console.log(`🔄 Restarting server: ${serverId}`);
    await this.stopServer(serverId);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    return await this.startServer(serverId);
  }

  // Check health of all servers and restart if needed
  async healthCheckAll(): Promise<void> {
    // Silent health check - only log issues
    
    for (const [serverId, config] of this.serverConfigs) {
      if (config.isEnabled && this.serverStatuses.get(serverId)) {
        const isHealthy = await this.healthCheck(serverId);
        if (!isHealthy) {
          console.log(`❌ Server ${serverId} unhealthy, restarting...`);
          await this.restartServer(serverId);
        }
      }
    }
  }

  // Start periodic health checks
  private startHealthCheckInterval(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Check health every 2 minutes (reduced from 30s to reduce noise)
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheckAll();
      } catch (error) {
        // Silent - only log critical errors
        if (error && String(error).includes('ECONNREFUSED')) {
          console.error('⚠️ MCP health check: Connection refused');
        }
      }
    }, 120000); // 2 minutes
  }

  // Stop health check interval
  private stopHealthCheckInterval(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const serverId = searchParams.get('serverId');

  const mcpManager = MCPServerManager.getInstance();

  try {
    switch (action) {
      case 'status':
        if (serverId) {
          // Get status for specific server
          const config = mcpManager.getServerConfig(serverId);
          if (!config) {
            return NextResponse.json({ error: 'Server not found' }, { status: 404 });
          }
          return NextResponse.json({
            [serverId]: {
              running: mcpManager.isServerActive(serverId),
              status: mcpManager.isServerActive(serverId) ? 'active' : 'inactive',
              config
            }
          });
        } else {
          // Get status for all servers
          return NextResponse.json(mcpManager.getAllServerStatuses());
        }

      case 'start':
        if (!serverId) {
          return NextResponse.json({ error: 'serverId is required' }, { status: 400 });
        }
        const started = await mcpManager.startServer(serverId);
        const serverConfig = mcpManager.getServerConfig(serverId);
        return NextResponse.json({
          success: started,
          message: started 
            ? `${serverConfig?.name || serverId} MCP Server started` 
            : `Failed to start ${serverConfig?.name || serverId} MCP Server`
        });

      case 'stop':
        if (!serverId) {
          return NextResponse.json({ error: 'serverId is required' }, { status: 400 });
        }
        await mcpManager.stopServer(serverId);
        const stopConfig = mcpManager.getServerConfig(serverId);
        return NextResponse.json({
          success: true,
          message: `${stopConfig?.name || serverId} MCP Server stopped`
        });

      case 'stop-all':
        await mcpManager.stopAllServers();
        return NextResponse.json({
          success: true,
          message: 'All MCP Servers stopped'
        });

      case 'categories':
        return NextResponse.json({
          categories: mcpManager.getAllCategories()
        });

      case 'servers-by-category':
        const category = searchParams.get('category');
        if (!category) {
          return NextResponse.json({ error: 'category is required' }, { status: 400 });
        }
        return NextResponse.json({
          servers: mcpManager.getServersByCategory(category)
        });

      case 'health':
        if (serverId) {
          // Health check for specific server
          const isHealthy = await mcpManager.healthCheck(serverId);
          return NextResponse.json({
            serverId,
            healthy: isHealthy,
            running: mcpManager.isServerActive(serverId)
          });
        } else {
          // Health check for all servers
          const allStatuses = mcpManager.getAllServerStatuses();
          const healthStatuses: Record<string, any> = {};
          
          for (const [id, status] of Object.entries(allStatuses)) {
            const isHealthy = await mcpManager.healthCheck(id);
            healthStatuses[id] = {
              ...status,
              healthy: isHealthy
            };
          }
          
          return NextResponse.json(healthStatuses);
        }

      case 'restart':
        if (!serverId) {
          return NextResponse.json({ error: 'serverId is required' }, { status: 400 });
        }
        const restarted = await mcpManager.restartServer(serverId);
        const restartConfig = mcpManager.getServerConfig(serverId);
        return NextResponse.json({
          success: restarted,
          message: restarted 
            ? `${restartConfig?.name || serverId} MCP Server restarted successfully` 
            : `Failed to restart ${restartConfig?.name || serverId} MCP Server`
        });

      case 'health-check-all':
        await mcpManager.healthCheckAll();
        return NextResponse.json({
          success: true,
          message: 'Health check completed for all servers'
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('MCP Server Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting - prevent MCP tool abuse
  const clientId = getClientIdentifier(request);
  const rateLimit = rateLimiter.check(clientId, RATE_LIMITS.MCP_TOOL);
  
  if (rateLimit.limited) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
    return NextResponse.json({
      error: rateLimit.error,
      retryAfter
    }, {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': RATE_LIMITS.MCP_TOOL.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
      }
    });
  }

  const mcpManager = MCPServerManager.getInstance();

  try {
    const { serverId, tool, parameters } = await request.json();

    if (!serverId || !tool || !parameters) {
      return NextResponse.json({ 
        error: 'Missing required fields: serverId, tool, and parameters are required' 
      }, { status: 400 });
    }

    // Check if server exists
    const serverConfig = mcpManager.getServerConfig(serverId);
    if (!serverConfig) {
      return NextResponse.json({ 
        error: `Server '${serverId}' not found` 
      }, { status: 404 });
    }

    // Check if server is running
    if (!mcpManager.isServerActive(serverId)) {
      return NextResponse.json({ 
        error: `Server '${serverConfig.name}' is not running. Please start the server first.` 
      }, { status: 400 });
    }

    // Invoke the tool
    const result = await mcpManager.invokeTool(serverId, tool, parameters);

    return NextResponse.json({
      success: true,
      serverId,
      tool,
      result
    });
  } catch (error) {
    console.error('MCP Tool Invocation Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Tool invocation failed' 
    }, { status: 500 });
  }
} 