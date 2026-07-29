import React, { useRef, useEffect, memo } from 'react'
import { Bot } from 'lucide-react'
import MessageList from '../MessageList'
import CommandProgressIndicator, { CommandProgress } from '../../CommandProgressIndicator'
import ReconnectionBanner from '../../ReconnectionBanner'
import LoadingSpinner from '../../LoadingSpinner'
import { ReconnectProgress } from '../../../lib/ssh-auto-reconnect'
import type { AIMessage, TerminalState } from '../../../types'

interface AgentChatAreaProps {
    messages: AIMessage[]
    isLoading: boolean
    streamingMessageId: string | null
    onInsertCode?: (code: string) => void

    // Reconnection
    isReconnecting: boolean
    reconnectProgress: ReconnectProgress | null
    onCancelReconnect?: () => void

    // Command Progress
    showProgressIndicator?: boolean
    commandProgress?: CommandProgress[]
    currentCommandIndex?: number

    // Terminal
    terminalState?: TerminalState
    onCopy?: (text: string) => Promise<void>
    copiedId?: string | null
    
    // Example button handler
    onSendExample?: (example: string) => void
}

function AgentChatArea({
    messages,
    isLoading,
    streamingMessageId,
    onInsertCode,
    isReconnecting,
    reconnectProgress,
    onCancelReconnect,
    showProgressIndicator = false,
    commandProgress = [],
    currentCommandIndex = 0,
    terminalState,
    onCopy,
    copiedId,
    onSendExample
}: AgentChatAreaProps) {

    return (
        <div className="flex-1 overflow-hidden relative flex flex-col bg-gray-900">
            {/* Reconnection Banner */}
            <ReconnectionBanner
                isReconnecting={isReconnecting}
                progress={reconnectProgress}
                host={terminalState?.currentHost || 'localhost'}
                username={terminalState?.currentUser || 'user'}
                onCancel={() => onCancelReconnect?.()}
            />

            {/* Empty State */}
            {messages.length === 0 && !isLoading && (
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary-orange to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Bot className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            Ready to Assist
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Ask me anything - coding, debugging, system administration, or connect SSH for autonomous terminal operations.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <button 
                                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                                onClick={() => onSendExample?.('Check system health - show uptime, disk space, and memory')}
                            >
                                Example: "Check system health"
                            </button>
                            <button 
                                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                                onClick={() => onSendExample?.('Review my code for best practices and potential issues')}
                            >
                                Example: "Review my code"
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MessageList */}
            {messages.length > 0 && (
                <MessageList
                    messages={messages}
                    onCopy={(content, _) => onCopy?.(content)}
                    onInsertCode={onInsertCode}
                    copiedId={copiedId || null}
                />
            )}

            {/* Command Progress Indicator */}
            {showProgressIndicator && (
                <CommandProgressIndicator
                    commands={commandProgress}
                    currentIndex={currentCommandIndex}
                    totalCommands={commandProgress.length}
                />
            )}

            {/* Loading Spinner Overlay */}
            {isLoading && !streamingMessageId && !showProgressIndicator && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                    <LoadingSpinner />
                </div>
            )}
        </div>
    )
}

// Memoize to prevent unnecessary re-renders
export default memo(AgentChatArea)
