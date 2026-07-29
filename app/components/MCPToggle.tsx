'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  tools: string[];
  requiresAuth?: boolean;
  isEnabled: boolean;
}

interface MCPStatus {
  [serverId: string]: {
    running: boolean;
    status: 'active' | 'inactive';
    config: MCPServerConfig;
  };
}

interface MCPToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function MCPToggle({ isEnabled, onToggle }: MCPToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mcpStatus, setMcpStatus] = useState<MCPStatus>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Enhanced MCP status fetching with better error handling
  const fetchMCPStatus = async () => {
    try {
      const response = await fetch('/api/mcp?action=status');
      if (response.ok) {
        const data = await response.json();
        setMcpStatus(data);
        
        // Check if any servers are running to update global toggle
        const hasRunningServers = Object.values(data).some((server: any) => server.running);
        if (hasRunningServers !== isEnabled) {
          onToggle(hasRunningServers);
        }
      }
    } catch (error) {
      console.error('Error fetching MCP status:', error);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/mcp?action=categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(['All', ...data.categories]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Start/Stop MCP server
  const toggleServer = async (serverId: string) => {
    setIsLoading(prev => ({ ...prev, [serverId]: true }));
    try {
      const serverStatus = mcpStatus[serverId];
      const action = serverStatus?.running ? 'stop' : 'start';
      const response = await fetch(`/api/mcp?action=${action}&serverId=${serverId}`, {
        method: 'GET'
      });
      
      if (response.ok) {
        await fetchMCPStatus();
        // Update global MCP toggle based on any servers running
        const hasRunningServers = Object.values(mcpStatus).some(server => server.running);
        if (action === 'start' || hasRunningServers) {
          onToggle(true);
        } else {
          onToggle(false);
        }
      }
    } catch (error) {
      console.error(`Error toggling ${serverId} server:`, error);
    } finally {
      setIsLoading(prev => ({ ...prev, [serverId]: false }));
    }
  };

  // Stop all servers
  const stopAllServers = async () => {
    setIsLoading(prev => {
      const newState = { ...prev };
      Object.keys(mcpStatus).forEach(serverId => {
        newState[serverId] = true;
      });
      return newState;
    });
    
    try {
      const response = await fetch('/api/mcp?action=stop-all', {
        method: 'GET'
      });
      
      if (response.ok) {
        await fetchMCPStatus();
        onToggle(false);
      }
    } catch (error) {
      console.error('Error stopping all servers:', error);
    } finally {
      setIsLoading({});
    }
  };

  // Fetch status and categories on mount with better intervals
  useEffect(() => {
    fetchMCPStatus();
    fetchCategories();
    
    // Shorter polling interval for better real-time updates
    const interval = setInterval(fetchMCPStatus, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter servers by category
  const filteredServers = Object.entries(mcpStatus).filter(([serverId, server]) => {
    if (selectedCategory === 'All') return true;
    return server.config.category === selectedCategory;
  });

  // Get running servers count
  const runningServersCount = Object.values(mcpStatus).filter(server => server.running).length;
  const totalServersCount = Object.keys(mcpStatus).length;

  return (
    <div className="relative">
      {/* Main MCP Toggle Button */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors text-xs"
          title="Model Context Protocol Servers"
        >
          <div className="flex items-center space-x-1">
            <div className={`w-1.5 h-1.5 rounded-full ${
              runningServersCount > 0 ? 'bg-green-400' : 'bg-gray-400'
            }`}></div>
            <span className="text-xs font-medium text-gray-300">MCP</span>
            <span className="text-xs text-gray-500">({runningServersCount}/{totalServersCount})</span>
          </div>
          {isExpanded ? (
            <ChevronUpIcon className="h-3 w-3 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-3 w-3 text-gray-400" />
          )}
        </button>
        
        {/* Global MCP Toggle */}
        <button
          onClick={() => onToggle(!isEnabled)}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            isEnabled 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
          title="Enable/Disable MCP integration"
        >
          {isEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Expanded MCP Server Controls */}
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-gray-800 rounded-lg shadow-xl border border-gray-600 z-50 max-h-96 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">MCP Servers</h3>
              {runningServersCount > 0 && (
                <button
                  onClick={stopAllServers}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                >
                  Stop All
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="mb-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs border border-gray-600"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            {/* Server List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredServers.map(([serverId, server]) => (
                <div key={serverId} className="p-2 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        server.running ? 'bg-green-400' : 'bg-gray-400'
                      }`}></div>
                      <div>
                        <div className="font-medium text-xs text-white">{server.config.name}</div>
                        <div className="text-xs text-gray-400">{server.config.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleServer(serverId)}
                      disabled={isLoading[serverId]}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        isLoading[serverId]
                          ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                          : server.running
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {isLoading[serverId] ? 'Loading...' : server.running ? 'Stop' : 'Start'}
                    </button>
                  </div>
                  
                  {/* Server Details */}
                  <div className="text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="text-blue-300">{server.config.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-medium ${
                        server.running ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {server.status}
                      </span>
                    </div>
                    {server.config.requiresAuth && (
                      <div className="flex justify-between">
                        <span>Auth:</span>
                        <span className="text-yellow-300">Required</span>
                      </div>
                    )}
                  </div>

                  {/* Available Tools */}
                  {server.running && server.config.tools.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-900/20 rounded border border-blue-700/30">
                      <div className="text-xs font-medium text-blue-300 mb-1">Available Tools:</div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-blue-200">
                        {server.config.tools.slice(0, 4).map(tool => (
                          <div key={tool}>• {tool}</div>
                        ))}
                        {server.config.tools.length > 4 && (
                          <div className="text-blue-300">+{server.config.tools.length - 4} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredServers.length === 0 && (
              <div className="text-center text-gray-400 text-xs py-4">
                No servers found in {selectedCategory} category
              </div>
            )}

            {/* Usage Instructions */}
            <div className="mt-3 p-2 bg-yellow-900/20 rounded-lg border border-yellow-700/30">
              <div className="text-xs font-medium text-yellow-300 mb-1">Usage:</div>
              <div className="text-xs text-yellow-200">
                • Add "use context7" for documentation<br/>
                • Use "web search" for real-time information<br/>
                • Use "docker" for container management<br/>
                • Use "git" for repository operations
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 