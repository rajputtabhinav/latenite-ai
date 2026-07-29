'use client'

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { Socket } from 'socket.io-client'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { SerializeAddon } from '@xterm/addon-serialize'
import '@xterm/xterm/css/xterm.css'

export interface XTermTerminalRef {
  terminal: any
  write: (data: string) => void
  writeln: (data: string) => void
  clear: () => void
  focus: () => void
  resize: () => void
  getSelection: () => string
  search: (term: string) => boolean
  findNext: (term: string) => boolean
  findPrevious: (term: string) => boolean
  serialize: () => string
}

interface XTermTerminalProps {
  socket?: Socket | null
  onData?: (data: string) => void
  onResize?: (cols: number, rows: number) => void
  onCommandDetected?: (command: string) => void
  className?: string
  style?: React.CSSProperties
}

const EnhancedXTermTerminal = forwardRef<XTermTerminalRef, XTermTerminalProps>(
  ({ socket, onData, onResize, onCommandDetected, className = '', style }, ref) => {
    const terminalContainerRef = useRef<HTMLDivElement>(null)
    const terminal = useRef<any>(null)
    const fitAddon = useRef<any>(null)
    const searchAddon = useRef<any>(null)
    const webLinksAddon = useRef<any>(null)
    const unicode11Addon = useRef<any>(null)
    const serializeAddon = useRef<any>(null)
    
    const [isReady, setIsReady] = useState(false)
    const outputQueue = useRef<string[]>([])
    const initAttempted = useRef(false)
    const socketRef = useRef<Socket | null>(null)
    const onResizeRef = useRef<((cols: number, rows: number) => void) | undefined>(onResize)
    const currentCommandBuffer = useRef<string>('')
    const lastDimensions = useRef({ cols: 0, rows: 0 })
    
    // Keep refs up to date
    socketRef.current = socket || null
    onResizeRef.current = onResize

    useImperativeHandle(ref, () => ({
      terminal: terminal.current,
      write: (data: string) => terminal.current?.write(data),
      writeln: (data: string) => terminal.current?.writeln(data),
      clear: () => terminal.current?.clear(),
      focus: () => terminal.current?.focus(),
      resize: () => {
        if (fitAddon.current && terminal.current) {
          fitAddon.current.fit()
          const dims = { cols: terminal.current.cols, rows: terminal.current.rows }
          onResizeRef.current?.(dims.cols, dims.rows)
        }
      },
      getSelection: () => terminal.current?.getSelection() || '',
      search: (term: string) => searchAddon.current?.findNext(term) || false,
      findNext: (term: string) => searchAddon.current?.findNext(term) || false,
      findPrevious: (term: string) => searchAddon.current?.findPrevious(term) || false,
      serialize: () => serializeAddon.current?.serialize() || ''
    }))

    // Initialize enhanced terminal with all addons
    useEffect(() => {
      if (typeof window === 'undefined') return
      if (!terminalContainerRef.current) return
      if (terminal.current || initAttempted.current) return
      
      initAttempted.current = true
      console.log('🚀 Initializing Enhanced XTerm.js with Cursor-like features...')

      try {
      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 24,  // Very large font for excellent visibility
        fontFamily: '"Cascadia Code", "Fira Code", "SF Mono", "Monaco", monospace',
          theme: {
            background: '#0a0a0a',
            foreground: '#e5e7eb',
            cursor: '#06b6d4',
            selectionBackground: '#374151',
            selectionForeground: '#ffffff',
          },
          cols: 80,
          rows: 24,
          scrollback: 50000,
          convertEol: true,
          allowProposedApi: true,
          rightClickSelectsWord: true,
          macOptionIsMeta: true,
        })

        // Load all addons for enhanced functionality
        const fit = new FitAddon()
        const search = new SearchAddon()
        const webLinks = new WebLinksAddon()
        const unicode11 = new Unicode11Addon()
        const serialize = new SerializeAddon()
        
        term.loadAddon(fit)
        term.loadAddon(search)
        term.loadAddon(webLinks)
        term.loadAddon(unicode11)
        term.loadAddon(serialize)
        
        term.unicode.activeVersion = '11'
        term.open(terminalContainerRef.current)
        
        terminal.current = term
        fitAddon.current = fit
        searchAddon.current = search
        webLinksAddon.current = webLinks
        unicode11Addon.current = unicode11
        serializeAddon.current = serialize

        // Auto-resize function with spam prevention
        const autoResize = () => {
          if (fitAddon.current && term) {
            fitAddon.current.fit()
            const dims = { rows: term.rows, cols: term.cols }
            
            // FIX: Only log and emit if dimensions actually changed
            if (dims.cols !== lastDimensions.current.cols || dims.rows !== lastDimensions.current.rows) {
              console.log(`📐 Auto-resized: ${dims.cols}x${dims.rows}`)
              lastDimensions.current = dims
              
              if (onResizeRef.current) {
                onResizeRef.current(dims.cols, dims.rows)
              }
            }
          }
        }

        // Initial fit with multiple attempts
        setTimeout(() => {
          autoResize()
          setIsReady(true)
          console.log('✅ Enhanced Terminal ready with all addons!')
          
          term.writeln('\x1b[1;96m🔥 Latenite AI Terminal Ready\x1b[0m')
          term.writeln('')
          
          term.focus()
          
          if (outputQueue.current.length > 0) {
            outputQueue.current.forEach(data => term.write(data))
            outputQueue.current = []
          }

          // FIX: Reduced resize attempts to prevent spam
          setTimeout(autoResize, 200)
        }, 50)

        // Enhanced input handler with command detection
        term.onData((data) => {
          onData?.(data)
          
          // Track current command for AI analysis
          if (data === '\r' || data === '\n') {
            // Command submitted
            if (currentCommandBuffer.current.trim() && onCommandDetected) {
              onCommandDetected(currentCommandBuffer.current.trim())
            }
            currentCommandBuffer.current = ''
          } else if (data === '\x7f' || data === '\b') {
            // Backspace
            currentCommandBuffer.current = currentCommandBuffer.current.slice(0, -1)
          } else if (data >= ' ' && data <= '~') {
            // Printable character
            currentCommandBuffer.current += data
          }
          
          const currentSocket = socketRef.current
          if (currentSocket) {
            currentSocket.emit('input', data)
          }
        })

        // Resize event handler
        term.onResize((dims) => {
          if (onResizeRef.current) {
            onResizeRef.current(dims.cols, dims.rows)
          }
        })

        // Keyboard shortcuts (Cursor-like)
        term.attachCustomKeyEventHandler((event) => {
          // Ctrl+Shift+F - Search
          if (event.ctrlKey && event.shiftKey && event.key === 'F') {
            event.preventDefault()
            const searchTerm = prompt('Search terminal output:')
            if (searchTerm && searchAddon.current) {
              searchAddon.current.findNext(searchTerm)
            }
            return false
          }
          
          // Ctrl+Shift+C - Copy (if selection exists)
          if (event.ctrlKey && event.shiftKey && event.key === 'C') {
            const selection = term.getSelection()
            if (selection) {
              navigator.clipboard.writeText(selection)
              console.log('📋 Copied to clipboard')
              return false
            }
          }
          
          return true
        })

        // Window resize with debouncing
        let resizeTimeout: NodeJS.Timeout
        const handleWindowResize = () => {
          clearTimeout(resizeTimeout)
          resizeTimeout = setTimeout(autoResize, 150)
        }

        window.addEventListener('resize', handleWindowResize)

        // ResizeObserver for container changes
        const resizeObserver = new ResizeObserver(() => {
          clearTimeout(resizeTimeout)
          resizeTimeout = setTimeout(autoResize, 150)
        })

        if (terminalContainerRef.current) {
          resizeObserver.observe(terminalContainerRef.current)
        }

        // Cleanup
        return () => {
          console.log('🧹 Cleaning up enhanced terminal')
          window.removeEventListener('resize', handleWindowResize)
          resizeObserver.disconnect()
          clearTimeout(resizeTimeout)
          terminal.current?.dispose()
          fitAddon.current?.dispose()
          searchAddon.current?.dispose()
          terminal.current = null
          fitAddon.current = null
          searchAddon.current = null
          initAttempted.current = false
          setIsReady(false)
        }

      } catch (error) {
        console.error('❌ Enhanced terminal init failed:', error)
        initAttempted.current = false
      }
    }, []) // FIX: Empty dependency - only initialize once on mount

    // Handle socket events
    useEffect(() => {
      if (!socket || !terminal.current) return

      const handleOutput = (data: string) => {
        if (terminal.current && isReady) {
          terminal.current.write(data)
        } else {
          outputQueue.current.push(data)
        }
      }

      const handleReady = () => {
        console.log('✅ SSH shell ready')
        terminal.current?.write('\x1b[92mSSH connection established\x1b[0m\r\n')
        
        setTimeout(() => {
          terminal.current?.focus()
          if (fitAddon.current && terminal.current) {
            fitAddon.current.fit()
            const dims = { rows: terminal.current.rows, cols: terminal.current.cols }
            if (onResizeRef.current) {
              onResizeRef.current(dims.cols, dims.rows)
            }
          }
        }, 200)
      }

      const handleError = (error: any) => {
        console.error('❌ SSH error:', error)
        const msg = typeof error === 'string' ? error : error?.message || 'Unknown error'
        terminal.current?.write(`\x1b[91mError: ${msg}\x1b[0m\r\n`)
      }

      const handleClosed = () => {
        console.log('🔌 SSH closed')
        terminal.current?.write('\x1b[93mSSH connection closed\x1b[0m\r\n')
      }

      socket.on('output', handleOutput)
      socket.on('ready', handleReady)
      socket.on('error', handleError)
      socket.on('shell-closed', handleClosed)

      return () => {
        socket.off('output', handleOutput)
        socket.off('ready', handleReady)
        socket.off('error', handleError)
        socket.off('shell-closed', handleClosed)
      }
    }, [socket, isReady])

    return (
      <div 
        ref={terminalContainerRef}
        className={`xterm-container ${className}`}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
          position: 'relative',
          ...style
        }}
        onClick={() => {
          if (terminal.current) {
            terminal.current.focus()
          }
        }}
      />
    )
  }
)

EnhancedXTermTerminal.displayName = 'EnhancedXTermTerminal'
export default EnhancedXTermTerminal

