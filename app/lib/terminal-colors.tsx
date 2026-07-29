// Terminal Color Support System
'use client'

// Enhanced ANSI color codes mapping with modern vibrant terminal colors
export const ANSI_COLORS = {
  // Reset
  '0': 'text-gray-300',
  
  // Standard text colors (enhanced with vibrant modern palette)
  '30': 'text-gray-900',
  '31': 'text-red-400',
  '32': 'text-emerald-400', 
  '33': 'text-amber-400',
  '34': 'text-blue-400',
  '35': 'text-purple-400',
  '36': 'text-cyan-400',
  '37': 'text-gray-300',
  
  // Bright colors (more vibrant and saturated)
  '90': 'text-gray-500',
  '91': 'text-red-300',
  '92': 'text-green-300',
  '93': 'text-yellow-300',
  '94': 'text-blue-300',
  '95': 'text-purple-300',
  '96': 'text-cyan-300',
  '97': 'text-white',
  
  // Background colors (enhanced)
  '40': 'bg-gray-900',
  '41': 'bg-red-900/30',
  '42': 'bg-emerald-900/30',
  '43': 'bg-amber-900/30',
  '44': 'bg-blue-900/30',
  '45': 'bg-violet-900/30',
  '46': 'bg-cyan-900/30',
  '47': 'bg-gray-700',
  
  // Bright backgrounds
  '100': 'bg-gray-800',
  '101': 'bg-red-800/40',
  '102': 'bg-emerald-800/40',
  '103': 'bg-amber-800/40',
  '104': 'bg-blue-800/40',
  '105': 'bg-violet-800/40',
  '106': 'bg-cyan-800/40',
  '107': 'bg-gray-600',
  
  // Text styles (enhanced)
  '1': 'font-bold',
  '2': 'opacity-70',
  '3': 'italic',
  '4': 'underline decoration-2',
  '5': 'animate-pulse',
  '7': 'bg-white text-black px-1',
  '8': 'opacity-0',
  '9': 'line-through decoration-red-500'
}

export interface ColoredTextSegment {
  text: string
  classes: string[]
}

// Parse ANSI escape sequences and convert to Tailwind classes
export function parseTerminalColors(text: string): ColoredTextSegment[] {
  const segments: ColoredTextSegment[] = []
  let currentClasses: string[] = ['text-cyan-300'] // Default modern terminal color
  
  // Enhanced ANSI escape sequence regex - handles all common variants
  // Matches: \x1b[...m, \e[...m, \x1b[...m and other control sequences
  const ansiRegex = /(?:\x1b|\e|\x1b)\[([0-9;?]*[a-zA-Z])/g
  let lastIndex = 0
  let match
  
  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before the escape sequence
    if (match.index > lastIndex) {
      const textBeforeEscape = text.slice(lastIndex, match.index)
      if (textBeforeEscape) {
        segments.push({
          text: textBeforeEscape,
          classes: [...currentClasses]
        })
      }
    }
    
    // Process the escape sequence - handle all ANSI command types
    const fullSequence = match[1]
    const lastChar = fullSequence.slice(-1)
    
    // Only process 'm' (color/style) sequences for now
    if (lastChar === 'm') {
      const codes = fullSequence.slice(0, -1).split(';').filter(code => code !== '')
      
      if (codes.length === 0 || codes[0] === '0') {
        // Reset to default
        currentClasses = ['text-cyan-300']
      } else {
        // Apply color codes
        codes.forEach(code => {
          if (ANSI_COLORS[code as keyof typeof ANSI_COLORS]) {
            const newClass = ANSI_COLORS[code as keyof typeof ANSI_COLORS]
            
            // Smart class management
            if (newClass.startsWith('text-')) {
              currentClasses = currentClasses.filter(c => !c.startsWith('text-'))
            } else if (newClass.startsWith('bg-')) {
              currentClasses = currentClasses.filter(c => !c.startsWith('bg-'))
            } else if (newClass.startsWith('font-') || newClass === 'italic' || newClass.includes('underline') || newClass.includes('line-through')) {
              // Remove conflicting style classes
              currentClasses = currentClasses.filter(c => 
                !c.startsWith('font-') && 
                c !== 'italic' && 
                !c.includes('underline') && 
                !c.includes('line-through')
              )
            }
            
            currentClasses.push(newClass)
          }
        })
      }
    } else {
      // Handle other ANSI sequences (cursor movement, etc.) - just ignore them for rendering
      console.log(`🎨 Non-color ANSI sequence detected: \\x1b[${fullSequence}`)
    }
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    if (remainingText) {
      segments.push({
        text: remainingText,
        classes: [...currentClasses]
      })
    }
  }
  
  // If no ANSI codes found, return the whole text with enhanced default styling
  if (segments.length === 0) {
    segments.push({
      text: text,
      classes: ['text-cyan-300']
    })
  }
  
  return segments
}

// Enhanced color support for different terminal contexts
export function getContextualColors(text: string, context: 'command' | 'output' | 'error' | 'success' | 'warning'): string {
  const baseClasses = parseTerminalColors(text)
    .map(segment => segment.classes.join(' '))
    .join(' ')
  
  // Add contextual coloring if no explicit colors
  if (!text.includes('\x1b[') && !baseClasses.includes('text-')) {
    switch (context) {
      case 'command':
        return 'text-cyan-300'
      case 'error':
        return 'text-red-400'
      case 'success':
        return 'text-green-400'
      case 'warning':
        return 'text-yellow-400'
      default:
        return 'text-green-400'
    }
  }
  
  return baseClasses
}

// Strip non-printable control characters except ANSI sequences
export function cleanTerminalOutput(text: string): string {
  // Remove null bytes, backspaces, and other problematic control chars
  // but preserve ANSI escape sequences
  return text
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/\x08/g, '') // Remove backspace chars that cause issues
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n') // Convert remaining \r to \n
}

// Enhanced terminal output processing with intelligent pattern recognition
export function enhanceTerminalOutput(text: string): ColoredTextSegment[] {
  // Clean the text first
  let processedText = cleanTerminalOutput(text)
  
  // Enhanced pattern recognition for modern colorful terminal output
  
  // IP addresses and ports (bright cyan)
  processedText = processedText.replace(
    /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?)/g,
    '\x1b[96m\x1b[1m$1\x1b[0m'
  )
  
  // File paths and directories (bright blue)
  processedText = processedText.replace(
    /(\/[^\s\]]+|~\/[^\s\]]+|\.\/[^\s\]]+|\.\.\/[^\s\]]+)/g,
    '\x1b[94m\x1b[1m$1\x1b[0m'
  )
  
  // URLs and domains (bright blue with underline)
  processedText = processedText.replace(
    /(https?:\/\/[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '\x1b[94m\x1b[4m\x1b[1m$1\x1b[0m'
  )
  
  // File sizes and memory usage (bright magenta)
  processedText = processedText.replace(
    /(\d+(?:\.\d+)?[KMGT]?B|\d+(?:\.\d+)?[KMGT])/g,
    '\x1b[95m\x1b[1m$1\x1b[0m'
  )
  
  // Percentages and numbers (bright yellow)
  processedText = processedText.replace(
    /(\d+(?:\.\d+)?%|\d+\.\d+)/g,
    '\x1b[93m\x1b[1m$1\x1b[0m'
  )
  
  // Success patterns (bright green with bold)
  processedText = processedText.replace(
    /(✅|SUCCESS|OK|DONE|✓|PASS|PASSED|COMPLETE|CONNECTED|READY)/gi,
    '\x1b[92m\x1b[1m$1\x1b[0m'
  )
  
  // Error patterns (bright red with bold)
  processedText = processedText.replace(
    /(❌|ERROR|FAILED|FAIL|✗|DENIED|REFUSED|TIMEOUT|FATAL|CRITICAL)/gi,
    '\x1b[91m\x1b[1m$1\x1b[0m'
  )
  
  // Warning patterns (bright yellow with bold)
  processedText = processedText.replace(
    /(⚠️|WARNING|WARN|CAUTION|DEPRECATED|NOTICE|ALERT)/gi,
    '\x1b[93m\x1b[1m$1\x1b[0m'
  )
  
  // Info patterns (bright cyan)
  processedText = processedText.replace(
    /(ℹ️|INFO|NOTE|TIP|HINT|DEBUG)/gi,
    '\x1b[96m\x1b[1m$1\x1b[0m'
  )
  
  // Process names and PIDs (bright magenta)
  processedText = processedText.replace(
    /(\b[a-zA-Z0-9_-]+\[\d+\]|\bPID:\s*\d+)/g,
    '\x1b[95m\x1b[1m$1\x1b[0m'
  )
  
  // Commands (lines starting with $ or #) - different colors for user vs root
  processedText = processedText.replace(
    /^(\$\s+.+)$/gm,
    '\x1b[96m\x1b[1m$1\x1b[0m'
  )
  
  processedText = processedText.replace(
    /^(#\s+.+)$/gm,
    '\x1b[91m\x1b[1m$1\x1b[0m'
  )
  
  // Time stamps (dim gray)
  processedText = processedText.replace(
    /(\d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/g,
    '\x1b[90m$1\x1b[0m'
  )
  
  // Special symbols and indicators (bright yellow)
  processedText = processedText.replace(
    /(→|←|↑|↓|⚡|🔥|🚀|💡|⭐|🎯|🔍|🔐|🌐|📋|🔌)/g,
    '\x1b[93m\x1b[1m$1\x1b[0m'
  )
  
  // Brackets and parentheses content (dim)
  processedText = processedText.replace(
    /(\[[^\]]+\]|\([^)]+\))/g,
    '\x1b[90m$1\x1b[0m'
  )
  
  // Email addresses (cyan)
  processedText = processedText.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '\x1b[96m$1\x1b[0m'
  )
  
  // Version numbers (purple)
  processedText = processedText.replace(
    /(v?\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)/g,
    '\x1b[95m$1\x1b[0m'
  )
  
  // Environment variables (bright green)
  processedText = processedText.replace(
    /(\$[A-Z_][A-Z0-9_]*)/g,
    '\x1b[92m$1\x1b[0m'
  )
  
  // File extensions (different colors for different types)
  processedText = processedText.replace(
    /(\.[a-zA-Z0-9]+)(\s|$)/g,
    '\x1b[94m$1\x1b[0m$2'
  )
  
  // Apply additional syntax highlighting for common commands and outputs
  processedText = addSyntaxHighlighting(processedText)
  
  return parseTerminalColors(processedText)
}

// Enhanced component to render colored terminal text with modern styling
export function TerminalColoredText({ text, context = 'output' }: { 
  text: string, 
  context?: 'command' | 'output' | 'error' | 'success' | 'warning' 
}) {
  // Debug ANSI sequences in problematic text
  if (text.includes('\x1b') && text.length > 50) {
    console.log('🎨 Processing ANSI text:', text.substring(0, 100) + '...')
  }
  
  const segments = enhanceTerminalOutput(text)
  
  // Add line-specific styling based on content
  const lineClasses = ['transition-all duration-200 hover:bg-gray-800/20']
  
  // Add hover effects for interactive elements
  if (text.includes('http') || text.includes('www.')) {
    lineClasses.push('hover:bg-blue-900/30 cursor-pointer')
  }
  
  // Add special styling for different line types with enhanced visual cues
  if (text.startsWith('$') || text.startsWith('#')) {
    lineClasses.push('border-l-4 border-cyan-400/70 pl-3 ml-2 bg-cyan-900/10 rounded-r')
  } else if (text.includes('ERROR') || text.includes('FAIL') || text.includes('❌')) {
    lineClasses.push('border-l-4 border-red-400/70 pl-3 ml-2 bg-red-900/15 rounded-r animate-pulse')
  } else if (text.includes('SUCCESS') || text.includes('DONE') || text.includes('✅')) {
    lineClasses.push('border-l-4 border-emerald-400/70 pl-3 ml-2 bg-emerald-900/15 rounded-r')
  } else if (text.includes('WARNING') || text.includes('WARN') || text.includes('⚠️')) {
    lineClasses.push('border-l-4 border-amber-400/70 pl-3 ml-2 bg-amber-900/15 rounded-r')
  } else if (text.includes('INFO') || text.includes('ℹ️') || text.includes('🔍')) {
    lineClasses.push('border-l-4 border-blue-400/70 pl-3 ml-2 bg-blue-900/15 rounded-r')
  } else if (text.includes('🔐') || text.includes('🔌') || text.includes('🌐')) {
    lineClasses.push('border-l-4 border-purple-400/70 pl-3 ml-2 bg-purple-900/15 rounded-r')
  }
  
  return (
    <div className={`leading-relaxed terminal-line px-2 py-1.5 ${lineClasses.join(' ')}`}>
      {segments.map((segment, index) => (
        <span 
          key={index} 
          className={`${segment.classes.join(' ')} transition-all duration-200`}
        >
          {segment.text}
        </span>
      ))}
    </div>
  )
}

// Enhanced syntax highlighting for common file types and command outputs
export function addSyntaxHighlighting(text: string): string {
  let highlighted = text
  
  // JSON syntax highlighting (enhanced)
  highlighted = highlighted.replace(
    /("([^"\\]|\\.)*")/g,
    '\x1b[93m\x1b[1m$1\x1b[0m'
  )
  
  highlighted = highlighted.replace(
    /(\{|\}|\[|\])/g,
    '\x1b[96m\x1b[1m$1\x1b[0m'
  )
  
  // Configuration values (enhanced colors)
  highlighted = highlighted.replace(
    /(true|false|null|undefined|yes|no|on|off|enabled|disabled)/gi,
    '\x1b[95m\x1b[1m$1\x1b[0m'
  )
  
  // Numbers in output (bright cyan)
  highlighted = highlighted.replace(
    /\b(\d+)\b/g,
    '\x1b[96m$1\x1b[0m'
  )
  
  // Command flags and options (bright yellow)
  highlighted = highlighted.replace(
    /(--[a-zA-Z-]+|-[a-zA-Z])/g,
    '\x1b[93m\x1b[1m$1\x1b[0m'
  )
  
  // File permissions (bright green)
  highlighted = highlighted.replace(
    /([drwx-]{10})/g,
    '\x1b[92m$1\x1b[0m'
  )
  
  // User and group names in ls output (purple)
  highlighted = highlighted.replace(
    /(\b[a-zA-Z0-9_-]+\s+[a-zA-Z0-9_-]+\s+)/g,
    '\x1b[95m$1\x1b[0m'
  )
  
  // Docker and container related (cyan)
  highlighted = highlighted.replace(
    /(docker|container|image|volume|network|CONTAINER|IMAGE|STATUS|PORTS)/gi,
    '\x1b[96m\x1b[1m$1\x1b[0m'
  )
  
  // Git related commands and output (bright magenta)
  highlighted = highlighted.replace(
    /(git|branch|commit|merge|pull|push|origin|master|main|HEAD)/gi,
    '\x1b[95m\x1b[1m$1\x1b[0m'
  )
  
  // Package managers (bright blue)
  highlighted = highlighted.replace(
    /(npm|yarn|pip|apt|yum|brew|composer|cargo)/gi,
    '\x1b[94m\x1b[1m$1\x1b[0m'
  )
  
  return highlighted
}
