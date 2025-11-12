# Solana Alpha Token - Testnet Deployment

A Solana token with 5% tax on all buy/sell/transfer operations, deployed on testnet.

## Token Details

- **Ticker**: ALPHA
- **Total Supply**: 1,000,000 tokens
- **Tax Rate**: 5% on all transfers
- **Decimals**: 6
- **Network**: Solana Testnet

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

### Option 1: Full Deployment Script (Recommended)

The deployment script handles everything automatically:

```bash
npm run deploy
```

This script will:
1. Create the SPL token mint
2. Mint 1 million tokens
3. Initialize the tax program
4. Set up the tax wallet
5. Renounce mint authority
6. Renounce freeze authority
7. Renounce program ownership

### Option 2: Manual Deployment

1. **Deploy the program**
   ```bash
   anchor deploy --provider.cluster testnet
   ```

2. **Run the deployment script**
   ```bash
   node scripts/deploy.js
   ```

3. **Renounce ownership (if not done automatically)**
   ```bash
   node scripts/renounce.js <TOKEN_MINT_ADDRESS>
   ```

## Program Architecture

The program implements a tax mechanism that:

- **Intercepts transfers**: All token transfers go through the `transfer_with_tax` function
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

### Direct SPL Transfers

⚠️ **Important**: Direct SPL token transfers (bypassing the program) will NOT have tax applied. The tax only applies when using the program's `transfer_with_tax` function.

To enforce tax on ALL transfers, you would need to:
- Use Solana Token Extensions (Transfer Hook) - requires newer SPL Token version
- Or set up a DEX/router that routes all transfers through the program

For this implementation, the tax applies when users explicitly use the `transfer_with_tax` instruction.

## Renouncing Ownership

The contract can be renounced using:

```bash
node scripts/renounce.js <TOKEN_MINT_ADDRESS>
```

Or programmatically:

```javascript
await program.methods
    .renounceOwnership()
    .accounts({
        config: configPda,
        authority: wallet.publicKey,
    })
    .rpc();
```

Once renounced:
- ✅ Mint authority is disabled (no more tokens can be minted)
- ✅ Freeze authority is disabled (tokens cannot be frozen)
- ✅ Program ownership is renounced (config cannot be changed)

## Verification

After deployment, verify your token on Solana Explorer:

```
https://explorer.solana.com/address/<TOKEN_MINT_ADDRESS>?cluster=testnet
```

## Important Notes

⚠️ **Security Considerations**:

1. **Tax Wallet**: Save the tax wallet private key securely. This wallet will receive all tax payments.

2. **Renouncement**: Once renounced, the contract cannot be modified. Ensure everything is correct before renouncing.

3. **Direct Transfers**: Users can still transfer tokens directly using SPL Token, bypassing the tax. To enforce tax on ALL transfers, you would need to:
   - Set the program as the mint authority (not recommended for renounced tokens)
   - Or use a more complex mechanism with transfer hooks (Solana Token Extensions)

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
- **Program already deployed**: The program ID is fixed. If redeploying, you may need to update the program ID in `Anchor.toml` and `lib.rs`

### Transaction Errors

- **Insufficient balance**: Ensure the wallet has enough SOL for transaction fees
- **Invalid accounts**: Verify all account addresses are correct

## Development

### Project Structure

```
.
├── programs/
│   └── alpha-token/
│       └── src/
│           └── lib.rs          # Main program logic
├── scripts/
│   ├── deploy.js                # Deployment script
│   └── renounce.js              # Renounce script
├── Anchor.toml                  # Anchor configuration
├── Cargo.toml                   # Rust workspace config
└── package.json                 # Node.js dependencies
```

## License

MIT

## Support

For issues or questions, please check:
- [Solana Documentation](https://docs.solana.com/)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [SPL Token Documentation](https://spl.solana.com/token)

