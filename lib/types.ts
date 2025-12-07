// Database Types
export type Currency = 'USDC' | 'ETH'
export type GameStatus = 'waiting' | 'active' | 'ended'
export type TransactionType = 'deposit' | 'cash_out' | 'payout'
export type TransactionStatus = 'pending' | 'confirmed' | 'failed'
export type PlayerStatus = 'pending' | 'deposited'

export interface Game {
  id: string
  created_at: string
  host_fid: number
  game_code: string
  location?: string | null
  buy_in_amount: number
  currency: Currency
  status: GameStatus
  started_at: string | null
  ended_at: string | null
}

export interface Player {
  id: string
  created_at: string
  game_id: string
  fid: number
  wallet_address: string
  total_deposited: number
  total_buy_ins: number
  chips_cashed_out: number
  final_chip_count: number
  payout_amount: number
  payout_sent: boolean
  status: PlayerStatus
}

export interface Transaction {
  id: string
  created_at: string
  game_id: string
  player_id: string
  type: TransactionType
  amount: number
  tx_hash: string | null
  status: TransactionStatus
}
