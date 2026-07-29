'use client'

import { motion } from 'framer-motion'
import { Terminal, Zap, Shield } from 'lucide-react'

export default function Features() {
  const features = [
    {
      icon: <Terminal className="w-8 h-8" />,
      title: "Native terminal with powerful AI-driven functionality that enhances coding efficiency like never before",
      description: "Experience seamless integration with your existing workflow while AI handles repetitive tasks automatically.",
      color: "bg-primary-orange"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "We're bringing intelligent code understanding, context and learning from every interaction",
      description: "Our advanced AI learns from your coding patterns and provides contextual suggestions that improve over time.",
      color: "bg-blue-500"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "World-leading generative AI security that's battle-tested for production environments",
      description: "Enterprise-grade security ensures your code and data remain protected while leveraging cutting-edge AI capabilities.",
      color: "bg-purple-500"
    }
  ]

  return (
    <section id="features" className="py-20 bg-black">
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
            Why Latenite AI
          </h2>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="group relative"
            >
              <div className={`${feature.color} rounded-2xl p-8 h-full transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}>
                <div className="flex items-center mb-6">
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4 leading-tight">
                  {feature.title}
                </h3>
                
                <p className="text-white/90 leading-relaxed">
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