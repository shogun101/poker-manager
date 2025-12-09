import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Cron job to clean up abandoned pending player records.
 *
 * Pending records are created before blockchain transactions.
 * If a transaction is abandoned (user closes app, rejects, timeout),
 * these records should be cleaned up.
 *
 * This runs every 5 minutes and deletes pending records older than 10 minutes.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Cron] Unauthorized cleanup attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting pending player cleanup...')

    // Calculate cutoff time (10 minutes ago)
    const cutoffTime = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    // Delete pending records older than 10 minutes
    const { data: deletedRecords, error } = await supabase
      .from('players')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', cutoffTime)
      .select()

    if (error) {
      console.error('[Cron] Error cleaning up pending records:', error)
      return NextResponse.json(
        { error: 'Cleanup failed', details: error.message },
        { status: 500 }
      )
    }

    const deletedCount = deletedRecords?.length || 0
    console.log(`[Cron] Cleanup complete. Deleted ${deletedCount} abandoned pending records.`)

    return NextResponse.json({
      success: true,
      deletedCount,
      cutoffTime,
      message: `Deleted ${deletedCount} pending records older than ${cutoffTime}`
    })
  } catch (err) {
    console.error('[Cron] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
