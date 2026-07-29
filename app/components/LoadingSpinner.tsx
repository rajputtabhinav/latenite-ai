'use client'

import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  text,
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={`border-2 border-primary-orange border-t-transparent rounded-full ${sizeClasses[size]}`}
      />
      {text && (
        <span className="text-sm text-gray-400">{text}</span>
      )}
    </div>
  )
}

// Inline loading indicator for buttons
export function InlineLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        className="w-1.5 h-1.5 bg-primary-orange rounded-full"
      />
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        className="w-1.5 h-1.5 bg-primary-orange rounded-full"
      />
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        className="w-1.5 h-1.5 bg-primary-orange rounded-full"
      />
    </div>
  )
}

// Pulse loading animation
export function PulseLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex space-x-2 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2
          }}
          className="w-2 h-2 bg-primary-orange rounded-full"
        />
      ))}
    </div>
  )
}


