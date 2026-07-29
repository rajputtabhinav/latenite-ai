'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setIsSubscribed(true)
      setEmail('')
      setTimeout(() => setIsSubscribed(false), 3000)
    }
  }

  return (
    <section className="py-20 bg-gray-900">
      <div className="max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-primary-orange to-red-400 rounded-2xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">L</span>
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-white mb-6">
            Subscribe to the newsletter
          </h2>
          
          <p className="text-xl xl:text-2xl 2xl:text-3xl text-gray-300 mb-12 max-w-2xl xl:max-w-4xl mx-auto">
            Get the latest updates on Latenite AI features, tips, and development insights 
            delivered straight to your inbox.
          </p>

          {/* Newsletter Form */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="flex-1 px-6 py-4 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-orange focus:ring-1 focus:ring-primary-orange transition-colors"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-primary-orange hover:bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors"
              >
                {isSubscribed ? '✓ Subscribed!' : 'Subscribe'}
              </motion.button>
            </div>
            
            {isSubscribed && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-green-400 mt-4"
              >
                Thank you for subscribing! Check your email for confirmation.
              </motion.p>
            )}
          </form>

          <p className="text-gray-400 text-sm mt-6">
            No spam, unsubscribe at any time. We respect your privacy.
          </p>
        </motion.div>
      </div>
    </section>
  )
} 