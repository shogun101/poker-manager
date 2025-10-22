# Poker Manager - Farcaster Mini App

## Background and Motivation

The user wants to build a Poker Manager as a Farcaster mini app to solve real-world poker game management challenges:

**Problem Statement:**
- Managing live poker games involves tracking multiple players, buy-ins, mid-game cash-outs, and final payouts
- Manual calculation is error-prone and time-consuming
- Players need a seamless way to settle up using their Farcaster wallets
- Need transparency and real-time tracking for all participants

**User Requirements:**
1. Add players to a game session
2. Collect funds from players at the start
3. Track buy-ins per player (e.g., Player A takes 3 buy-ins, Player B takes 2)
4. Handle mid-game cash-outs
5. At game end, collect final chip counts from all players
6. Calculate each player's net win/loss
7. Distribute payouts directly to Farcaster wallets

**Target Platform:**
- Farcaster Mini Apps (lightweight web apps in Farcaster clients)
- Next.js 16 + React 19 + TypeScript (existing stack)
- Wallet integration for payments (Base network recommended)

## Key Challenges and Analysis

### Technical Architecture Decisions

**1. Farcaster Mini App Integration**
- **Challenge:** Understanding Farcaster mini app SDK and manifest requirements
- **Approach:** Use `@farcaster/mini-app` SDK, create `farcaster.json` manifest
- **Considerations:** Mini apps run in Farcaster clients, need proper authentication and wallet access

**2. Wallet & Payment Infrastructure**
- **Challenge:** Collecting funds and distributing payouts to Farcaster wallets
- **Options:**
  - **Option A (Recommended):** Use smart contract escrow pattern on Base network
    - ✅ Trustless, transparent, automated
    - ✅ Funds held securely until game ends
    - ❌ Requires gas fees, smart contract development
  - **Option B:** Custodial approach (app holds funds temporarily)
    - ✅ Simpler to implement
    - ❌ Trust issues, security risks, regulatory concerns
  - **Option C:** P2P settlement (players pay winner directly)
    - ✅ No escrow needed
    - ❌ Complex coordination, manual, not automated
- **Decision:** Start with Option A (smart contract escrow) for security and trust

**3. Game State Management**
- **Challenge:** Tracking complex game state (players, buy-ins, chips, cash-outs)
- **Approach:** 
  - Store game state in database (SQLite/PostgreSQL)
  - Real-time updates via React state + optional websockets for multiplayer
  - Immutable transaction log for audit trail

**4. Chip Accounting & Payout Calculation**
- **Challenge:** Accurately calculate who owes whom
- **Formula:**
  - Each player starts with: `total_bought_in = buy_in_amount * num_buyins`
  - At end: `chip_value = (final_chips / total_chips_on_table) * total_pot`
  - Net result: `payout = chip_value - total_bought_in`
  - If positive: player wins, if negative: player loses
- **Mid-game cash-out:** Remove player from final calculation, return their proportional value

**5. User Experience Simplicity**
- **Challenge:** Non-technical users need dead-simple interface
- **Approach:**
  - Step-by-step wizard: Setup → Play → End Game → Payouts
  - Clear visual feedback at each stage
  - Automatic calculations with transparent breakdown
  - One-click payout distribution

### Key Questions & Assumptions

**✅ USER DECISIONS (Confirmed):**
1. **Buy-in amount:** Host sets buy-in amount when creating game (flexible per game)
2. **Currency:** Flexible - support both USD/USDC and ETH on Base network
3. **Game host role:** Single game host (creator) controls the entire game
4. **End game flow:** 
   - Host enters remaining chips for each player
   - Host hits "Confirm and Distribute Winnings"
   - Winnings automatically distributed to player wallets
5. **Payment automation:** Full smart contract escrow with automated distribution (not manual)

**Implementation Decisions Based on Requirements:**
- Smart contract escrow pattern required for automated distribution
- Host-only permissions for critical actions (end game, add buy-ins, cash outs)
- Support both USDC and ETH - let host choose currency when creating game
- Simple UI flow: Create Game → Add Players → Collect Funds → Track Buy-ins → End Game → Auto Distribute

## High-level Task Breakdown

### Phase 0: Research & Setup (CURRENT)
- [ ] **Task 0.1:** Research Farcaster mini app SDK and requirements
  - Success: Document SDK setup steps, manifest format, authentication flow
- [ ] **Task 0.2:** Research wallet integration options (Dynamic, RainbowKit, or native)
  - Success: Choose wallet provider, document integration approach
- [ ] **Task 0.3:** Research Base network smart contract patterns for escrow
  - Success: Document smart contract architecture, find example implementations
- [ ] **Task 0.4:** Create project architecture document
  - Success: Clear tech stack, data models, API design, user flows

### Phase 1: Farcaster Mini App Foundation
- [ ] **Task 1.1:** Initialize Farcaster mini app SDK
  - Success: `npm create @farcaster/mini-app` runs successfully, basic app loads
- [ ] **Task 1.2:** Create and configure `farcaster.json` manifest
  - Success: Manifest validates, app appears in Farcaster client
- [ ] **Task 1.3:** Implement Farcaster authentication
  - Success: User can sign in with Farcaster ID, access user profile
- [ ] **Task 1.4:** Set up wallet connection (Dynamic or equivalent)
  - Success: User can connect wallet, view wallet address in app

### Phase 2: Core Data Models & Database
- [ ] **Task 2.1:** Design database schema (games, players, transactions)
  - Success: Schema documented with all fields, relationships, constraints
- [ ] **Task 2.2:** Set up database (PostgreSQL on Vercel or Supabase)
  - Success: Database provisioned, migrations run, connection from Next.js works
- [ ] **Task 2.3:** Create API routes for game CRUD operations
  - Success: Can create/read/update game via API, returns correct JSON
- [ ] **Task 2.4:** Create API routes for player and transaction operations
  - Success: Can add players, record buy-ins, cash-outs via API

### Phase 3: Smart Contract Development (Escrow)
- [ ] **Task 3.1:** Write smart contract for game escrow
  - Success: Contract compiles, passes unit tests for deposit/withdraw
- [ ] **Task 3.2:** Deploy contract to Base testnet
  - Success: Contract deployed, verified on BaseScan, functions callable
- [ ] **Task 3.3:** Integrate contract with Next.js app (wagmi/viem)
  - Success: App can call contract functions, handle transactions
- [ ] **Task 3.4:** Test full escrow flow (deposit → hold → distribute)
  - Success: End-to-end test with testnet USDC works correctly

### Phase 4: Game Creation & Management UI
- [ ] **Task 4.1:** Build "Create Game" form (buy-in amount, players)
  - Success: Form validates, creates game record, shows confirmation
- [ ] **Task 4.2:** Build "Add Players" interface with Farcaster user search
  - Success: Can search/add Farcaster users, see player list
- [ ] **Task 4.3:** Build "Collect Funds" flow with wallet prompts
  - Success: Each player deposits to escrow contract, balance updates
- [ ] **Task 4.4:** Build game dashboard (active game view)
  - Success: Shows all players, buy-ins, current status in real-time

### Phase 5: In-Game Tracking Features
- [ ] **Task 5.1:** Implement "Add Buy-in" button for players
  - Success: Host can record buy-ins, player balance updates, requires deposit
- [ ] **Task 5.2:** Implement "Cash Out" flow for mid-game exits
  - Success: Player cashes out, gets proportional payout, removed from final calc
- [ ] **Task 5.3:** Build transaction history view
  - Success: Shows all buy-ins, cash-outs with timestamps and amounts

### Phase 6: Game Completion & Payout
- [ ] **Task 6.1:** Build "End Game" UI to collect final chip counts
  - Success: All players enter chip counts, system validates total matches
- [ ] **Task 6.2:** Implement payout calculation algorithm
  - Success: Correctly calculates net win/loss for each player, shows breakdown
- [ ] **Task 6.3:** Build payout distribution interface
  - Success: Host triggers payout, smart contract distributes funds to wallets
- [ ] **Task 6.4:** Build post-game summary view
  - Success: Shows final results, transaction history, all players can view

### Phase 7: Polish & Production
- [ ] **Task 7.1:** Add error handling and loading states throughout
  - Success: All API errors show user-friendly messages, no crashes
- [ ] **Task 7.2:** Add responsive design and mobile optimization
  - Success: App works perfectly on mobile devices in Farcaster app
- [ ] **Task 7.3:** Write tests for critical flows (TDD where possible)
  - Success: Core business logic has test coverage >80%
- [ ] **Task 7.4:** Deploy to production (Vercel), test with real users
  - Success: App live, manifest accessible, works in production Farcaster

## Project Status Board

### To Do
- All Phase 0 tasks (research & planning)

### In Progress
- Planning mode active (this document creation)

### Completed
- ✅ Initial requirements gathering from user
- ✅ High-level architecture analysis
- ✅ Task breakdown with success criteria

### Blocked
- None currently

## Executor's Feedback or Assistance Requests

**✅ PLANNING COMPLETE - Ready for Executor Mode**

User has confirmed all requirements:
1. ✅ Buy-in amount set per game by host
2. ✅ Support both USDC and ETH currencies
3. ✅ Single host controls game
4. ✅ Automated wallet distribution at game end
5. ✅ Full smart contract implementation required

**Planner's Updated Strategy:**

Given the requirement for automated distribution, we must build with smart contracts from the start. However, to manage complexity, I recommend this phased approach:

**Phase A - Foundation (Start Here):**
- Set up Farcaster mini app structure
- Build core UI flows (create game, add players, track buy-ins)
- Implement game state management and payout calculation logic
- Test with mock data to validate UX

**Phase B - Smart Contract Integration:**
- Develop and test escrow smart contract
- Deploy to Base testnet
- Integrate wallet connections and contract calls
- Test full flow with testnet tokens

**Phase C - Production Ready:**
- Deploy to Base mainnet
- Add error handling and edge cases
- Polish UI and mobile responsiveness
- Production deployment

**Next Action:**
Executor mode can begin with Phase 0 (Research) and Phase 1 (Foundation) tasks. User should say "invoke executor mode" to proceed with implementation.

## Lessons

### User Specified Lessons
- Include info useful for debugging in the program output.
- Read the file before you try to edit it.
- If there are vulnerabilities that appear in the terminal, run npm audit before proceeding.
- Always ask before using the -force git command.

### Project-Specific Lessons
- Farcaster mini apps require `farcaster.json` manifest at `/.well-known/farcaster.json`
- Mini apps run within Farcaster clients, not as standalone sites
- Base network is recommended for Farcaster transactions (low fees, wide adoption)
- Need Node.js 22.11.0+ for Farcaster mini app SDK

