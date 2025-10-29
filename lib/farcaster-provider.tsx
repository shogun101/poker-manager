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
        // Initialize the Farcaster Frame SDK
        const frameContext = await sdk.context
        console.log('Farcaster context loaded:', frameContext)

        // Mark SDK as ready
        setContext(frameContext)
        setIsSDKLoaded(true)

        // Tell Farcaster the frame is ready
        sdk.actions.ready()
        console.log('Farcaster SDK ready called')
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error)
        // Still call ready even if there's an error, to dismiss splash screen
        sdk.actions.ready()
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
  return useContext(FarcasterContext)
}
