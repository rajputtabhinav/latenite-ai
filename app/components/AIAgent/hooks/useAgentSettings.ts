import { useState } from 'react'
import type { MCPServer, ProcessedFile, ConnectionStatus } from '../../../types'

export function useAgentSettings() {
    // Settings
    const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-5')
    const [isMCPEnabled, setIsMCPEnabled] = useState(false)
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
    const [webSearchEnabled, setWebSearchEnabled] = useState(true)
    const [autoReconnectEnabled, setAutoReconnectEnabled] = useState(true)

    // Selection State
    const [selectedTool, setSelectedTool] = useState<string | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string>('All')
    const [mcpServers, setMcpServers] = useState<Record<string, MCPServer>>({})
    const [mcpCategories, setMcpCategories] = useState<string[]>([])

    // Status State
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
    const [mcpStatus, setMcpStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
    const [isProcessingFiles, setIsProcessingFiles] = useState(false)
    const [isDocumentGenerating, setIsDocumentGenerating] = useState(false)
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

    // Data State
    const [uploadedFiles, setUploadedFiles] = useState<ProcessedFile[]>([])
    const [generatedDocument, setGeneratedDocument] = useState('')
    const [activeLongRunningTasks, setActiveLongRunningTasks] = useState<Map<string, any>>(new Map())

    return {
        // Settings
        selectedModel, setSelectedModel,
        isMCPEnabled, setIsMCPEnabled,
        isVoiceEnabled, setIsVoiceEnabled,
        webSearchEnabled, setWebSearchEnabled,
        autoReconnectEnabled, setAutoReconnectEnabled,

        // Selection
        selectedTool, setSelectedTool,
        selectedCategory, setSelectedCategory,
        mcpServers, setMcpServers,
        mcpCategories, setMcpCategories,

        // Status
        connectionStatus, setConnectionStatus,
        mcpStatus, setMcpStatus,
        isProcessingFiles, setIsProcessingFiles,
        isDocumentGenerating, setIsDocumentGenerating,
        streamingMessageId, setStreamingMessageId,

        // Data
        uploadedFiles, setUploadedFiles,
        generatedDocument, setGeneratedDocument,
        activeLongRunningTasks, setActiveLongRunningTasks
    }
}
