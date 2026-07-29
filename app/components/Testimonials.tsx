'use client'

import { motion } from 'framer-motion'
import { Server, Shield, Zap, Clock, AlertTriangle, TrendingUp } from 'lucide-react'

export default function Testimonials() {
  const serverSolutions = [
    {
      title: "Reduce Server Downtime",
      metric: "99.9% Uptime",
      description: "AI-powered monitoring detects issues before they cause outages. Automated health checks and predictive maintenance keep your infrastructure running smoothly.",
      icon: Server,
      color: "bg-primary-orange",
      highlights: ["Predictive Failure Detection", "Auto-healing Systems", "24/7 Monitoring"]
    },
    {
      title: "Solve Tickets 10x Faster", 
      metric: "< 5 Min Resolution",
      description: "Intelligent diagnostics analyze logs, identify root causes, and provide step-by-step solutions. Turn hours of troubleshooting into minutes of execution.",
      icon: Zap,
      color: "bg-blue-500",
      highlights: ["Instant Log Analysis", "Root Cause Detection", "Solution Automation"]
    },
    {
      title: "Critical Issue Response",
      metric: "Real-time Alerts",
      description: "Get immediate notifications with suggested fixes for security breaches, performance degradation, and system failures. Stay ahead of problems.",
      icon: AlertTriangle,
      color: "bg-red-500",
      highlights: ["Security Monitoring", "Performance Alerts", "Instant Response"]
    },
    {
      title: "Infrastructure Optimization",
      metric: "40% Cost Reduction",
      description: "AI analyzes resource usage patterns and recommends optimizations. Right-size your servers, optimize configurations, and reduce operational costs.",
      icon: TrendingUp,
      color: "bg-green-500",
      highlights: ["Resource Optimization", "Cost Analysis", "Performance Tuning"]
    }
  ]

  return (
    <section id="server-solutions" className="py-20 bg-black">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center mb-4">
            <span className="text-primary-orange text-sm font-semibold mr-2">⚡ SERVER ENGINEERING</span>
          </div>
          <h2 className="text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-white mb-8">
            Built for Server Engineers
          </h2>
          <p className="text-gray-400 text-lg xl:text-xl 2xl:text-2xl max-w-3xl xl:max-w-5xl mx-auto">
            Reduce downtime, solve tickets faster, and optimize infrastructure with AI-powered server management
          </p>
        </motion.div>

        {/* Solutions Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {serverSolutions.map((solution, index) => {
            const IconComponent = solution.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className={`${solution.color} rounded-2xl p-8 h-full transform transition-all duration-300 hover:scale-105`}>
                  {/* Icon & Metric */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-white/80 text-sm font-medium">Target</div>
                      <div className="text-white text-lg font-bold">{solution.metric}</div>
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-white text-xl font-bold mb-4">
                    {solution.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-white/90 text-base mb-6 leading-relaxed">
                    {solution.description}
                  </p>
                  
                  {/* Highlights */}
                  <div className="space-y-2">
                    {solution.highlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-center text-white/80 text-sm">
                        <div className="w-1.5 h-1.5 bg-white rounded-full mr-3"></div>
                        {highlight}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>


      </div>
    </section>
  )
} 