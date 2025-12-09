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
      description: "Manage your poker games with crypto buy-ins on Base. Create games, invite friends, and distribute payouts seamlessly with USDC.",
      homeUrl: "https://poker-manager-murex.vercel.app",
      iconUrl: "https://poker-manager-murex.vercel.app/icon-192.png",
      imageUrl: "https://poker-manager-murex.vercel.app/og-image.png",
      splashImageUrl: "https://poker-manager-murex.vercel.app/splash.png",
      splashBackgroundColor: "#ffffff",
      webhookUrl: "https://poker-manager-murex.vercel.app/api/webhook"
    }
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
