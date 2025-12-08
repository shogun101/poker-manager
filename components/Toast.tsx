'use client'

import { useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return ''
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'info':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div
        className={`${getBackgroundColor()} text-white px-4 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex items-center gap-2 font-[family-name:var(--font-margarine)] min-w-[280px] max-w-[90vw]`}
      >
        <span className="text-lg">{getIcon()}</span>
        <span className="text-sm flex-1">{message}</span>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white text-xl leading-none ml-2"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
