'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import FullscreenTerminal from './FullscreenTerminal'
import TerminalClickableIndicator from './TerminalClickableIndicator'

export default function Experience() {
  const [currentCommand, setCurrentCommand] = useState(0)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)
  
  const commands = [
    { 
      input: "latenite neural-optimize --microservices --distributed", 
      output: [
        "🧠 Initializing distributed neural optimization...",
        "⚡ Analyzing 847 microservices across 23 nodes",
        "🔍 Detecting performance bottlenecks in real-time",
        "   • Memory leak in payment-service (95% confidence)",
        "   • Race condition in auth-middleware (89% confidence)",
        "   • Database connection pool exhaustion predicted",
        "🚀 Auto-applying ML-driven optimizations...",
        "✅ Reduced latency by 73% across service mesh",
        "✅ Memory usage optimized: -2.3GB across cluster"
      ]
    },
    {
      input: "latenite quantum-ssh --deploy kubernetes --ai-scaling",
      output: [
        "🔐 Establishing quantum-resistant SSH tunnel...",
        "🌐 Connected to 47 production clusters globally",
        "🤖 AI-driven horizontal pod autoscaling enabled",
        "📊 Analyzing traffic patterns with ML models",
        "   • Predicted 340% traffic spike in 14 minutes",
        "   • Auto-scaling pods: 12 → 156 instances",
        "   • Load balancing optimized via reinforcement learning",
        "✅ Zero-downtime deployment completed",
        "🎯 99.99% uptime maintained across all regions"
      ]
    },
    {
      input: "latenite ai-refactor --legacy-monolith --complexity-reduction",
      output: [
        "🔬 Deep-scanning legacy monolith (2.3M LOC)...",
        "🧬 Genetic algorithm analyzing code patterns",
        "📈 Complexity metrics: Cyclomatic: 47,329 → 12,847",
        "🎯 AI-suggested microservice boundaries identified",
        "   • User management service extracted (347 files)",
        "   • Payment processing isolated (89% test coverage)",
        "   • Data layer refactored with event sourcing",
        "⚡ Technical debt reduced by 84%",
        "🚀 Performance improved: 2.3s → 280ms response time"
      ]
    }
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentCommand((prev) => (prev + 1) % commands.length)
    }, 4000)
    
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="py-20 bg-gray-900">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-white mb-8">
            Experience the Future Today
          </h2>
          <p className="text-xl xl:text-2xl 2xl:text-3xl text-gray-300 max-w-3xl xl:max-w-5xl mx-auto mb-12">
            See how Latenite AI transforms your development workflow with intelligent automation 
            and seamless integration across all platforms.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-white mb-6">
              Next Generation Terminal Intelligence
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-primary-orange rounded-full mt-3"></div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">AI-Powered Code Analysis</h4>
                  <p className="text-gray-400">Instant code quality assessment with intelligent suggestions for optimization and security improvements.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-3"></div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Seamless SSH Integration</h4>
                  <p className="text-gray-400">Connect and deploy to any server with intelligent automation and real-time monitoring.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-3"></div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Automatic Error Resolution</h4>
                  <p className="text-gray-400">AI identifies and fixes common coding errors automatically, saving you time and reducing bugs.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Content - Dynamic Terminal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
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
                <span className="text-gray-400 text-sm">Advanced Mode</span>
                <div className="w-16"></div>
              </div>
              
              <div className="terminal-content min-h-[300px]">
                <motion.div
                  key={currentCommand}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="text-gray-400 mb-4">
                    abhinav@latenite:~$ {commands[currentCommand].input}
                    <span className="animate-pulse">|</span>
                  </div>
                  
                  <div className="space-y-2">
                    {commands[currentCommand].output.map((line, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.2 }}
                        className="text-gray-300 text-sm"
                      >
                        {line}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
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