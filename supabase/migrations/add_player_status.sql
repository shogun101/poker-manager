-- Add status column to players table for tracking pending/deposited state
-- This prevents money loss when database updates fail after blockchain transactions

-- Step 1: Add status column with default value 'deposited'
ALTER TABLE players
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'deposited'
  CHECK (status IN ('pending', 'deposited'));

-- Step 2: Update all existing players to 'deposited' status
UPDATE players
SET status = 'deposited'
WHERE status IS NULL;

-- Step 3: Add index for faster queries on status and created_at
CREATE INDEX IF NOT EXISTS idx_players_status_created
  ON players(status, created_at);

-- Step 4: Create unique partial index to prevent duplicate pending records
-- This ensures a player can only have ONE pending transaction per game at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_per_player
  ON players(game_id, fid)
  WHERE status = 'pending';

-- Note: This partial index allows:
-- - Multiple 'deposited' players with same game_id+fid (re-buys)
-- - Only ONE 'pending' player per game_id+fid combo (prevents double-charging)

COMMENT ON COLUMN players.status IS 'Player transaction status: pending (awaiting blockchain) or deposited (confirmed)';
