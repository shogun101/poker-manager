import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#581c87',
          background: 'linear-gradient(to bottom right, #581c87, #4c1d95, #4338ca)',
        }}
      >
        <div style={{ fontSize: 120, marginBottom: 20 }}>♠️</div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 'bold',
            color: 'white',
            marginBottom: 10,
          }}
        >
          Poker Manager
        </div>
        <div
          style={{
            fontSize: 30,
            color: '#e9d5ff',
            textAlign: 'center',
          }}
        >
          Manage live poker games with automated settlements
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
