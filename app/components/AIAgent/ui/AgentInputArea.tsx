import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Paperclip, Send, Square, Mic, MicOff, Globe,
    ChevronDown, Plus, Settings, Database, Brain
} from 'lucide-react'
import FileUploadPreview from '../../FileUploadPreview'
import { MCPServer, ProcessedFile } from '../../../types'

interface AgentInputAreaProps {
    input: string
    setInput: React.Dispatch<React.SetStateAction<string>>
    isLoading: boolean
    onSend: () => Promise<void>
    onStop: () => void

    // File Upload
    uploadedFiles: ProcessedFile[]
    onRemoveFile: (fileId: string) => void
    isProcessingFiles: boolean
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void

    // Tools
    showToolsDropdown: boolean
    setShowToolsDropdown: (show: boolean) => void
    onOpenSettings: () => void
    selectedTool: string | null
    setSelectedTool: (tool: string | null) => void
    mcpServers: Record<string, MCPServer>

    // Models
    selectedModel: string
    setSelectedModel: (model: string) => void
    showModelsDropdown: boolean
    setShowModelsDropdown: (show: boolean) => void
    allModels: any[]

    // Toggles
    isVoiceEnabled: boolean
    onToggleVoice: () => void
    webSearchEnabled: boolean
    setWebSearchEnabled: (enabled: boolean) => void
    showWebSearchIndicator: boolean

    // Status
    connectionStatus: string
    sshSocket: any
    sessionId: string | undefined

    // Refs
    inputRef: React.RefObject<HTMLTextAreaElement>
}

export default function AgentInputArea({
    input,
    setInput,
    isLoading,
    onSend,
    onStop,
    uploadedFiles,
    onRemoveFile,
    isProcessingFiles,
    onFileUpload,
    showToolsDropdown,
    setShowToolsDropdown,
    onOpenSettings,
    selectedTool,
    setSelectedTool,
    mcpServers,
    selectedModel,
    setSelectedModel,
    showModelsDropdown,
    setShowModelsDropdown,
    allModels,
    isVoiceEnabled,
    onToggleVoice,
    webSearchEnabled,
    setWebSearchEnabled,
    showWebSearchIndicator,
    connectionStatus,
    sshSocket,
    sessionId,
    inputRef
}: AgentInputAreaProps) {
    // const inputRef = useRef<HTMLTextAreaElement>(null) // Removed internal ref
    const fileInputRef = useRef<HTMLInputElement>(null)
    const toolsDropdownRef = useRef<HTMLDivElement>(null)
    const modelsDropdownRef = useRef<HTMLDivElement>(null)

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'
            inputRef.current.style.height = inputRef.current.scrollHeight + 'px'
        }
    }, [input])

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (input.trim() && !isLoading) {
                onSend()
            }
        }
    }

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target as Node)) {
                setShowToolsDropdown(false)
            }
            if (modelsDropdownRef.current && !modelsDropdownRef.current.contains(event.target as Node)) {
                setShowModelsDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [setShowToolsDropdown, setShowModelsDropdown])

    const getAvailableTools = () => {
        return Object.values(mcpServers).flatMap(server =>
            server.tools.map(tool => ({
                ...tool,
                serverId: server.id,
                category: server.config?.category || 'General'
            }))
        )
    }

    const getServerIcon = (serverId: string, category?: string) => {
        if (category === 'Database') return <Database className="w-3 h-3" />
        // Add more icons based on category
        switch (category) {
            case 'AI': return <Brain className="w-3 h-3" />
            default: return <Database className="w-3 h-3" />
        }
    }

    const getCurrentModel = () => {
        return allModels.find(m => m.id === selectedModel) || allModels[0]
    }

    return (
        <div className="p-3 border-t border-gray-700/50 bg-gray-900">
            <div className="relative">
                {/* File Upload Preview */}
                <FileUploadPreview
                    files={uploadedFiles}
                    onRemove={(fileId) => onRemoveFile(fileId)}
                    onClearAll={() => uploadedFiles.forEach(f => onRemoveFile(f.id))}
                />

                <div className="flex items-center space-x-1 bg-gray-800 rounded-xl border border-gray-600 transition-colors">
                    {/* Tools Button with Dropdown */}
                    <div className="relative" ref={toolsDropdownRef}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                            className="p-2 text-gray-400 hover:text-white transition-colors hamburger-button h-10 w-10 flex items-center justify-center"
                            title="Tools"
                        >
                            <Plus className="w-4 h-4" />
                        </motion.button>

                        {/* Tools Dropdown */}
                        <AnimatePresence>
                            {showToolsDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full left-0 mb-2 w-60 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50"
                                >
                                    <div className="p-2">
                                        <div className="flex items-center justify-between px-2 py-1 mb-2">
                                            <span className="text-xs font-medium text-gray-300">Tools</span>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={onOpenSettings}
                                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                            >
                                                <Settings className="w-3 h-3" />
                                            </motion.button>
                                        </div>

                                        {/* File Upload Option */}
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                fileInputRef.current?.click()
                                                setShowToolsDropdown(false)
                                            }}
                                            disabled={isProcessingFiles}
                                            className="w-full text-left px-2 py-2 rounded-md hover:bg-gray-700 transition-colors group mb-2 border-b border-gray-700 disabled:opacity-50"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <div className="text-gray-400 group-hover:text-primary-orange text-lg">📎</div>
                                                <div className="flex-1">
                                                    <div className="text-xs font-medium text-white">
                                                        Upload Files {isProcessingFiles && '(Processing...)'}
                                                    </div>
                                                    <div className="text-xs text-gray-400">Images, PDFs, Excel, Docs</div>
                                                </div>
                                            </div>
                                        </motion.button>

                                        {getAvailableTools().length === 0 ? (
                                            <div className="px-2 py-3 text-center">
                                                <p className="text-xs text-gray-400">No MCP tools available</p>
                                                <p className="text-xs text-gray-500 mt-1">Enable MCP servers</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {getAvailableTools().map((tool, idx) => (
                                                    <motion.button
                                                        key={`${tool.id}-${idx}`}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => {
                                                            setSelectedTool(tool.id)
                                                            setShowToolsDropdown(false)
                                                            setInput(`Using ${tool.name}: `)
                                                            setTimeout(() => inputRef.current?.focus(), 100)
                                                        }}
                                                        className="w-full text-left px-2 py-2 rounded-md hover:bg-gray-700 transition-colors group"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <div className="text-gray-400 group-hover:text-white">
                                                                {getServerIcon(tool.id, tool.category)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-medium text-white truncate">{tool.name}</div>
                                                                <div className="text-xs text-gray-400 truncate">{tool.description}</div>
                                                            </div>
                                                            <div className="w-2 h-2 bg-green-400 rounded-full opacity-80" />
                                                        </div>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Hidden File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.log,.json"
                        onChange={onFileUpload}
                        className="hidden"
                    />

                    {/* Input Field */}
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            sshSocket && sessionId
                                ? "Describe your task - I'll code, debug, deploy, or manage it autonomously..."
                                : "Ask me anything - coding, architecture, debugging, best practices..."
                        }
                        className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 resize-none border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none py-3 px-2 min-h-[16px] max-h-24"
                        rows={1}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    />

                    {/* Model Selector */}
                    <div className="relative" ref={modelsDropdownRef}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowModelsDropdown(!showModelsDropdown)}
                            className="flex items-center space-x-1 px-2 py-2 text-gray-400 hover:text-white transition-colors h-10"
                            title="AI Models"
                        >
                            <Brain className="w-3 h-3" />
                            <span className="text-xs font-medium truncate max-w-16">
                                {getCurrentModel().name.split(' ')[0]}
                            </span>
                            <ChevronDown className="w-3 h-3" />
                        </motion.button>

                        {/* Models Dropdown */}
                        <AnimatePresence>
                            {showModelsDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full right-0 mb-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto"
                                >
                                    <div className="p-2">
                                        <div className="px-2 py-1 mb-2">
                                            <span className="text-xs font-medium text-gray-300">Claude Sonnet Models</span>
                                        </div>
                                        {allModels.map((model) => (
                                            <button
                                                key={model.id}
                                                onClick={() => {
                                                    setSelectedModel(model.id)
                                                    setShowModelsDropdown(false)
                                                }}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${selectedModel === model.id
                                                    ? 'bg-orange-500/20 border border-orange-400/30'
                                                    : 'hover:bg-white/5 border border-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${selectedModel === model.id ? 'bg-orange-400' : 'bg-gray-500'}`} />
                                                    <div className="text-left">
                                                        <div className="text-sm font-medium text-white">{model.name}</div>
                                                        <div className="text-xs text-gray-400">{model.description}</div>
                                                    </div>
                                                </div>
                                                {selectedModel === model.id && (
                                                    <div className="text-orange-400">✓</div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Voice Input */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onToggleVoice}
                        className={`p-2 transition-colors h-10 w-10 flex items-center justify-center ${isVoiceEnabled ? 'text-primary-orange' : 'text-gray-400 hover:text-white'
                            }`}
                        title={isVoiceEnabled ? 'Voice: ON' : 'Voice: OFF'}
                    >
                        {isVoiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </motion.button>

                    {/* Web Search Toggle */}
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                            className={`p-2 transition-colors h-10 w-10 flex items-center justify-center relative ${webSearchEnabled ? 'text-primary-orange' : 'text-gray-400 hover:text-white'
                                }`}
                            title={webSearchEnabled ? 'Web Search: ON' : 'Web Search: OFF'}
                        >
                            <Globe className="w-4 h-4" />
                            {webSearchEnabled && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            )}
                        </motion.button>

                        <AnimatePresence>
                            {showWebSearchIndicator && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-primary-orange/30 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50"
                                >
                                    <div className="text-xs text-white flex items-center space-x-2">
                                        <Globe className="w-3 h-3 text-primary-orange" />
                                        <span>{webSearchEnabled ? '🌐 Web search enabled' : 'Web search disabled'}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Send/Stop Button */}
                    {(input.trim() || isLoading) && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => isLoading ? onStop() : onSend()}
                            disabled={!input.trim() && !isLoading}
                            className={`p-2 text-white rounded-lg transition-all duration-200 mr-1 h-10 w-10 flex items-center justify-center ${isLoading
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-primary-orange hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed'
                                }`}
                        >
                            {isLoading ? <Square className="w-4 h-4 fill-current" /> : <Send className="w-4 h-4" />}
                        </motion.button>
                    )}
                </div>

                {/* Selected Tool Indicator */}
                {selectedTool && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-7 left-0 flex items-center space-x-2 text-xs"
                    >
                        <div className="bg-primary-orange/20 text-primary-orange px-2 py-1 rounded-md border border-primary-orange/30 text-xs">
                            Using: {mcpServers[selectedTool]?.config?.name || selectedTool}
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedTool(null)}
                            className="text-gray-400 hover:text-white text-xs"
                        >
                            ✕
                        </motion.button>
                    </motion.div>
                )}

                {/* Admin Status Indicator */}
                {connectionStatus === 'streaming' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-7 left-0 flex items-center space-x-2 text-xs text-gray-400"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-1.5 h-1.5 bg-green-400 rounded-full"
                        />
                        <span className="text-xs">✈️ Autonomous Processing...</span>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onStop}
                            className="text-red-400 hover:text-red-300 font-medium text-xs"
                        >
                            Stop
                        </motion.button>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
