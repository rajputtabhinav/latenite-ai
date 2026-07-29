import { useState } from 'react'
import { useAgentUI } from './useAgentUI'
import { useAgentSettings } from './useAgentSettings'

export function useAgentState() {
    const ui = useAgentUI()
    const settings = useAgentSettings()

    // UI State (from useAgentUI)
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    return {
        // UI Local State
        input, setInput,
        isLoading, setIsLoading,

        // UI Hook
        width: ui.width, setWidth: ui.setWidth,
        isResizing: ui.isResizing, setIsResizing: ui.setIsResizing,
        showModelSelector: ui.showModelSelector, setShowModelSelector: ui.setShowModelSelector,
        showHamburgerMenu: ui.showHamburgerMenu, setShowHamburgerMenu: ui.setShowHamburgerMenu,
        showToolsDropdown: ui.showToolsDropdown, setShowToolsDropdown: ui.setShowToolsDropdown,
        showModelsDropdown: ui.showModelsDropdown, setShowModelsDropdown: ui.setShowModelsDropdown,
        showDocumentPreview: ui.showDocumentPreview, setShowDocumentPreview: ui.setShowDocumentPreview,
        showTaskTimeline: ui.showTaskTimeline, setShowTaskTimeline: ui.setShowTaskTimeline,
        taskTimelineEvents: ui.taskTimelineEvents, setTaskTimelineEvents: ui.setTaskTimelineEvents,

        // Settings Hook
        selectedModel: settings.selectedModel, setSelectedModel: settings.setSelectedModel,
        isMCPEnabled: settings.isMCPEnabled, setIsMCPEnabled: settings.setIsMCPEnabled,
        isVoiceEnabled: settings.isVoiceEnabled, setIsVoiceEnabled: settings.setIsVoiceEnabled,
        webSearchEnabled: settings.webSearchEnabled, setWebSearchEnabled: settings.setWebSearchEnabled,
        autoReconnectEnabled: settings.autoReconnectEnabled, setAutoReconnectEnabled: settings.setAutoReconnectEnabled,

        // Selection
        selectedTool: settings.selectedTool, setSelectedTool: settings.setSelectedTool,
        selectedCategory: settings.selectedCategory, setSelectedCategory: settings.setSelectedCategory,
        mcpServers: settings.mcpServers, setMcpServers: settings.setMcpServers,
        mcpCategories: settings.mcpCategories, setMcpCategories: settings.setMcpCategories,

        // Status
        connectionStatus: settings.connectionStatus, setConnectionStatus: settings.setConnectionStatus,
        mcpStatus: settings.mcpStatus, setMcpStatus: settings.setMcpStatus,
        isProcessingFiles: settings.isProcessingFiles, setIsProcessingFiles: settings.setIsProcessingFiles,
        isDocumentGenerating: settings.isDocumentGenerating, setIsDocumentGenerating: settings.setIsDocumentGenerating,
        streamingMessageId: settings.streamingMessageId, setStreamingMessageId: settings.setStreamingMessageId,

        // Data
        uploadedFiles: settings.uploadedFiles, setUploadedFiles: settings.setUploadedFiles,
        generatedDocument: settings.generatedDocument, setGeneratedDocument: settings.setGeneratedDocument,
        activeLongRunningTasks: settings.activeLongRunningTasks, setActiveLongRunningTasks: settings.setActiveLongRunningTasks
    }
}
