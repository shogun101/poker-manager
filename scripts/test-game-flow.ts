// Test script to verify game creation and player flow
import { supabase } from '../lib/supabase'

async function testGameFlow() {
  console.log('🧪 Testing Poker Manager Game Flow\n')

  // Test 1: Create a game
  console.log('1️⃣  Creating a test game...')
  const testGameCode = 'TEST01'
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      host_fid: 12345,
      game_code: testGameCode,
      buy_in_amount: 10,
      currency: 'USDC',
      status: 'waiting',
    })
    .select()
    .single()

  if (gameError) {
    console.error('❌ Failed to create game:', gameError.message)
    return
  }

  console.log('✅ Game created:', {
    id: game.id,
    code: game.game_code,
    buy_in: `${game.buy_in_amount} ${game.currency}`,
  })

  // Test 2: Add a player
  console.log('\n2️⃣  Adding a player to the game...')
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      game_id: game.id,
      fid: 67890,
      wallet_address: '0x1234567890123456789012345678901234567890',
    })
    .select()
    .single()

  if (playerError) {
    console.error('❌ Failed to add player:', playerError.message)
  } else {
    console.log('✅ Player joined:', {
      fid: player.fid,
      buy_ins: player.total_buy_ins,
      deposited: player.total_deposited,
    })
  }

  // Test 3: Add a buy-in
  console.log('\n3️⃣  Adding a buy-in for the player...')
  const { data: updatedPlayer, error: buyInError } = await supabase
    .from('players')
    .update({
      total_buy_ins: 1,
      total_deposited: game.buy_in_amount,
    })
    .eq('id', player.id)
    .select()
    .single()

  if (buyInError) {
    console.error('❌ Failed to add buy-in:', buyInError.message)
  } else {
    console.log('✅ Buy-in added:', {
      fid: updatedPlayer.fid,
      buy_ins: updatedPlayer.total_buy_ins,
      deposited: updatedPlayer.total_deposited,
    })
  }

  // Test 4: Start the game
  console.log('\n4️⃣  Starting the game...')
  const { error: startError } = await supabase
    .from('games')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .eq('id', game.id)

  if (startError) {
    console.error('❌ Failed to start game:', startError.message)
  } else {
    console.log('✅ Game started')
  }

  // Test 5: End the game
  console.log('\n5️⃣  Ending the game...')
  const { error: endError } = await supabase
    .from('games')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', game.id)

  if (endError) {
    console.error('❌ Failed to end game:', endError.message)
  } else {
    console.log('✅ Game ended')
  }

  // Cleanup: Delete test data
  console.log('\n6️⃣  Cleaning up test data...')
  const { error: cleanupError } = await supabase
    .from('games')
    .delete()
    .eq('id', game.id)

  if (cleanupError) {
    console.error('❌ Failed to cleanup:', cleanupError.message)
  } else {
    console.log('✅ Test data cleaned up')
  }

  console.log('\n✨ All tests completed successfully!')
}

testGameFlow()
