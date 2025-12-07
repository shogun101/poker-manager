# 🔍 What Could Go Wrong? - Edge Case Analysis

## Database-First Approach: Potential Issues

---

## ⚠️ Potential Problem #1: Pending Records Pile Up

### Scenario
```
1. User creates pending record ✅
2. User closes browser before approving transaction 💀
3. Pending record stays in DB forever
4. Repeat 100 times = 100 abandoned pending records
```

### Impact
- Database fills with junk pending records
- Queries slower (filtering out pending records)
- Confusing when looking at raw DB data

### Solution
**Cleanup job**: Delete pending records older than 10 minutes
```typescript
// Run every 5 minutes via cron
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
await supabase
  .from('players')
  .delete()
  .eq('status', 'pending')
  .lt('created_at', tenMinutesAgo)
```

**Alternative**: Use database trigger instead of cron job

---

## ⚠️ Potential Problem #2: Duplicate Join Attempts

### Scenario
```
1. User clicks "Join Game"
2. Creates pending record ✅
3. User impatient, clicks "Join Game" AGAIN 💀
4. Creates ANOTHER pending record
5. Both start blockchain transactions
6. User pays twice!
```

### Impact
- User deposits buy-in amount TWICE
- Two pending records for same player
- Confusing state

### Solution #1: Disable button while pending
```typescript
// Before starting
if (player && player.status === 'pending') {
  setError('Transaction already in progress. Please wait...')
  return
}

// Disable join button
disabled={isJoining || player?.status === 'pending'}
```

### Solution #2: Database unique constraint
```sql
-- Prevent duplicate pending records for same player
CREATE UNIQUE INDEX idx_one_pending_per_player
  ON players(game_id, fid)
  WHERE status = 'pending';

-- This allows:
-- - Multiple deposited players with same FID (re-buys)
-- - Only ONE pending record per game/player combo
```

---

## ⚠️ Potential Problem #3: Race Condition on Status Update

### Scenario
```
1. Blockchain succeeds ✅
2. Start updating status to 'deposited'
3. User refreshes page mid-update 💀
4. Two update queries run simultaneously
5. Both try to update same record
```

### Impact
- Minimal - both updates do the same thing
- Might see duplicate logs
- No data corruption (both set status='deposited')

### Solution
Not actually a problem! Updating same value multiple times is idempotent (safe).

---

## ⚠️ Potential Problem #4: Blockchain Succeeds, ALL Retries Fail

### Scenario
```
1. Create pending ✅
2. Blockchain succeeds ✅
3. Update to deposited... fails ❌
4. Retry 1... fails ❌
5. Retry 2... fails ❌
6. Retry 3... fails ❌
7. Supabase is completely down for 30 minutes
```

### Impact
- Money IS in contract ✅
- Player shows as "pending" in UI ⚠️
- Other players might not see them
- Player might think transaction failed

### Solution #1: Show pending state in UI
```typescript
{player.status === 'pending' && (
  <div className="bg-yellow-50 border-2 border-yellow-500 rounded-xl p-4">
    <p className="text-yellow-800">
      ⏳ Transaction confirmed on blockchain!
      Finalizing your join... (this may take a moment)
    </p>
    <p className="text-sm text-yellow-600 mt-2">
      Your USDC has been deposited. You're good to play!
    </p>
  </div>
)}
```

### Solution #2: Keep retrying in background
```typescript
// After all initial retries fail, keep trying every 30s
const retryInterval = setInterval(async () => {
  const { error } = await supabase
    .update({ status: 'deposited' })
    .eq('id', player.id)

  if (!error) {
    clearInterval(retryInterval)
    console.log('✅ Finally updated!')
    refetchPlayer()
  }
}, 30000) // Every 30 seconds
```

### Solution #3: Admin recovery
Host can manually verify and update:
```sql
-- Check blockchain for deposits
-- Then update in DB
UPDATE players
SET status = 'deposited'
WHERE id = 'xxx' AND status = 'pending';
```

---

## ⚠️ Potential Problem #5: User Creates Pending Then Blockchain Fails

### Scenario
```
1. Create pending record ✅
2. User clicks approve in wallet
3. Wallet rejects (user clicks cancel) ❌
4. Blockchain transaction never happens
5. Pending record stays in DB
```

### Impact
- Pending record exists but no money in contract
- User not actually joined
- Record will be cleaned up in 10 minutes

### Solution
Clean up pending on error:
```typescript
try {
  await depositUSDC(...)
} catch (err) {
  // Transaction failed/cancelled - delete pending record
  await supabase
    .from('players')
    .delete()
    .eq('id', pendingPlayer.id)

  setPlayer(null)
  throw err // Re-throw to show error to user
}
```

This ensures pending records ONLY exist during active transactions.

---

## ⚠️ Potential Problem #6: Supabase Down When Creating Pending

### Scenario
```
1. User clicks "Join Game"
2. Try to create pending record
3. Supabase is completely down ❌
4. Can't create pending record
```

### Impact
- User can't join at all
- But also can't lose money! (no blockchain transaction attempted)

### Solution
This is actually SAFE! We fail early before touching blockchain:
```typescript
const { data: pendingPlayer, error } = await supabase.insert(...)

if (error) {
  setError('Unable to connect to game server. Please try again.')
  return // ✅ Exit before blockchain, no money at risk
}
```

**Better than current**: Right now if Supabase is down AFTER blockchain, money is lost!

---

## ⚠️ Potential Problem #7: Network Drops Between Create and Blockchain

### Scenario
```
1. Create pending record ✅
2. Network disconnects 💀
3. Blockchain transaction never starts
4. Pending record orphaned
```

### Impact
- Pending record with no blockchain transaction
- Will be cleaned up in 10 minutes by cron
- User sees error, can retry

### Solution
Already handled by cleanup job + try-catch cleanup.

---

## ⚠️ Potential Problem #8: Multiple Browser Tabs

### Scenario
```
1. User opens game in Tab 1
2. User opens game in Tab 2
3. Both tabs try to join simultaneously
4. Create 2 pending records?
```

### Impact
Could create duplicate pending records and double-charge user.

### Solution
Use the unique index from Problem #2:
```sql
CREATE UNIQUE INDEX idx_one_pending_per_player
  ON players(game_id, fid)
  WHERE status = 'pending';
```

Second tab's insert will fail with constraint error:
```typescript
if (error?.code === '23505') { // Unique violation
  setError('You are already joining this game in another tab!')
  return
}
```

---

## ⚠️ Potential Problem #9: Re-buy While Pending

### Scenario
```
1. Player joins game (pending) ✅
2. Player wants to re-buy immediately
3. Still in pending state from first buy-in
4. Clicks "Buy In Again"
```

### Impact
- Might create another pending record
- Or block legitimate re-buy

### Solution
Check status before allowing re-buy:
```typescript
if (player) {
  if (player.status === 'pending') {
    setError('Please wait for your current transaction to complete before buying in again.')
    return
  }

  // Allow re-buy for deposited players
  // Re-buys update total_buy_ins, not create new records
}
```

---

## ⚠️ Potential Problem #10: Clock Skew / Timestamp Issues

### Scenario
```
1. User's device clock is wrong (set to past)
2. Create pending record with old timestamp
3. Cleanup job immediately deletes it (thinks it's >10 min old)
```

### Impact
- Pending record deleted while transaction in progress
- Orphaned blockchain transaction

### Solution
Use **server-side timestamps**, not client-side:
```typescript
// Don't do this:
created_at: new Date().toISOString() // ❌ Client clock

// Do this:
created_at: // Let Supabase set it with NOW() ✅
```

Supabase `created_at` defaults to server time, so we're safe!

---

## ⚠️ Potential Problem #11: Blockchain Succeeds But Wrong Amount

### Scenario
```
1. Create pending for $10 buy-in
2. Bug causes blockchain to deposit $100
3. Update status to deposited
4. Player overpaid!
```

### Impact
- Player charged wrong amount
- Contract has more money than DB expects

### Solution
This is a SEPARATE bug in current code (not related to pending/deposited).

**Add amount verification**:
```typescript
// Before creating pending
const expectedAmount = game.buy_in_amount

// After blockchain
const actualDeposit = await getDepositAmount(txHash) // Read from blockchain
if (actualDeposit !== expectedAmount) {
  console.error('⚠️ Amount mismatch!', { expected: expectedAmount, actual: actualDeposit })
  // Still mark as deposited but log error for investigation
}
```

---

## ⚠️ Potential Problem #12: Database Migration Timing

### Scenario
```
1. Deploy new code with pending/deposited logic
2. Database still doesn't have `status` column
3. Insert fails
```

### Impact
- App breaks completely
- No one can join games

### Solution
**Two-phase deployment**:

**Phase 1**: Add column with default value
```sql
ALTER TABLE players
ADD COLUMN status VARCHAR(20) DEFAULT 'deposited';

UPDATE players SET status = 'deposited' WHERE status IS NULL;
```

**Phase 2**: Deploy new code that uses `status`

This ensures backward compatibility during migration.

---

## 🎯 Summary: Realistic Risks

### High Impact, High Probability
1. **Pending records pile up** → ✅ SOLVED: Cleanup job
2. **Duplicate join attempts** → ✅ SOLVED: Unique index + button disable

### High Impact, Low Probability
3. **All retries fail** → ✅ HANDLED: Show pending state, background retry, admin can fix
4. **Multiple tabs** → ✅ SOLVED: Unique index

### Low Impact, Any Probability
5. **Race conditions on update** → ✅ SAFE: Idempotent operation
6. **Network issues** → ✅ HANDLED: Try-catch cleanup
7. **Supabase down when creating pending** → ✅ SAFE: Fail early, no money lost
8. **Re-buy while pending** → ✅ SOLVED: Check status first

### Already Handled
9. **Blockchain fails** → ✅ SOLVED: Delete pending on error
10. **Clock skew** → ✅ SAFE: Server-side timestamps
11. **Migration timing** → ✅ SOLVED: Two-phase deployment

---

## 🛡️ Defense in Depth

Layer 1: **Prevent** (Unique constraints, button disabling)
Layer 2: **Retry** (Automatic retry on failure)
Layer 3: **Cleanup** (Cron job removes orphans)
Layer 4: **Recovery** (Admin can manually fix)
Layer 5: **Monitoring** (Log all pending→deposited failures)

---

## Final Answer: What Could Go Wrong?

**Honestly?** Very little that isn't already handled.

The worst case is: "All retries fail and player shows as pending for a few minutes until background retry succeeds or admin fixes it."

But even in that worst case:
- ✅ Money is safely in the contract
- ✅ Transaction succeeded on blockchain
- ✅ Easy to fix with one SQL query
- ✅ No manual refunds needed

**Much better than current worst case:**
- ❌ Money in contract
- ❌ No database record at all
- ❌ Player thinks they lost money
- ❌ Host has to manually send USDC back via blockchain

---

## Confidence Level

**95%** this approach is significantly more robust than current implementation.

The 5% uncertainty is around Supabase edge cases we haven't seen yet, but even those are recoverable.

**Recommendation**: Implement with monitoring/logging to catch any edge cases we haven't thought of.
