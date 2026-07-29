'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import FullscreenTerminal from './FullscreenTerminal'
import TerminalClickableIndicator from './TerminalClickableIndicator'

export default function Hero() {
  const [typedText, setTypedText] = useState('')
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)
  const fullText = 'latenite init --neural-network --quantum-encryption'

  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      if (index < fullText.length) {
        setTypedText(fullText.slice(0, index + 1))
        index++
      } else {
        clearInterval(timer)
      }
    }, 100)

    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23333' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20 pt-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-bold leading-tight mb-6"
            >
              <span className="text-white">Latenite AI:</span>
              <br />
              <span className="text-white">Where Code</span>
              <br />
              <span className="gradient-text">Meets Intelligence</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl lg:text-2xl xl:text-3xl text-gray-300 mb-8 max-w-2xl xl:max-w-4xl"
            >
              The next generation AI terminal that understands your code, automates repetitive 
              tasks, and unlocks unprecedented productivity with intelligent code completion, 
              error detection, and seamless integration across all OS platforms and SSH-supported servers.
            </motion.p>



            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex items-center justify-center lg:justify-start text-gray-400"
            >
              <span className="mr-2">⚡</span>
              <span>Sign up with your terminal. Getting started has never been easier.</span>
            </motion.div>
          </motion.div>

          {/* Right Content - Terminal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <div 
              className="terminal-window cursor-pointer hover:scale-105 transition-transform duration-300 relative group" 
              onClick={() => setIsTerminalOpen(true)}
              title="Click to open fullscreen terminal"
            >
              <div className="absolute inset-0 bg-primary-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
              <TerminalClickableIndicator />
              <div className="terminal-header flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 text-sm font-medium">Latenite AI Terminal</span>
                </div>
                <span className="text-gray-400 text-sm">Ready</span>
                <div className="w-16"></div>
              </div>
              
              <div className="terminal-content">
                <div className="text-gray-400 mb-2">abhinav@latenite:~$ {typedText}<span className="animate-pulse">|</span></div>
                <div className="text-green-400 mb-2">✓ Installing Latenite AI Terminal...</div>
                <div className="text-blue-400 mb-2">✓ Setting up distributed AI neural networks...</div>
                <div className="text-yellow-400 mb-2">✓ Configuring quantum-resistant SSH encryption...</div>
                <div className="text-purple-400 mb-2">✓ Enabling cross-platform ML inference engines...</div>
                <div className="text-green-400 mb-4">✓ Ready! Latenite AI Terminal is now active.</div>
                
                <div className="text-gray-400 mb-2">abhinav@latenite:~$ latenite --capabilities</div>
                <div className="text-gray-300 text-sm">
                  <div className="mb-1">🧠 Advanced AI Capabilities:</div>
                  <div className="ml-4 text-gray-400">
                    <div>• neural-debug      - Deep learning error analysis</div>
                    <div>• quantum-ssh       - Post-quantum secure connections</div>
                    <div>• ai-refactor       - Intelligent code transformation</div>
                    <div>• predictive-ops    - ML-driven DevOps automation</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <FullscreenTerminal 
        isOpen={isTerminalOpen} 
        onClose={() => setIsTerminalOpen(false)} 
      />
    </section>
  )
} 