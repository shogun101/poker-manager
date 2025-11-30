import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  console.log('🔷 API /api/games/create called')

  try {
    const body = await request.json()
    console.log('📦 Request body:', body)

    const { host_fid, game_code, buy_in_amount, currency, status } = body

    // Validate required fields
    if (!host_fid || !game_code || !buy_in_amount || !currency) {
      console.error('❌ Missing required fields:', { host_fid, game_code, buy_in_amount, currency })
      return NextResponse.json(
        { error: 'Missing required fields', received: { host_fid, game_code, buy_in_amount, currency } },
        { status: 400 }
      )
    }

    console.log('📝 Inserting into database:', {
      host_fid,
      game_code,
      buy_in_amount,
      currency,
      status: status || 'waiting',
    })

    // Create game in database
    const { data: game, error: dbError } = await supabase
      .from('games')
      .insert({
        host_fid,
        game_code,
        buy_in_amount,
        currency,
        status: status || 'waiting',
      })
      .select()
      .single()

    console.log('📊 Database response:', { game, dbError })

    if (dbError) {
      console.error('❌ Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create game', details: dbError.message, code: dbError.code },
        { status: 500 }
      )
    }

    console.log('✅ Game created successfully:', game)
    return NextResponse.json({ game }, { status: 200 })
  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
