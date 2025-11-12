# Solana Alpha Token - Deployment Checklist

## Pre-Deployment Checklist

- [ ] Solana CLI installed and configured for testnet
- [ ] Anchor framework installed (v0.29.0)
- [ ] Node.js installed (v18+)
- [ ] Rust installed (latest stable)
- [ ] Wallet created and funded with testnet SOL (minimum 2 SOL recommended)

## Deployment Steps

### 1. Initial Setup

```bash
# Run setup script to generate program keypair
./scripts/setup.sh

# Install Node.js dependencies
npm install
```

### 2. Configure Solana CLI

```bash
# Set to testnet
solana config set --url https://api.testnet.solana.com

# Verify wallet
solana address

# Check balance and airdrop if needed
solana balance
solana airdrop 2
```

### 3. Build and Deploy

```bash
# Build the program (or let deploy script do it)
anchor build

# Deploy everything (program + token)
npm run deploy
```

The deployment script will:
1. ✅ Build the program if not already built
2. ✅ Deploy the program to testnet
3. ✅ Create the SPL token mint
4. ✅ Mint 1,000,000 ALPHA tokens
5. ✅ Initialize the tax program
6. ✅ Set up tax wallet
7. ✅ Renounce mint authority
8. ✅ Renounce freeze authority
9. ✅ Renounce program ownership

### 4. Verify Deployment

After deployment, you'll receive:
- **Token Mint Address**: The address of your token
- **Tax Wallet Address**: Where tax payments go
- **Config PDA**: Program configuration account
- **Program ID**: The deployed program address

Verify on Solana Explorer:
```
https://explorer.solana.com/address/<TOKEN_MINT>?cluster=testnet
```

## Post-Deployment

### Save Important Information

⚠️ **CRITICAL**: Save the following information securely:

1. **Tax Wallet Private Key**: This wallet receives all tax payments
   - Displayed during deployment
   - Format: Array of numbers
   - Save this securely!

2. **Token Mint Address**: Your token's address on Solana

3. **Program ID**: The deployed program address

4. **Config PDA**: Configuration account address

### Test the Token

Transfer tokens with tax:

```bash
npm run transfer <TOKEN_MINT> <RECIPIENT_ADDRESS> <AMOUNT>
```

Example:
```bash
npm run transfer <MINT_ADDRESS> <RECIPIENT> 1000
```

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
anchor clean
anchor build
```

### Deployment Errors

- **Insufficient funds**: Get more testnet SOL
  ```bash
  solana airdrop 2
  ```

- **Program already deployed**: The program ID is fixed. If you need a new program ID, run `./scripts/setup.sh` again to generate a new keypair.

### Transaction Errors

- **Insufficient balance**: Ensure wallet has enough SOL for fees
- **Invalid accounts**: Verify all addresses are correct

## Manual Renouncement

If automatic renouncement fails, run manually:

```bash
node scripts/renounce.js <TOKEN_MINT_ADDRESS>
```

## Important Notes

1. **Tax Mechanism**: Tax only applies when using the `transfer_with_tax` instruction. Direct SPL transfers bypass the tax.

2. **Renouncement**: Once renounced, the contract cannot be modified. Ensure everything is correct before renouncing.

3. **Testnet Only**: This deployment is for testnet. For mainnet, ensure thorough testing and security audits.

4. **Tax Wallet**: The tax wallet private key is generated during deployment. Save it securely as it will receive all tax payments.

## Support

For issues, check:
- Solana Documentation: https://docs.solana.com/
- Anchor Documentation: https://www.anchor-lang.com/
- SPL Token Documentation: https://spl.solana.com/token

