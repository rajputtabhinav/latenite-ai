'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, FileText } from 'lucide-react'

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  document: any
  onDownload: (format: 'pdf' | 'docx' | 'markdown') => void
  isGenerating?: boolean
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  document,
  onDownload,
  isGenerating = false
}: DocumentPreviewModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx' | 'markdown'>('pdf')

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[10000]"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isGenerating) {
            onClose()
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
          className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-orange/20 rounded-lg">
                <FileText className="w-6 h-6 text-primary-orange" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{document?.title || 'Terminal Documentation'}</h2>
                <p className="text-xs text-gray-400">{document?.subtitle || 'AI-Generated Report'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Preview */}
          <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-950">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-primary-orange border-t-transparent rounded-full mb-4"
                />
                <p className="text-white font-medium">AI is analyzing your session...</p>
                <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
              </div>
            ) : document ? (
              <div className="prose prose-invert max-w-none">
                {document.sections?.map((section: any, idx: number) => (
                  section.visible !== false && (
                    <div key={idx} className="mb-8 pb-6 border-b border-gray-800 last:border-b-0">
                      <h3 className="text-primary-orange font-bold mb-3 flex items-center">
                        <span className="text-2xl mr-2">{section.title.match(/^[^\s]+/)?.[0]}</span>
                        <span>{section.title.replace(/^[^\s]+\s*/, '')}</span>
                      </h3>
                      {section.bullets && section.bullets.length > 0 ? (
                        <ul className="list-none space-y-2 text-gray-300">
                          {section.bullets.map((bullet: string, i: number) => (
                            <li key={i} className="text-sm flex items-start">
                              <span className="text-primary-orange mr-2 mt-0.5">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      ) : section.content ? (
                        <div className="text-gray-300 text-sm whitespace-pre-line leading-relaxed">
                          {section.content}
                        </div>
                      ) : null}
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-400">No content available</p>
              </div>
            )}
          </div>

          {/* Footer - Download Options */}
          {!isGenerating && document && (
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-400 font-medium">Export as:</span>
                  <div className="flex space-x-2">
                    {[
                      { format: 'pdf', label: 'PDF', icon: '📄' },
                      { format: 'markdown', label: 'Markdown', icon: '📝' }
                    ].map(({ format, label, icon }) => (
                      <button
                        key={format}
                        onClick={() => setSelectedFormat(format as any)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${selectedFormat === format
                          ? 'bg-primary-orange text-white shadow-lg scale-105'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onDownload(selectedFormat)}
                  className="flex items-center space-x-2 bg-primary-orange hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>Download {selectedFormat.toUpperCase()}</span>
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

