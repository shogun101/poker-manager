import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export async function GET() {
  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjYyOTIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhjMDk1NjhkRGIyOTgwMzY2RUJBMTMwQmZjY0E3YzlCMzIxQzQyQzMwIn0",
      payload: "eyJkb21haW4iOiJwb2tlci1tYW5hZ2VyLW11cmV4LnZlcmNlbC5hcHAifQ",
      signature: "HcTmeabiCMZEGvbZGZzuR4jea3Cd0/oreUbcETvni8Ihy/2PSr4jzQ/6QVRK5gB/ioOLPPXPHTkFHEYb2WkWhxw="
    },
    frame: {
      version: "1",
      name: "Poker Manager",
      subtitle: "USDC poker games on Base",
      tagline: "Poker with USDC on Base",
      description: "Manage your poker games with crypto buy-ins on Base. Create games, invite friends, and distribute payouts seamlessly with USDC.",
      homeUrl: "https://poker-manager-murex.vercel.app",
      iconUrl: "https://poker-manager-murex.vercel.app/icon-192.png",
      imageUrl: "https://poker-manager-murex.vercel.app/og-image.png",
      splashImageUrl: "https://poker-manager-murex.vercel.app/splash.png",
      webhookUrl: "https://poker-manager-murex.vercel.app/api/webhook",
      primaryCategory: "games",
      tags: ["poker", "base", "usdc", "PokerManager", "manager"],
      ogTitle: "Poker Manager",
      ogDescription: "Manage your poker games with crypto buy-ins on Base. Create games, invite friends, and distribute payouts seamlessly with USDC.",
      ogImageUrl: "https://poker-manager-murex.vercel.app/og-image.png"
    }
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
