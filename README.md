# Solana Alpha Token - Testnet Deployment

A Solana token with 5% tax on all transfers, deployed on Solana testnet.

## Token Details

- **Ticker**: ALPHA
- **Total Supply**: 1,000,000 tokens
- **Tax Rate**: 5% on all transfers (when using `transfer_with_tax`)
- **Decimals**: 6
- **Network**: Solana Testnet

## Important Addresses

- **Token Mint**: `EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB`
- **Program ID**: `EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR`
- **Config PDA**: `U1FaJHxfCYgbpCMbox38KPu2hXBNpmwBvU3fDfQ5R18`
- **Tax Wallet**: `4z7ELCZANByrAdHQj17SXz14Zxge4ixDdMQEb7QrMcjz`

## Prerequisites

Before deploying, ensure you have the following installed:

1. **Solana CLI** (v1.18+)
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/v1.18.14/install)"
   ```

2. **Anchor Framework** (v0.29.0)
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install 0.29.0
   avm use 0.29.0
   ```

3. **Node.js** (v18+)
   ```bash
   # Using nvm
   nvm install 18
   nvm use 18
   ```

4. **Rust** (latest stable)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

## Quick Start

1. **Run setup script** (generates program keypair and updates config)
   ```bash
   ./scripts/setup.sh
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Solana CLI for testnet**
   ```bash
   solana config set --url https://api.testnet.solana.com
   ```

4. **Create or use existing wallet**
   ```bash
   # Create new wallet (if needed)
   solana-keygen new --outfile ~/.config/solana/id.json
   
   # Check wallet address
   solana address
   ```

5. **Fund your wallet with testnet SOL**
   ```bash
   # Request airdrop
   solana airdrop 2
   
   # Check balance
   solana balance
   ```

6. **Build the program**
   ```bash
   anchor build
   ```

7. **Deploy to testnet**
   ```bash
   npm run deploy
   ```

## Build

Build the Anchor program:

```bash
anchor build
```

This will:
- Compile the Rust program
- Generate the IDL (Interface Definition Language)
- Create the program binary

## Deploy

### Full Deployment Script (Recommended)

The deployment script handles everything automatically:

```bash
npm run deploy
```

This script will:
1. ✅ Build the program if not already built
2. ✅ Deploy the program to testnet
3. ✅ Create the SPL token mint
4. ✅ Mint 1,000,000 ALPHA tokens
5. ✅ Initialize the tax program
6. ✅ Set up the tax wallet
7. ✅ Renounce mint authority
8. ✅ Renounce freeze authority
9. ✅ Renounce program ownership

### Manual Deployment

1. **Deploy the program**
   ```bash
   anchor deploy --provider.cluster testnet
   ```

2. **Run the deployment script**
   ```bash
   node scripts/deploy.js
   ```

## Testing

### Test the 5% Tax

Run the automated test script to verify the tax works correctly:

```bash
npm run test-tax <TOKEN_MINT> <RECIPIENT_ADDRESS> <AMOUNT>
```

**Example:**
```bash
npm run test-tax EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB 4sLHchfZWMg7n8Lb1gRQLJVkAtt1Fh2b1vtibZyx8Gup 1000
```

This will:
- Transfer 1000 tokens
- Apply 5% tax (50 tokens to tax wallet)
- Send 950 tokens to recipient
- Automatically verify all amounts are correct

**Expected Results:**
- ✅ Sender loses: 1000 tokens
- ✅ Tax wallet receives: 50 tokens (5%)
- ✅ Recipient receives: 950 tokens (95%)

For detailed testing instructions, see [TESTING.md](./TESTING.md).

## Program Architecture

The program implements a tax mechanism that:

- **Intercepts transfers**: Token transfers go through the `transfer_with_tax` function
- **Calculates tax**: 5% of each transfer amount
- **Distributes funds**: Tax goes to the designated tax wallet, remainder to recipient
- **Prevents changes**: Once renounced, the contract cannot be modified

### Key Accounts

- **Config PDA**: Stores tax wallet address and renouncement status
- **Tax Wallet**: Receives all tax payments (5% of transfers)
- **Token Mint**: Standard SPL token mint

## Usage

### Transfer Tokens with Tax

To transfer tokens through the program (with tax applied), use the `transfer_with_tax` instruction:

```javascript
await program.methods
    .transferWithTax(amount)
    .accounts({
        config: configPda,
        from: fromTokenAccount,
        to: toTokenAccount,
        taxWallet: taxTokenAccount,
        authority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
```

Or use the test script:

```bash
npm run test-tax <TOKEN_MINT> <RECIPIENT_ADDRESS> <AMOUNT>
```

### Direct SPL Transfers

⚠️ **Important**: Direct SPL token transfers (bypassing the program) will NOT have tax applied. The tax only applies when using the program's `transfer_with_tax` function.

To enforce tax on ALL transfers, you would need to:
- Use Solana Token Extensions (Transfer Hook) - requires newer SPL Token version
- Or set up a DEX/router that routes all transfers through the program

## Renouncing Ownership

The deployment script automatically renounces all authorities. Once renounced:
- ✅ Mint authority is disabled (no more tokens can be minted)
- ✅ Freeze authority is disabled (tokens cannot be frozen)
- ✅ Program ownership is renounced (config cannot be changed)

**Note**: Once renounced, the contract cannot be modified. Ensure everything is correct before renouncing.

## Verification

After deployment, verify your token on Solana Explorer:

- **Token Mint**: https://explorer.solana.com/address/EYZ35itafVgJTF4X7hQTt84WCTzERXFpBNpqcnbPTapB?cluster=testnet
- **Program**: https://explorer.solana.com/address/EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR?cluster=testnet
- **Config PDA**: https://explorer.solana.com/address/U1FaJHxfCYgbpCMbox38KPu2hXBNpmwBvU3fDfQ5R18?cluster=testnet
- **Tax Wallet**: https://explorer.solana.com/address/4z7ELCZANByrAdHQj17SXz14Zxge4ixDdMQEb7QrMcjz?cluster=testnet

For detailed verification and testing instructions, see [TESTING.md](./TESTING.md).

## Important Notes

⚠️ **Security Considerations**:

1. **Tax Wallet**: Save the tax wallet private key securely. This wallet will receive all tax payments.

2. **Renouncement**: Once renounced, the contract cannot be modified. The deployment script automatically renounces all authorities.

3. **Direct Transfers**: Users can still transfer tokens directly using SPL Token, bypassing the tax. To enforce tax on ALL transfers, you would need to:
   - Use Solana Token Extensions (Transfer Hook) - requires newer SPL Token version
   - Or set up a DEX/router that routes all transfers through the program

4. **Testnet Only**: This deployment is for testnet. For mainnet, ensure thorough testing and security audits.

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clean and rebuild
anchor clean
anchor build
```

### Deployment Errors

- **Insufficient funds**: Ensure you have at least 2 SOL for deployment
  ```bash
  solana airdrop 2
  ```

- **Program already deployed**: The program ID is fixed. If you need a new program ID, run `./scripts/setup.sh` again to generate a new keypair.

### Transaction Errors

- **Insufficient balance**: Ensure the wallet has enough SOL for transaction fees
- **Invalid accounts**: Verify all account addresses are correct

## Available Scripts

- `npm run build` - Build the Anchor program
- `npm run deploy` - Full deployment (program + token + renounce)
- `npm run deploy-program` - Deploy only the program
- `npm run test-tax` - Test the 5% tax functionality
- `npm test` - Run Anchor tests

## Project Structure

```
.
├── programs/
│   └── alpha-token/
│       └── src/
│           └── lib.rs          # Main program logic
├── scripts/
│   ├── deploy.js                # Full deployment script
│   ├── test-tax.js              # Tax testing script
│   └── setup.sh                 # Initial setup script
├── TESTING.md                   # Complete testing and verification guide
├── Anchor.toml                  # Anchor configuration
├── Cargo.toml                   # Rust workspace config
└── package.json                 # Node.js dependencies
```

## Documentation

- **[TESTING.md](./TESTING.md)** - Complete guide for verification and testing

## License

MIT

## Support

For issues or questions, please check:
- [Solana Documentation](https://docs.solana.com/)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [SPL Token Documentation](https://spl.solana.com/token)
