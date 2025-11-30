import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { host_fid, game_code, buy_in_amount, currency, status } = body

    // Validate required fields
    if (!host_fid || !game_code || !buy_in_amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create game', details: dbError },
        { status: 500 }
      )
    }

    return NextResponse.json({ game }, { status: 200 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
