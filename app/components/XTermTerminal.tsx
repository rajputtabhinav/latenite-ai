'use client'

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { Socket } from 'socket.io-client'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

export interface XTermTerminalRef {
  terminal: any
  write: (data: string) => void
  writeln: (data: string) => void
  clear: () => void
  focus: () => void
  resize: () => void
  getSelection: () => string
}

interface XTermTerminalProps {
  socket?: Socket | null
  onData?: (data: string) => void
  onResize?: (cols: number, rows: number) => void
  className?: string
  style?: React.CSSProperties
  fontSize?: number
  fontFamily?: string
}

const XTermTerminal = forwardRef<XTermTerminalRef, XTermTerminalProps>(
  ({ socket, onData, onResize, className = '', style, fontSize = 16, fontFamily = '"Cascadia Code", "JetBrains Mono", "Fira Code", "SF Mono", consolas, monospace' }, ref) => {
    const terminalContainerRef = useRef<HTMLDivElement>(null)
    const terminal = useRef<any>(null)
    const fitAddon = useRef<any>(null)
    const [isReady, setIsReady] = useState(false)
    const outputQueue = useRef<string[]>([])
    const initAttempted = useRef(false)
    const socketRef = useRef<Socket | null>(null)
    const onResizeRef = useRef<((cols: number, rows: number) => void) | undefined>(onResize)
    const lastDimensions = useRef<{ cols: number; rows: number }>({ cols: 0, rows: 0 })
    const isResizing = useRef(false)
    
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
        if (fitAddon.current && terminal.current && !isResizing.current) {
          isResizing.current = true
          fitAddon.current.fit()
          const dims = { cols: terminal.current.cols, rows: terminal.current.rows }
          
          // Only trigger callback if dimensions changed
          if (dims.cols !== lastDimensions.current.cols || dims.rows !== lastDimensions.current.rows) {
            console.log(`📐 Manual resize: ${dims.cols}x${dims.rows}`)
            lastDimensions.current = dims
            onResizeRef.current?.(dims.cols, dims.rows)
          }
          
          setTimeout(() => {
            isResizing.current = false
          }, 100)
        }
      },
      getSelection: () => terminal.current?.getSelection() || ''
    }))

    // Initialize terminal once when container mounts
    useEffect(() => {
      if (typeof window === 'undefined') return
      if (!terminalContainerRef.current) return
      if (terminal.current || initAttempted.current) return
      
      initAttempted.current = true
      console.log('🚀 Initializing XTerm.js with auto-resize...')

      try {
        const term = new Terminal({
          cursorBlink: true,
          cursorStyle: 'block',
          fontSize: fontSize,
          fontFamily: fontFamily,
          fontWeight: 'normal',
          letterSpacing: 0.5,
          lineHeight: 1.2,
          theme: {
            background: '#000000',
            foreground: '#f8fafc',
            cursor: '#06d6a0',
            cursorAccent: '#000000',
            selectionBackground: '#164e63',
            selectionForeground: '#ffffff',
            black: '#1e293b',
            red: '#ef4444',
            green: '#10b981',
            yellow: '#f59e0b',
            blue: '#3b82f6',
            magenta: '#ec4899',
            cyan: '#06b6d4',
            white: '#f1f5f9',
            brightBlack: '#475569',
            brightRed: '#f87171',
            brightGreen: '#34d399',
            brightYellow: '#fbbf24',
            brightBlue: '#60a5fa',
            brightMagenta: '#f472b6',
            brightCyan: '#22d3ee',
            brightWhite: '#ffffff'
          },
          cols: 80,
          rows: 24,
          scrollback: 50000,
          convertEol: true,
          allowTransparency: true,
          smoothScrollDuration: 120,
          fastScrollModifier: 'alt',
          fastScrollSensitivity: 5,
        })

        const fit = new FitAddon()
        term.loadAddon(fit)
        term.open(terminalContainerRef.current)
        
        terminal.current = term
        fitAddon.current = fit

        // Auto-resize function that sends dimensions to SSH server (with loop prevention)
        const autoResize = () => {
          if (isResizing.current || !fitAddon.current || !term) return
          
          isResizing.current = true
          
          try {
            fitAddon.current.fit()
            const dims = { rows: term.rows, cols: term.cols }
            
            // Only trigger callback if dimensions actually changed
            if (dims.cols !== lastDimensions.current.cols || dims.rows !== lastDimensions.current.rows) {
              console.log(`📐 Auto-resized terminal: ${dims.cols} cols x ${dims.rows} rows`)
              lastDimensions.current = dims
              
              // Send to SSH server
              if (onResizeRef.current) {
                onResizeRef.current(dims.cols, dims.rows)
                console.log(`📤 Sent dimensions to SSH server: ${dims.cols}x${dims.rows}`)
              }
            }
          } finally {
            // Release the lock after a short delay
            setTimeout(() => {
              isResizing.current = false
            }, 100)
          }
        }

        // Initial fit with reduced attempts
        setTimeout(() => {
          autoResize()
          setIsReady(true)
          console.log('✅ Terminal ready!')
          
          term.writeln('\x1b[1;96m🔥 Latenite AI Terminal Ready\x1b[0m')
          term.writeln('')
          
          term.focus()
          console.log('✅ Terminal focused')
          
          if (outputQueue.current.length > 0) {
            console.log(`📦 Processing ${outputQueue.current.length} queued chunks`)
            outputQueue.current.forEach(data => term.write(data))
            outputQueue.current = []
          }

          // Single delayed resize to ensure proper sizing after render
          setTimeout(autoResize, 200)
        }, 50)

        // Handle terminal data input (reduced logging)
        term.onData((data) => {
          // Only log special keys and commands, not every character
          const specialKeys = ['\r', '\n', '\x1b', '\t', '\x7f']
          const shouldLog = specialKeys.some(key => data.includes(key)) || data.length > 1
          if (shouldLog) {
            console.log('⌨️ Input:', data.replace(/\r/g, '\\r').replace(/\n/g, '\\n'))
          }
          onData?.(data)
          
          const currentSocket = socketRef.current
          if (currentSocket) {
            // Convert \r (Enter key from XTerm) to \n for SSH
            // XTerm sends \r for Enter, but SSH expects \n
            // The SSH server will echo it back properly
            let processedData = data
            if (data === '\r') {
              processedData = '\n'
              console.log('🔄 Converted Enter key: \\r → \\n')
            }
            currentSocket.emit('input', processedData)
          }
        })

        // Handle terminal resize events from XTerm (prevent duplicate events)
        term.onResize((dims) => {
          // Only process if dimensions actually changed
          if (dims.cols !== lastDimensions.current.cols || dims.rows !== lastDimensions.current.rows) {
            console.log(`🔄 XTerm resized: ${dims.cols}x${dims.rows}`)
            lastDimensions.current = dims
            
            if (onResizeRef.current) {
              onResizeRef.current(dims.cols, dims.rows)
              console.log(`📤 Sent resize to SSH: ${dims.cols}x${dims.rows}`)
            }
          }
        })

        // Window resize listener with improved debouncing
        let resizeTimeout: NodeJS.Timeout
        const handleWindowResize = () => {
          clearTimeout(resizeTimeout)
          resizeTimeout = setTimeout(autoResize, 200)
        }

        window.addEventListener('resize', handleWindowResize)

        // ResizeObserver for container dimension changes (with separate debounce)
        let containerResizeTimeout: NodeJS.Timeout
        const resizeObserver = new ResizeObserver(() => {
          clearTimeout(containerResizeTimeout)
          containerResizeTimeout = setTimeout(autoResize, 200)
        })

        if (terminalContainerRef.current) {
          resizeObserver.observe(terminalContainerRef.current)
        }

        // Cleanup
        return () => {
          console.log('🧹 Cleaning up terminal')
          window.removeEventListener('resize', handleWindowResize)
          resizeObserver.disconnect()
          clearTimeout(resizeTimeout)
          clearTimeout(containerResizeTimeout)
          terminal.current?.dispose()
          fitAddon.current?.dispose()
          terminal.current = null
          fitAddon.current = null
          initAttempted.current = false
          setIsReady(false)
        }

      } catch (error) {
        console.error('❌ Terminal init failed:', error)
        initAttempted.current = false
      }
    }, [])

    // Handle font size changes dynamically
    useEffect(() => {
      if (terminal.current && isReady) {
        console.log(`🎨 Updating terminal font size to ${fontSize}px`)
        terminal.current.options.fontSize = fontSize
        terminal.current.options.fontFamily = fontFamily
        
        // Trigger terminal refresh to apply new font settings (without loop)
        if (fitAddon.current && !isResizing.current) {
          isResizing.current = true
          setTimeout(() => {
            if (fitAddon.current && terminal.current) {
              fitAddon.current.fit()
              const dims = { cols: terminal.current.cols, rows: terminal.current.rows }
              
              // Only log and notify if dimensions changed
              if (dims.cols !== lastDimensions.current.cols || dims.rows !== lastDimensions.current.rows) {
                console.log(`📐 Re-fitted terminal after font change: ${dims.cols}x${dims.rows}`)
                lastDimensions.current = dims
              }
            }
            isResizing.current = false
          }, 100)
        }
      }
    }, [fontSize, fontFamily, isReady])

    // Handle socket events
    useEffect(() => {
      if (!socket || !terminal.current) return

      console.log('🔌 Setting up socket handlers')

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
        
        // Re-fit and send dimensions after SSH connects (without triggering resize loop)
        setTimeout(() => {
          terminal.current?.focus()
          if (fitAddon.current && terminal.current && !isResizing.current) {
            fitAddon.current.fit()
            const dims = { rows: terminal.current.rows, cols: terminal.current.cols }
            
            // Only send if dimensions are different
            if (dims.cols !== lastDimensions.current.cols || dims.rows !== lastDimensions.current.rows) {
              console.log(`✅ Re-fitted after SSH: ${dims.cols}x${dims.rows}`)
              lastDimensions.current = dims
              
              // Send current dimensions to SSH server
              if (onResizeRef.current) {
                onResizeRef.current(dims.cols, dims.rows)
                console.log(`📤 Sent initial size to SSH: ${dims.cols}x${dims.rows}`)
              }
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

XTermTerminal.displayName = 'XTermTerminal'
export default XTermTerminal
