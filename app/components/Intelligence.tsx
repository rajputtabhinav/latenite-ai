'use client'

import { motion } from 'framer-motion'
import { Brain, MessageSquare, Shield, Users, Cpu, Rocket } from 'lucide-react'

export default function Intelligence() {
  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Adaptive Learning",
      description: "AI that evolves with your development patterns and continuously improves suggestions.",
      gradient: "from-green-400 to-green-600"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Natural Interaction",
      description: "Communicate with your terminal using natural language and get instant, accurate responses.",
      gradient: "from-blue-400 to-blue-600"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Precise Execution",
      description: "Advanced AI models deliver precise code generation and error detection for reliable development.",
      gradient: "from-purple-400 to-purple-600"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Team Integration",
      description: "Seamless collaboration features that enhance team productivity and knowledge sharing.",
      gradient: "from-yellow-400 to-yellow-600"
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      title: "Optimized Performance",
      description: "Lightning-fast processing with optimized algorithms that don't slow down your workflow.",
      gradient: "from-red-400 to-red-600"
    },
    {
      icon: <Rocket className="w-8 h-8" />,
      title: "Smart Automation",
      description: "Intelligent automation that handles routine tasks while you focus on creative problem-solving.",
      gradient: "from-indigo-400 to-indigo-600"
    }
  ]

  return (
    <section id="intelligence" className="py-20 bg-black">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-white mb-6">
            Advanced Intelligence,
          </h2>
          <h3 className="text-3xl md:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white mb-8">
            Human-Like Intuition
          </h3>
          <p className="text-xl xl:text-2xl 2xl:text-3xl text-gray-300 max-w-3xl xl:max-w-5xl mx-auto">
            Built with cutting-edge technology to understand, learn, and adapt to 
            your development environment like never before.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative"
            >
              <div className="bg-gray-900 rounded-2xl p-8 h-full border border-gray-800 hover:border-gray-600 transition-all duration-300 hover:transform hover:scale-105">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} mb-6`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
} 