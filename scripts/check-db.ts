// Quick script to check if database tables exist
import { supabase } from '../lib/supabase'

async function checkDatabase() {
  console.log('Checking database tables...\n')

  // Check games table
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('*')
    .limit(1)

  if (gamesError) {
    console.log('❌ Games table:', gamesError.message)
  } else {
    console.log('✅ Games table exists')
  }

  // Check players table
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .limit(1)

  if (playersError) {
    console.log('❌ Players table:', playersError.message)
  } else {
    console.log('✅ Players table exists')
  }

  // Check transactions table
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('*')
    .limit(1)

  if (transactionsError) {
    console.log('❌ Transactions table:', transactionsError.message)
  } else {
    console.log('✅ Transactions table exists')
  }

  console.log('\n✨ Database check complete!')
}

checkDatabase()
