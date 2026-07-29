'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Image, FileSpreadsheet } from 'lucide-react'
import { ProcessedFile } from '../lib/file-processor'

interface FileUploadPreviewProps {
  files: ProcessedFile[]
  onRemove: (fileId: string) => void
  onClearAll: () => void
}

export default function FileUploadPreview({
  files,
  onRemove,
  onClearAll
}: FileUploadPreviewProps) {
  if (files.length === 0) return null

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full left-0 mb-2 w-full max-w-md"
    >
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-gray-700/50 border-b border-gray-600">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-300 font-medium">
              📎 {files.length} file{files.length !== 1 ? 's' : ''} attached
            </span>
          </div>
          <button
            onClick={onClearAll}
            className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-gray-600 transition-colors"
          >
            Clear all
          </button>
        </div>

        {/* Files List */}
        <div className="max-h-40 overflow-y-auto p-2 space-y-1.5">
          <AnimatePresence>
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center space-x-2 bg-gray-700 rounded-lg p-2 group hover:bg-gray-600 transition-all"
              >
                {/* File Preview/Icon */}
                {file.preview ? (
                  <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-gray-600">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 flex-shrink-0 bg-gray-600 rounded flex items-center justify-center text-gray-300">
                    {getFileIcon(file.type)}
                  </div>
                )}
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate font-medium">
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center space-x-2">
                    <span>{formatFileSize(file.size)}</span>
                    {file.extractedText && (
                      <>
                        <span>•</span>
                        <span className="text-green-400">✓ Processed</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Remove Button */}
                <button
                  onClick={() => onRemove(file.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-gray-500 text-red-400 hover:text-red-300 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

