-- Poker Manager Database Schema
-- This creates the tables we need to manage poker games

-- Games Table: Stores each poker game session
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Game Info
  host_fid BIGINT NOT NULL,  -- Farcaster ID of the host
  game_code TEXT UNIQUE NOT NULL,  -- 6-digit code to join game

  -- Buy-in Settings
  buy_in_amount DECIMAL(20, 6) NOT NULL,  -- Amount per buy-in
  currency TEXT NOT NULL CHECK (currency IN ('USDC', 'ETH')),  -- Only USDC or ETH

  -- Game State
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Players Table: Tracks each player in a game
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Player Info
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  fid BIGINT NOT NULL,  -- Farcaster ID
  wallet_address TEXT NOT NULL,  -- Their Farcaster wallet

  -- Financial Tracking
  total_deposited DECIMAL(20, 6) DEFAULT 0,  -- Total they've put in escrow
  total_buy_ins INTEGER DEFAULT 0,  -- Number of buy-ins they've done
  chips_cashed_out DECIMAL(20, 6) DEFAULT 0,  -- Chips they cashed out mid-game
  final_chip_count DECIMAL(20, 6) DEFAULT 0,  -- Final chips at game end

  -- Payout
  payout_amount DECIMAL(20, 6) DEFAULT 0,  -- What they get back (calculated)
  payout_sent BOOLEAN DEFAULT FALSE,  -- Has payout been processed

  -- Constraints
  UNIQUE(game_id, fid)  -- Each player can only join a game once
);

-- Transactions Table: Logs all money movements
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Transaction Details
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Transaction Type
  type TEXT NOT NULL CHECK (type IN ('deposit', 'cash_out', 'payout')),
  amount DECIMAL(20, 6) NOT NULL,

  -- Blockchain Info (for later Phase B)
  tx_hash TEXT,  -- Transaction hash from blockchain
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed'))
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_games_code ON games(game_code);
CREATE INDEX IF NOT EXISTS idx_games_host ON games(host_fid);
CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_fid ON players(fid);
CREATE INDEX IF NOT EXISTS idx_transactions_game ON transactions(game_id);
CREATE INDEX IF NOT EXISTS idx_transactions_player ON transactions(player_id);
