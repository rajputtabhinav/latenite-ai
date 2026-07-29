'use client'

import dynamic from 'next/dynamic'

// Lazy load XTermTerminal with loading fallback
const XTermTerminal = dynamic(() => import('./XTermTerminal'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-black">
      <div className="text-gray-400 text-sm animate-pulse">
        Loading terminal...
      </div>
    </div>
  )
})

export default XTermTerminal