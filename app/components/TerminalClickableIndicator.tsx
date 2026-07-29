'use client'

import { motion } from 'framer-motion'
import { MousePointer2 } from 'lucide-react'

export default function TerminalClickableIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 2, duration: 0.5 }}
      className="absolute top-4 right-4 bg-primary-orange/90 text-white px-3 py-1 rounded-full text-xs flex items-center space-x-1 z-10"
    >
      <MousePointer2 className="w-3 h-3" />
      <span>Click to open</span>
    </motion.div>
  )
} 