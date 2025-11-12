#!/bin/bash

# Setup script for Alpha Token deployment
# This script generates the program keypair and updates Anchor.toml

set -e

echo "🔧 Setting up Alpha Token project..."

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install Anchor first:"
    echo "   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    echo "   avm install 0.29.0"
    echo "   avm use 0.29.0"
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install Solana CLI first."
    exit 1
fi

# Generate program keypair if it doesn't exist
PROGRAM_KEYPAIR="target/deploy/alpha_token-keypair.json"
if [ ! -f "$PROGRAM_KEYPAIR" ]; then
    echo "📝 Generating program keypair..."
    mkdir -p target/deploy
    solana-keygen new --outfile "$PROGRAM_KEYPAIR" --no-bip39-passphrase
    echo "✅ Program keypair generated"
fi

# Get program ID
PROGRAM_ID=$(solana-keygen pubkey "$PROGRAM_KEYPAIR")
echo "🔑 Program ID: $PROGRAM_ID"

# Update Anchor.toml with the actual program ID
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/alpha_token = \".*\"/alpha_token = \"$PROGRAM_ID\"/" Anchor.toml
else
    # Linux
    sed -i "s/alpha_token = \".*\"/alpha_token = \"$PROGRAM_ID\"/" Anchor.toml
fi

# Update lib.rs with the actual program ID
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/declare_id!(\".*\");/declare_id!(\"$PROGRAM_ID\");/" programs/alpha-token/src/lib.rs
else
    # Linux
    sed -i "s/declare_id!(\".*\");/declare_id!(\"$PROGRAM_ID\");/" programs/alpha-token/src/lib.rs
fi

echo "✅ Configuration updated with program ID"
echo ""
echo "📋 Next steps:"
echo "   1. Run 'anchor build' to build the program"
echo "   2. Run 'npm install' to install dependencies"
echo "   3. Run 'npm run deploy' to deploy to testnet"
echo ""
echo "🎉 Setup complete!"

