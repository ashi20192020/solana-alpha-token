# Alpha Token - Complete Guide

Complete guide for verification and testing of the Alpha Token on Solana testnet.

## 📋 Important Addresses

- **Token Mint**: `EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB`
- **Program ID**: `EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR`
- **Config PDA**: `U1FaJHxfCYgbpCMbox38KPu2hXBNpmwBvU3fDfQ5R18`
- **Tax Wallet**: `4z7ELCZANByrAdHQj17SXz14Zxge4ixDdMQEb7QrMcjz`

## 🌐 Testnet URLs

### RPC Endpoints
- **Official Testnet RPC**: `https://api.testnet.solana.com`
- **Alternative RPCs** (if main one is slow):
  - `https://testnet.helius-rpc.com/?api-key=YOUR_API_KEY`
  - `https://rpc.ankr.com/solana_testnet`

### Explorer URLs
- **Solana Explorer (Testnet)**: `https://explorer.solana.com/?cluster=testnet`
- **Solscan (Testnet)**: `https://solscan.io/?cluster=testnet`
- **SolanaFM (Testnet)**: `https://solana.fm/?cluster=testnet-devnet`

## 🔗 Quick Explorer Links

- **Token Mint**: https://explorer.solana.com/address/EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB?cluster=testnet
- **Program**: https://explorer.solana.com/address/EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR?cluster=testnet
- **Config PDA**: https://explorer.solana.com/address/U1FaJHxfCYgbpCMbox38KPu2hXBNpmwBvU3fDfQ5R18?cluster=testnet
- **Tax Wallet**: https://explorer.solana.com/address/4z7ELCZANByrAdHQj17SXz14Zxge4ixDdMQEb7QrMcjz?cluster=testnet

---

## Part 1: Prerequisites & Setup

### 1. Configure Solana CLI for Testnet

```bash
solana config set --url https://api.testnet.solana.com
```

Verify configuration:
```bash
solana config get
```

**Expected output:**
```
RPC URL: https://api.testnet.solana.com
```

### 2. Check Your Wallet

```bash
solana address
solana balance
```

### 3. Get Testnet SOL (if needed)

```bash
solana airdrop 2
```

---

## Part 2: Verification

### Verification Steps

#### 1. Verify Token Details

```bash
spl-token display EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB
```

**Expected output:**
- Address: `EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB`
- Supply: `1000000000000` (1 million tokens with 6 decimals)
- Decimals: `6`
- Mint authority: `(not set)` ✅
- Freeze authority: `(not set)` ✅

#### 2. Verify Program Deployment

```bash
solana program show EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR --url testnet
```

**Expected output:**
- Program Id: `EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR`
- Authority: `none` ✅ (fully renounced)

#### 3. Verify Program Upgrade Authority

```bash
solana program show EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR --url testnet | grep Authority
```

**Expected:** `Authority: none` ✅

#### 4. Verify Program Initialization

```bash
solana account U1FaJHxfCYgbpCMbox38KPu2hXBNpmwBvU3fDfQ5R18 --url testnet
```

**Expected:**
- Account exists
- Owner: `EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR`
- Balance: ~0.001 SOL (rent-exempt)

### Verification Checklist

#### ✅ Requirements Met:

- [x] **Ticker: Alpha**
  - Token symbol: ALPHA
  - Token mint: `EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB`

- [x] **Total Supply: 1 million tokens**
  - Supply: 1,000,000 tokens (1,000,000,000,000 with 6 decimals)

- [x] **Tax: 5%**
  - Program initialized with tax wallet: `4z7ELCZANByrAdHQj17SXz14Zxge4ixDdMQEb7QrMcjz`
  - Tax rate: 5% (hardcoded in program)

- [x] **Contract Fully Renounced**
  - ✅ Mint Authority: Renounced (null)
  - ✅ Freeze Authority: Renounced (null)
  - ✅ Program Upgrade Authority: Renounced (none)
  - ✅ Program Ownership: Renounced (config.isRenounced = true)

---

## Part 3: Testing the 5% Tax

### Test Goal

Verify that when transferring tokens using `transfer_with_tax`:
- ✅ 5% goes to the tax wallet
- ✅ 95% goes to the recipient
- ✅ Sender loses exactly the transfer amount

### Step-by-Step Testing

#### Step 1: Check Your Token Balance

```bash
spl-token balance EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB
```

**Expected:** You should have some ALPHA tokens (up to 1,000,000).

**Note:** If you get "Token account not found", you may need to create the token account first:
```bash
spl-token create-account EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB
```

#### Step 2: Get a Recipient Address

**Option A: Use Your Own Wallet (Simplest)**
```bash
solana address
```

**Option B: Create a Separate Test Wallet (Recommended)**
```bash
solana-keygen new --outfile ~/test-recipient.json
solana address --keypair ~/test-recipient.json
```

**Note:** If you get "Could not find token account" when checking balance, that's NORMAL! Token accounts are created automatically on first transfer.

#### Step 3: Execute Transfer with Tax

Run the automated test script:

```bash
npm run test-tax EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB <RECIPIENT_ADDRESS> 1000
```

**Example:**
```bash
npm run test-tax EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB 4sLHchfZWMg7n8Lb1gRQLJVkAtt1Fh2b1vtibZyx8Gup 1000
```

**What the script does:**
1. Gets balances BEFORE transfer
2. Executes `transferWithTax` instruction
3. Gets balances AFTER transfer
4. Verifies the tax calculation automatically

**Expected Results for 1000 token transfer:**
- Sender loses: 1,000 tokens
- Tax wallet receives: 50 tokens (5%)
- Recipient receives: 950 tokens (95%)

**Expected output:**
```
🧪 TESTING 5% TAX FUNCTIONALITY
======================================================================

💰 Balances BEFORE transfer:
   Sender:     1,000,000 tokens
   Recipient:  0 tokens
   Tax Wallet: 0 tokens

📊 Expected transfer breakdown:
   Total Transfer: 1000 tokens
   Expected Tax (5%): 50 tokens
   Expected to Recipient (95%): 950 tokens

📝 Calling transferWithTax...
✅ Transfer transaction successful!

💰 Balances AFTER transfer:
   Sender:     999,000 tokens
   Recipient:  950 tokens
   Tax Wallet: 50 tokens

🧪 Running verification tests...
   Test 1 - Sender lost exact transfer amount: ✅ PASSED
   Test 2 - Tax wallet received 5%: ✅ PASSED
   Test 3 - Recipient received 95%: ✅ PASSED
   Test 4 - Total conservation (100%): ✅ PASSED

🎉 ALL TESTS PASSED! 5% tax is working correctly!
```

#### Step 4: Verify on Solana Explorer

The test script outputs a transaction link. Open it in your browser to verify:

**What to Check:**
1. **Transaction Status:** ✅ Should show "Success"
2. **Program Instruction:** ✅ Look for `transferWithTax`
3. **Token Transfers:** ✅ Should see TWO transfers:
   - Transfer to recipient: **950 tokens**
   - Transfer to tax wallet: **50 tokens**

#### Step 5: Manual Balance Verification (Optional)

```bash
# Check recipient balance
spl-token balance EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB --owner <RECIPIENT_ADDRESS>
# Expected: 950 tokens

# Check tax wallet balance
spl-token balance EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB --owner 4z7ELCZANByrAdHQj17SXz14Zxge4ixDdMQEb7QrMcjz
# Expected: 50 tokens
```

### Test with Different Amounts

**Transfer 500 tokens:**
```bash
npm run test-tax EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB <RECIPIENT_ADDRESS> 500
```
- Expected: 25 tokens to tax (5%), 475 to recipient (95%)

**Transfer 10,000 tokens:**
```bash
npm run test-tax EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB <RECIPIENT_ADDRESS> 10000
```
- Expected: 500 tokens to tax (5%), 9,500 to recipient (95%)

---

## Part 4: Viewing on Explorer

### View Token Mint

https://explorer.solana.com/address/EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB?cluster=testnet

**What to check:**
- ✅ Token name and symbol (Alpha/ALPHA)
- ✅ Total supply: 1,000,000 tokens
- ✅ Decimals: 6
- ✅ Mint authority: Should show as "None" (renounced)
- ✅ Freeze authority: Should show as "None" (renounced)

### View Program

https://explorer.solana.com/address/EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR?cluster=testnet

**What to check:**
- ✅ Program is deployed
- ✅ Program data account exists
- ✅ Recent transactions

### View Config PDA

https://explorer.solana.com/address/U1FaJHxfCYgbpCMbox38KPu2hXBNpmwBvU3fDfQ5R18?cluster=testnet

**What to check:**
- ✅ Account exists
- ✅ Account data shows tax wallet address

### View Tax Wallet

https://explorer.solana.com/address/4z7ELCZANByrAdHQj17SXz14Zxge4ixDdMQEb7QrMcjz?cluster=testnet

**What to check:**
- ✅ Wallet exists
- ✅ Token account for ALPHA token exists
- ✅ Balance (accumulated taxes from transfers)

---

## Part 5: Advanced Commands

### Check Token Supply
```bash
spl-token supply EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB
```

### Check Your Token Balance
```bash
spl-token balance EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB
```

### List All Token Accounts for a Wallet
```bash
spl-token accounts --owner <WALLET_ADDRESS>
```

### Get Token Account Info
```bash
spl-token account-info <TOKEN_ACCOUNT_ADDRESS>
```

### View Program on-Chain
```bash
solana program dump EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR program.so --url testnet
```

---

## Part 6: Troubleshooting

### Error: "Token account not found" or "Could not find token account"

**This is NORMAL and EXPECTED!** Token accounts are created automatically on the first transfer. You don't need to do anything - just proceed with the test.

### Error: "Insufficient balance"

**Solution:** Make sure you have enough tokens:
```bash
spl-token balance EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB
```

### Error: "Insufficient funds for transaction"

**Solution:** Get more testnet SOL:
```bash
solana airdrop 2
```

### Error: "Program not found"

**Solution:**
- Make sure you built the program: `anchor build`
- Check program ID in `Anchor.toml` matches the deployed program

### Test fails verification

**Check:**
1. Are you using the correct token mint address?
2. Are you on testnet? (`solana config get`)
3. Did the transaction actually succeed? (check explorer)

### Transaction not showing on explorer

**Solution:**
- Wait 10-30 seconds for blockchain propagation
- Check transaction signature is correct
- Verify you're viewing testnet explorer (`?cluster=testnet`)

### Explorer not loading

**Solution:**
- Try alternative explorer: Solscan or SolanaFM
- Check if testnet is operational: `solana cluster-version`

---

## Part 7: Important Notes

### Tax Mechanism

⚠️ **Important**: Direct SPL token transfers (bypassing the program) will NOT have tax applied. The tax only applies when using the program's `transfer_with_tax` function.

To enforce tax on ALL transfers, you would need to:
- Use Solana Token Extensions (Transfer Hook) - requires newer SPL Token version
- Or set up a DEX/router that routes all transfers through the program

### Renouncement

Once renounced, the contract cannot be modified. Ensure everything is correct before renouncing.

### Testnet Only

This deployment is for testnet. For mainnet, ensure thorough testing and security audits.

---

## Summary

After completing verification and testing, you should have confirmed:

✅ **Token Details:** Ticker Alpha, 1 million supply  
✅ **Tax Mechanism:** 5% tax working correctly  
✅ **Contract Renounced:** All authorities renounced  
✅ **Transfer Works:** 5% to tax wallet, 95% to recipient  
✅ **On-Chain Verification:** All transactions visible on explorer  

**The 5% tax mechanism is working correctly!** 🎉

