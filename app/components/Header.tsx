'use client'

import { useState } from 'react'
import { Menu, X, Zap, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface HeaderProps {
  onAIAgentToggle?: () => void
}

export default function Header({ onAIAgentToggle }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-gray-800">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-orange to-red-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="text-xl font-bold text-white">Latenite.ai</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-white transition-colors">
              Features
            </a>
            <a href="#product" className="text-gray-300 hover:text-white transition-colors">
              Product
            </a>
            <a href="#intelligence" className="text-gray-300 hover:text-white transition-colors">
              Intelligence
            </a>
            <a href="#server-solutions" className="text-gray-300 hover:text-white transition-colors">
              Solutions
            </a>
          </nav>

          {/* Auth Buttons & AI Agent */}
          <div className="hidden md:flex items-center space-x-4">
            {/* AI Agent Button - Only show when onAIAgentToggle is provided */}
            {onAIAgentToggle && (
              <motion.button
                whileHover={{ 
                  scale: 1.1,
                  boxShadow: "0 0 20px rgba(255, 107, 53, 0.5), 0 0 40px rgba(255, 107, 53, 0.2)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={onAIAgentToggle}
                className="relative bg-gradient-to-r from-primary-orange to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white p-2 rounded-lg shadow-lg transition-all duration-300 border border-orange-400/30"
                style={{
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 50%, #FFB347 100%)',
                  boxShadow: '0 4px 16px rgba(255, 107, 53, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                }}
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 3, -3, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative flex items-center"
                >
                  <Zap className="w-5 h-5 drop-shadow-sm" />
                  <motion.div
                    animate={{ 
                      opacity: [0.3, 0.7, 0.3],
                      scale: [0.8, 1.1, 0.8]
                    }}
                    transition={{ 
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute -top-0.5 -right-0.5"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-yellow-200" />
                  </motion.div>
                </motion.div>
              </motion.button>
            )}
            
            <button className="text-gray-300 hover:text-white transition-colors">
              Sign In
            </button>
            <button className="bg-primary-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors">
              Sign Up
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-black/95 backdrop-blur-md rounded-lg mt-2">
              <a href="#features" className="block px-3 py-2 text-gray-300 hover:text-white">
                Features
              </a>
              <a href="#product" className="block px-3 py-2 text-gray-300 hover:text-white">
                Product
              </a>
              <a href="#intelligence" className="block px-3 py-2 text-gray-300 hover:text-white">
                Intelligence
              </a>
              <a href="#server-solutions" className="block px-3 py-2 text-gray-300 hover:text-white">
                Solutions
              </a>
              <div className="pt-2 border-t border-gray-700">
                {/* Mobile AI Agent Button - Only show when onAIAgentToggle is provided */}
                {onAIAgentToggle && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onAIAgentToggle}
                    className="flex items-center justify-center w-full mb-2 bg-gradient-to-r from-primary-orange to-orange-600 text-white px-3 py-2 rounded-lg transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 50%, #FFB347 100%)',
                      boxShadow: '0 4px 16px rgba(255, 107, 53, 0.3)'
                    }}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    <span className="font-medium">AI Agent</span>
                    <Sparkles className="w-3 h-3 ml-2 text-yellow-200" />
                  </motion.button>
                )}
                
                <button className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white">
                  Sign In
                </button>
                <button className="block w-full text-left px-3 py-2 bg-primary-orange text-white rounded-lg mt-2">
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
} 