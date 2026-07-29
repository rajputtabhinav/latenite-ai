'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Monitor, Layers, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ProfessionalTerminal from '../components/ProfessionalTerminal'
import FullscreenTerminal from '../components/FullscreenTerminal'

export default function ProfessionalTerminalPage() {
  const [useProfessionalTerminal, setUseProfessionalTerminal] = useState(true)
  const [showFullscreen, setShowFullscreen] = useState(false)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-primary-orange hover:text-orange-400 flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            
            <div className="h-6 w-px bg-gray-600"></div>
            
            <div className="flex items-center space-x-2">
              <Monitor className="w-5 h-5 text-primary-orange" />
              <span className="font-semibold">Latenite AI Terminal</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Terminal Mode Toggle */}
            <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setUseProfessionalTerminal(true)}
                className={`px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1 ${
                  useProfessionalTerminal
                    ? 'bg-primary-orange text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Professional</span>
              </button>
              <button
                onClick={() => setUseProfessionalTerminal(false)}
                className={`px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1 ${
                  !useProfessionalTerminal
                    ? 'bg-primary-orange text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Legacy</span>
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setShowFullscreen(!showFullscreen)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm flex items-center space-x-1"
            >
              {showFullscreen ? <X className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              <span>{showFullscreen ? 'Exit' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>
        
        {/* Terminal Description */}
        <div className="px-6 pb-4">
          <div className="text-sm text-gray-400">
            {useProfessionalTerminal ? (
              <>
                <span className="text-green-400 font-medium">Professional Mode:</span> Full XTerm.js terminal emulation with native ANSI support, just like real terminal applications.
              </>
            ) : (
              <>
                <span className="text-blue-400 font-medium">Legacy Mode:</span> Custom React terminal implementation with manual ANSI parsing.
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Terminal Content */}
      <div className="flex-1 h-screen">
        {showFullscreen ? (
          // Fullscreen mode
          useProfessionalTerminal ? (
            <ProfessionalTerminal 
              isOpen={true}
              onClose={() => setShowFullscreen(false)}
            />
          ) : (
            <FullscreenTerminal 
              isOpen={true}
              onClose={() => setShowFullscreen(false)}
            />
          )
        ) : (
          // Embedded mode
          <div className="h-full flex flex-col">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 p-6"
            >
              <div className="max-w-6xl mx-auto h-full">
                <div className="bg-gray-900 rounded-lg border border-gray-700 h-full overflow-hidden">
                  {/* Terminal Header */}
                  <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-sm text-gray-300">Terminal</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {useProfessionalTerminal ? 'XTerm.js' : 'React Terminal'}
                    </div>
                  </div>
                  
                  {/* Terminal Content */}
                  <div className="h-full">
                    {useProfessionalTerminal ? (
                      <ProfessionalTerminal 
                        isOpen={true}
                        onClose={() => {}}
                      />
                    ) : (
                      <FullscreenTerminal 
                        isOpen={true}
                        onClose={() => {}}
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Features Info */}
      {!showFullscreen && (
        <div className="border-t border-gray-700 bg-gray-900/50 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-green-400 flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>Professional Terminal (XTerm.js)</span>
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Native ANSI escape sequence handling</li>
                  <li>• True terminal emulation (just like PuTTY, iTerm2)</li>
                  <li>• Full color support (256 colors + true color)</li>
                  <li>• Professional cursor and text rendering</li>
                  <li>• Proper scrollback and selection</li>
                  <li>• Compatible with all terminal applications</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-400 flex items-center space-x-2">
                  <Layers className="w-4 h-4" />
                  <span>Legacy Terminal (Custom React)</span>
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Custom React implementation</li>
                  <li>• Manual ANSI to CSS conversion</li>
                  <li>• Basic color and formatting support</li>
                  <li>• Web-optimized styling with Tailwind</li>
                  <li>• Custom output handling</li>
                  <li>• Limited terminal compatibility</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-primary-orange/10 border border-primary-orange/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Settings className="w-5 h-5 text-primary-orange flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-primary-orange">Recommendation</h4>
                  <p className="text-sm text-gray-300 mt-1">
                    Use <strong>Professional Mode</strong> for the most authentic terminal experience. It provides native ANSI handling and looks/behaves exactly like standard terminal applications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
