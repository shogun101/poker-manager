'use client'

import sdk from '@farcaster/frame-sdk'
import { createContext, useContext, useEffect, useState } from 'react'

// Context to share Farcaster data across the app
interface FarcasterContextType {
  isSDKLoaded: boolean
  context: any | null
  isLoading: boolean
}

const FarcasterContext = createContext<FarcasterContextType>({
  isSDKLoaded: false,
  context: null,
  isLoading: true,
})

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [context, setContext] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initFrame = async () => {
      try {
        // Initialize the Farcaster Frame SDK (but don't auto-connect wallet)
        // Set a timeout to prevent hanging on network errors
        const frameContext = await Promise.race([
          sdk.context,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SDK initialization timeout')), 10000)
          )
        ])
        console.log('Farcaster context loaded:', frameContext)

        // Mark SDK as ready
        setContext(frameContext)
        setIsSDKLoaded(true)

        // Tell Farcaster the frame is ready (this dismisses splash screen)
        sdk.actions.ready()
        console.log('Farcaster SDK ready called')
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error)
        if (error instanceof Error && error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
          console.warn('⚠️ Farcaster SDK blocked by browser extension. Please disable ad blockers for full functionality.')
        }
        // Still call ready even if there's an error, to dismiss splash screen
        try {
          sdk.actions.ready()
        } catch (readyError) {
          console.error('Failed to call sdk.actions.ready():', readyError)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initFrame()
  }, [])

  return (
    <FarcasterContext.Provider value={{ isSDKLoaded, context, isLoading }}>
      {children}
    </FarcasterContext.Provider>
  )
}

// Hook to use Farcaster context in components
export function useFarcaster() {
  const context = useContext(FarcasterContext)
  // If FarcasterProvider is not loaded (testnet), return default values
  if (!context) {
    return {
      isSDKLoaded: false,
      context: null,
      isLoading: false,
    }
  }
  return context
}
