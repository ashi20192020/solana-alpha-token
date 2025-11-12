const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

/**
 * Example script showing how to transfer tokens with tax
 * 
 * Usage:
 *   node scripts/transfer-example.js <TOKEN_MINT> <TO_ADDRESS> <AMOUNT>
 * 
 * Example:
 *   node scripts/transfer-example.js <MINT_ADDRESS> <RECIPIENT_WALLET> 1000
 */

const CLUSTER = "testnet";
const RPC_URL = "https://api.testnet.solana.com";

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error("Usage: node transfer-example.js <TOKEN_MINT> <TO_ADDRESS> <AMOUNT>");
        process.exit(1);
    }

    const [tokenMintStr, toAddressStr, amountStr] = args;
    const tokenMint = new PublicKey(tokenMintStr);
    const toAddress = new PublicKey(toAddressStr);
    const amount = parseInt(amountStr);

    console.log("💸 Transferring tokens with tax...\n");
    console.log(`Token Mint: ${tokenMint.toString()}`);
    console.log(`To: ${toAddress.toString()}`);
    console.log(`Amount: ${amount} tokens\n`);

    // Load keypair
    const keypairPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME, ".config/solana/id.json");
    if (!fs.existsSync(keypairPath)) {
        throw new Error(`Wallet not found at ${keypairPath}`);
    }
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
    );

    // Connect to cluster
    const connection = new Connection(RPC_URL, "confirmed");
    const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(walletKeypair),
        { commitment: "confirmed" }
    );

    // Load program
    let programId;
    try {
        const anchorToml = fs.readFileSync(path.join(__dirname, "../Anchor.toml"), "utf-8");
        const match = anchorToml.match(/alpha_token = "([^"]+)"/);
        programId = match ? new PublicKey(match[1]) : new PublicKey("ALPHA1111111111111111111111111111111111");
    } catch {
        programId = new PublicKey("ALPHA1111111111111111111111111111111111");
    }

    const idlPath = path.join(__dirname, "../target/idl/alpha_token.json");
    if (!fs.existsSync(idlPath)) {
        throw new Error("IDL not found. Please run 'anchor build' first.");
    }
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const program = new anchor.Program(idl, programId, provider);

    // Get config PDA
    const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        program.programId
    );

    // Fetch config to get tax wallet
    const config = await program.account.config.fetch(configPda);
    const taxWallet = config.taxWallet;

    console.log(`Config PDA: ${configPda.toString()}`);
    console.log(`Tax Wallet: ${taxWallet.toString()}\n`);

    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        walletKeypair.publicKey
    );
    const toTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        toAddress
    );
    const taxTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        taxWallet
    );

    console.log(`From Token Account: ${fromTokenAccount.toString()}`);
    console.log(`To Token Account: ${toTokenAccount.toString()}`);
    console.log(`Tax Token Account: ${taxTokenAccount.toString()}\n`);

    // Calculate amounts (assuming 6 decimals)
    const decimals = 6;
    const amountWithDecimals = amount * Math.pow(10, decimals);
    const taxAmount = Math.floor((amountWithDecimals * 5) / 100);
    const transferAmount = amountWithDecimals - taxAmount;

    console.log(`Transfer Amount: ${transferAmount / Math.pow(10, decimals)} tokens`);
    console.log(`Tax Amount (5%): ${taxAmount / Math.pow(10, decimals)} tokens\n`);

    // Execute transfer
    try {
        console.log("📝 Executing transfer with tax...");
        const tx = await program.methods
            .transferWithTax(new anchor.BN(amountWithDecimals))
            .accounts({
                config: configPda,
                from: fromTokenAccount,
                to: toTokenAccount,
                taxWallet: taxTokenAccount,
                authority: walletKeypair.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

        console.log(`✅ Transfer successful!`);
        console.log(`Transaction: https://explorer.solana.com/tx/${tx}?cluster=${CLUSTER}\n`);
    } catch (error) {
        console.error("❌ Transfer failed:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });

