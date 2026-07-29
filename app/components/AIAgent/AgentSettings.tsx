'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Settings, 
  Brain, 
  Server, 
  Power, 
  PowerOff,
  RefreshCw,
  Trash2,
  Database,
  Globe,
  Terminal,
  FileText,
  Code
} from 'lucide-react'
interface Model {
  id: string
  name: string
  description: string
  provider: string
}

interface MCPServerForSettings {
  running: boolean
  status: string
  name?: string
  description?: string
  category?: string
  tools?: Array<{name: string; description: string} | string>
  config?: {
    name?: string
    description?: string
    category?: string
    tools?: Array<{name: string; description: string} | string>
    command?: string
    args?: string[]
  }
}

interface AgentSettingsProps {
  isOpen: boolean
  onClose: () => void
  
  // Model Settings
  selectedModel: string
  models: Model[]
  onModelChange: (modelId: string) => void
  
  // MCP Settings
  isMCPEnabled: boolean
  mcpServers: Record<string, MCPServerForSettings>
  mcpCategories: string[]
  selectedCategory: string
  onMCPToggle: () => void
  onCategoryChange: (category: string) => void
  onServerToggle: (serverId: string) => void
  onStopAllServers: () => void
  onRefreshServers: () => void
  
  // Actions
  onClearChat: () => void
}

export default function AgentSettings({
  isOpen,
  onClose,
  selectedModel,
  models,
  onModelChange,
  isMCPEnabled,
  mcpServers,
  mcpCategories,
  selectedCategory,
  onMCPToggle,
  onCategoryChange,
  onServerToggle,
  onStopAllServers,
  onRefreshServers,
  onClearChat
}: AgentSettingsProps) {
  const getFilteredServers = () => {
    if (selectedCategory === 'All') {
      return Object.entries(mcpServers)
    }
    return Object.entries(mcpServers).filter(([_, server]) => 
      server.config?.category === selectedCategory
    )
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'documentation':
        return <FileText className="w-4 h-4" />
      case 'web':
        return <Globe className="w-4 h-4" />
      case 'development':
        return <Code className="w-4 h-4" />
      case 'system':
        return <Terminal className="w-4 h-4" />
      default:
        return <Database className="w-4 h-4" />
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'anthropic':
        return 'text-orange-400 bg-orange-400/10'
      case 'openai':
        return 'text-green-400 bg-green-400/10'
      default:
        return 'text-gray-400 bg-gray-400/10'
    }
  }

  const runningServers = Object.values(mcpServers).filter(server => server.running).length
  const totalServers = Object.keys(mcpServers).length

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="absolute top-0 right-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 shadow-2xl z-50 overflow-hidden"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-primary-orange" />
                  <h2 className="text-lg font-semibold text-white">Settings</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* AI Model Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-primary-orange" />
                  <h3 className="text-sm font-semibold text-white">AI Model</h3>
                </div>
                
                <div className="space-y-2">
                  {models.slice(0, 6).map((model) => (
                    <motion.button
                      key={model.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onModelChange(model.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                        selectedModel === model.id
                          ? 'bg-primary-orange/20 border-primary-orange text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{model.name}</div>
                          <div className="text-xs text-gray-400 truncate mt-0.5">
                            {model.description}
                          </div>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${getProviderColor(model.provider)}`}>
                          {model.provider}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* MCP Servers Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Server className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">MCP Servers</h3>
                    <div className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                      {runningServers}/{totalServers}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onMCPToggle}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isMCPEnabled 
                          ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' 
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                      title={isMCPEnabled ? 'Disable MCP' : 'Enable MCP'}
                    >
                      {isMCPEnabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </motion.button>
                  </div>
                </div>

                {isMCPEnabled && (
                  <div className="space-y-3">
                    {/* Category Filter */}
                    {mcpCategories.length > 1 && (
                      <div>
                        <select
                          value={selectedCategory}
                          onChange={(e) => onCategoryChange(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                        >
                          {mcpCategories.map(category => (
                            <option key={category} value={category}>
                              {category === 'All' ? 'All Categories' : category}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Server List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {getFilteredServers().length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No servers in this category</p>
                        </div>
                      ) : (
                        getFilteredServers().map(([serverId, server]) => (
                          <motion.div
                            key={serverId}
                            whileHover={{ scale: 1.02 }}
                            className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="flex-shrink-0">
                                  {getCategoryIcon(server.config?.category || 'unknown')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      server.running ? 'bg-green-400' : 'bg-red-400'
                                    }`} />
                                    <span className="text-sm font-medium text-white truncate">
                                      {server.config?.name || serverId}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400 truncate mt-0.5">
                                    {server.config?.description || 'No description'}
                                  </p>
                                  {server.config?.tools && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {server.config.tools.slice(0, 3).map((tool, index) => (
                                        <span
                                          key={index}
                                          className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded"
                                        >
                                          {typeof tool === 'string' ? tool : tool.name}
                                        </span>
                                      ))}
                                      {server.config.tools.length > 3 && (
                                        <span className="text-xs text-gray-500">
                                          +{server.config.tools.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onServerToggle(serverId)}
                                className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  server.running
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                              >
                                {server.running ? 'Stop' : 'Start'}
                              </motion.button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>

                    {/* Server Actions */}
                    <div className="flex space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onRefreshServers}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        <RefreshCw className="w-4 h-4 mx-auto" />
                      </motion.button>
                      {runningServers > 0 && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={onStopAllServers}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Stop All
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClearChat}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Chat History</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 