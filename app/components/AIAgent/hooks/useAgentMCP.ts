import { useEffect, useCallback } from 'react'
import type { MCPServer } from '../../../types'

interface UseAgentMCPProps {
    isMCPEnabled: boolean
    setIsMCPEnabled: (enabled: boolean) => void
    setMcpServers: (servers: Record<string, MCPServer>) => void
    setMcpCategories: (categories: string[]) => void
    mcpServers: Record<string, MCPServer>
    selectedCategory: string
    input: string
    setInput: (input: string) => void
    inputRef: React.RefObject<HTMLTextAreaElement>
    setSelectedTool: (tool: string | null) => void
    setShowToolsDropdown: (show: boolean) => void
}

export function useAgentMCP({
    isMCPEnabled,
    setIsMCPEnabled,
    setMcpServers,
    setMcpCategories,
    mcpServers,
    selectedCategory,
    input,
    setInput,
    inputRef,
    setSelectedTool,
    setShowToolsDropdown
}: UseAgentMCPProps) {

    // Fetch MCP server data
    const fetchMCPData = useCallback(async () => {
        try {
            // Fetch server status
            const statusResponse = await fetch('/api/mcp?action=status')
            if (statusResponse.ok) {
                const statusData = await statusResponse.json()
                setMcpServers(statusData as Record<string, MCPServer>)
            }

            // Fetch categories
            const categoriesResponse = await fetch('/api/mcp?action=categories')
            if (categoriesResponse.ok) {
                const categoriesData = await categoriesResponse.json()
                setMcpCategories(['All', ...categoriesData.categories])
            }
        } catch (error) {
            console.error('Failed to fetch MCP data:', error)
        }
    }, [setMcpServers, setMcpCategories])

    // Auto-start MCP servers with admin priority
    const autoStartMCPServers = useCallback(async () => {
        try {
            console.log('🚀 Auto-starting Admin MCP servers...')

            // Priority order for administrative tasks
            const adminPriorityServers = ['filesystem', 'terminal', 'context7', 'web-search', 'puppeteer']

            // Get all server configurations
            const statusResponse = await fetch('/api/mcp?action=status')
            if (statusResponse.ok) {
                const servers = await statusResponse.json()

                // Start admin priority servers first
                for (const serverId of adminPriorityServers) {
                    if (servers[serverId] && !servers[serverId].running) {
                        try {
                            console.log(`🔧 Starting admin server: ${serverId}`)
                            const startResponse = await fetch(`/api/mcp?action=start&serverId=${serverId}`)
                            if (startResponse.ok) {
                                console.log(`✅ Admin server started: ${servers[serverId].config.name}`)
                            }
                        } catch (error) {
                            console.error(`❌ Failed to start admin server ${serverId}:`, error)
                        }
                    }
                }

                // Start remaining servers
                for (const [serverId, server] of Object.entries(servers)) {
                    const serverData = server as any
                    if (!serverData.running && !adminPriorityServers.includes(serverId)) {
                        try {
                            const startResponse = await fetch(`/api/mcp?action=start&serverId=${serverId}`)
                            if (startResponse.ok) {
                                console.log(`✅ Auto-started: ${serverData.config?.name || serverId}`)
                            }
                        } catch (error) {
                            console.error(`❌ Failed to auto-start ${serverId}:`, error)
                        }
                    }
                }

                // Refresh server data after auto-start
                await fetchMCPData()
            }
        } catch (error) {
            console.error('Auto-start failed:', error)
        }
    }, [fetchMCPData])

    // Initialize MCP servers on component mount - ONLY when user enables MCP
    useEffect(() => {
        if (isMCPEnabled) {
            fetchMCPData()
            autoStartMCPServers()
        }
    }, [isMCPEnabled, fetchMCPData, autoStartMCPServers])

    // Regular server status polling - REDUCED frequency
    useEffect(() => {
        if (!isMCPEnabled) return // Don't poll if MCP disabled

        const interval = setInterval(() => {
            // Silent polling - only log on status changes
            fetchMCPData()
        }, 60000) // Poll every 60 seconds instead of 5
        return () => clearInterval(interval)
    }, [isMCPEnabled, fetchMCPData])

    // Toggle MCP server
    const toggleMCPServer = useCallback(async (serverId: string) => {
        try {
            const server = mcpServers[serverId]
            const action = server?.running ? 'stop' : 'start'

            const response = await fetch(`/api/mcp?action=${action}&serverId=${serverId}`)
            if (response.ok) {
                await fetchMCPData() // Refresh data
            }
        } catch (error) {
            console.error(`Failed to toggle server ${serverId}:`, error)
        }
    }, [mcpServers, fetchMCPData])

    // Stop all MCP servers
    const stopAllMCPServers = useCallback(async () => {
        try {
            const response = await fetch('/api/mcp?action=stop-all')
            if (response.ok) {
                await fetchMCPData()
            }
        } catch (error) {
            console.error('Failed to stop all servers:', error)
        }
    }, [fetchMCPData])

    // Handle tool selection
    const handleToolSelect = useCallback((serverId: string, serverName: string) => {
        setSelectedTool(serverId)
        setShowToolsDropdown(false)

        // Auto-enable MCP if not already enabled
        if (!isMCPEnabled) {
            setIsMCPEnabled(true)
        }

        // Add tool indication to input if it's empty
        if (!input.trim()) {
            setInput(`Using ${serverName}: `)
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus()
                    inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length)
                }
            }, 100)
        }
    }, [isMCPEnabled, setIsMCPEnabled, input, setInput, inputRef, setSelectedTool, setShowToolsDropdown])

    return {
        fetchMCPData,
        autoStartMCPServers,
        toggleMCPServer,
        stopAllMCPServers,
        handleToolSelect
    }
}
