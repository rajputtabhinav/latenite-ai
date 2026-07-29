/**
 * MessageRenderer Component
 * Robust message rendering with markdown support
 * Ensures content is always displayed correctly
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface MessageRendererProps {
  content: string
  isTyping?: boolean
  onTypingComplete?: () => void
  className?: string
  isStreaming?: boolean
}

export default function MessageRenderer({
  content,
  isTyping = false,
  onTypingComplete,
  className = '',
  isStreaming = false
}: MessageRendererProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  // Handle content updates - support both typing animation and streaming
  useEffect(() => {
    // For streaming messages, always sync displayedContent with content immediately
    if (isStreaming) {
      setDisplayedContent(content)
      setIsAnimating(false)
      return
    }

    // For non-streaming messages without typing animation, sync immediately
    if (!isTyping || !content) {
      setDisplayedContent(content)
      setIsAnimating(false)
      return
    }

    // Typing animation for non-streaming messages
    setIsAnimating(true)
    let currentIndex = 0
    const typingSpeed = 10 // Fast typing for better UX

    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.substring(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(interval)
        setIsAnimating(false)
        onTypingComplete?.()
      }
    }, typingSpeed)

    return () => clearInterval(interval)
  }, [content, isTyping, isStreaming, onTypingComplete])

  // Memoize markdown rendering for performance
  const renderedContent = useMemo(() => {
    // Use displayedContent if available, otherwise use content directly
    const textToRender = displayedContent !== '' ? displayedContent : content

    // If no content to render, show nothing
    if (!textToRender || textToRender.trim() === '') {
      return <div className="text-gray-400 text-sm italic">No content</div>
    }

    return (
      <div className={`prose prose-invert max-w-none text-gray-100 ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
          // Code blocks
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const codeContent = String(children).replace(/\n$/, '')
            
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                showLineNumbers={true}
                className="rounded-lg my-2"
                {...props}
              >
                {codeContent}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-gray-800 px-1.5 py-0.5 rounded text-orange-400 text-sm" {...props}>
                {children}
              </code>
            )
          },
          // Paragraphs
          p({ children }) {
            return <p className="mb-2 last:mb-0 text-gray-100 leading-relaxed">{children}</p>
          },
          // Lists
          ul({ children }) {
            return <ul className="list-disc list-inside mb-2 space-y-1 text-gray-100">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-100">{children}</ol>
          },
          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-orange hover:text-orange-400 underline"
              >
                {children}
              </a>
            )
          },
          // Headings
          h1({ children }) {
            return <h1 className="text-xl font-bold mb-2 text-white">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold mb-2 text-white">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mb-1 text-white">{children}</h3>
          },
          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary-orange pl-4 py-2 my-2 bg-gray-800/50 rounded-r">
                {children}
              </blockquote>
            )
          },
          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2">
                <table className="min-w-full border border-gray-700 rounded-lg">
                  {children}
                </table>
              </div>
            )
          },
          th({ children }) {
            return (
              <th className="border border-gray-700 px-3 py-2 bg-gray-800 text-left text-white font-semibold">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="border border-gray-700 px-3 py-2 text-gray-100">
                {children}
              </td>
            )
          },
          // Ensure all text is visible
          text({ children }) {
            return <span className="text-gray-100">{children}</span>
          }
        }}
        >
          {textToRender}
        </ReactMarkdown>
      </div>
    )
  }, [displayedContent, content, className])

  return (
    <div className="message-content text-gray-100">
      {renderedContent}
      {/* Typing cursor - shows during typing animation or streaming */}
      {(isAnimating || isStreaming) && (
        <span className="inline-block w-1.5 h-4 bg-primary-orange animate-pulse ml-0.5" />
      )}
    </div>
  )
}

