'use client'

import sdk, { type FrameContext } from '@farcaster/frame-sdk'
import { createContext, useContext, useEffect, useState } from 'react'

// Context to share Farcaster data across the app
interface FarcasterContextType {
  isSDKLoaded: boolean
  context: FrameContext | null
  isLoading: boolean
}

const FarcasterContext = createContext<FarcasterContextType>({
  isSDKLoaded: false,
  context: null,
  isLoading: true,
})

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [context, setContext] = useState<FrameContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initFrame = async () => {
      try {
        // Initialize the Farcaster Frame SDK
        const frameContext = await sdk.context

        // Mark SDK as ready
        setContext(frameContext)
        setIsSDKLoaded(true)

        // Tell Farcaster the frame is ready
        sdk.actions.ready()
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error)
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
