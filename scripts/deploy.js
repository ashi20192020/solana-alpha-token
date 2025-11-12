const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

// Configuration
const CLUSTER = "testnet";
const RPC_URL = "https://api.testnet.solana.com";
const TOKEN_NAME = "Alpha";
const TOKEN_SYMBOL = "ALPHA";
const TOTAL_SUPPLY = 1_000_000; // 1 million tokens
const DECIMALS = 6;

async function main() {
    console.log("🚀 Starting Alpha Token Deployment...\n");

    // Load keypair
    const keypairPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME, ".config/solana/id.json");
    if (!fs.existsSync(keypairPath)) {
        throw new Error(`Wallet not found at ${keypairPath}. Please create a wallet first.`);
    }
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
    );

    // Connect to cluster
    const connection = new Connection(RPC_URL, "confirmed");
    console.log(`📡 Connected to ${CLUSTER}`);
    console.log(`👤 Wallet: ${walletKeypair.publicKey.toString()}\n`);

    // Check balance
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log(`💰 Balance: ${balance / 1e9} SOL`);
    if (balance < 2e9) {
        console.log("⚠️  Warning: Low balance. You may need more SOL for deployment.");
    }
    console.log();

    // Check if program is built
    const idlPath = path.join(__dirname, "../target/idl/alpha_token.json");
    const programSoPath = path.join(__dirname, "../target/deploy/alpha_token.so");
    
    if (!fs.existsSync(idlPath) || !fs.existsSync(programSoPath)) {
        console.log("⚠️  Program not built. Building now...");
        const { execSync } = require("child_process");
        try {
            execSync("anchor build", { stdio: "inherit", cwd: path.join(__dirname, "..") });
            console.log("✅ Build complete\n");
        } catch (error) {
            throw new Error("Build failed. Please run 'anchor build' manually.");
        }
    }

    // Load the program
    // Get program ID from Anchor.toml or use default
    let programId;
    try {
        const anchorToml = fs.readFileSync(path.join(__dirname, "../Anchor.toml"), "utf-8");
        const match = anchorToml.match(/alpha_token = "([^"]+)"/);
        programId = match ? new PublicKey(match[1]) : new PublicKey("ALPHA1111111111111111111111111111111111");
    } catch {
        programId = new PublicKey("ALPHA1111111111111111111111111111111111");
    }
    
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(walletKeypair),
        { commitment: "confirmed" }
    );
    const program = new anchor.Program(idl, programId, provider);

    // Deploy the program if not already deployed
    console.log("📝 Checking program deployment status...");
    const programInfo = await connection.getAccountInfo(programId);
    if (!programInfo) {
        console.log("📝 Deploying program to testnet...");
        const { execSync } = require("child_process");
        try {
            execSync("anchor deploy --provider.cluster testnet", { 
                stdio: "inherit", 
                cwd: path.join(__dirname, ".."),
                env: { ...process.env, ANCHOR_WALLET: keypairPath }
            });
            console.log("✅ Program deployed\n");
        } catch (error) {
            console.log("⚠️  Program deployment failed or already deployed. Continuing...\n");
        }
    } else {
        console.log("✅ Program already deployed\n");
    }

    // Create tax wallet (a new keypair for receiving taxes)
    const taxWallet = Keypair.generate();
    console.log(`💸 Tax Wallet: ${taxWallet.publicKey.toString()}`);
    console.log(`   (Save this private key for tax collection)\n`);

    // Step 1: Create SPL Token Mint
    console.log("📝 Step 1: Creating SPL Token Mint...");
    const mint = await createMint(
        connection,
        walletKeypair,
        walletKeypair.publicKey, // mint authority (will be renounced later)
        null, // freeze authority (will be renounced later)
        DECIMALS
    );
    console.log(`✅ Token Mint: ${mint.toString()}\n`);

    // Step 2: Create token account for initial supply
    console.log("📝 Step 2: Creating token account...");
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        walletKeypair,
        mint,
        walletKeypair.publicKey
    );
    console.log(`✅ Token Account: ${tokenAccount.address.toString()}\n`);

    // Step 3: Mint initial supply
    console.log(`📝 Step 3: Minting ${TOTAL_SUPPLY.toLocaleString()} tokens...`);
    await mintTo(
        connection,
        walletKeypair,
        mint,
        tokenAccount.address,
        walletKeypair,
        TOTAL_SUPPLY * Math.pow(10, DECIMALS)
    );
    console.log(`✅ Minted ${TOTAL_SUPPLY.toLocaleString()} tokens\n`);

    // Step 4: Create tax wallet token account
    console.log("📝 Step 4: Creating tax wallet token account...");
    const taxTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        walletKeypair,
        mint,
        taxWallet.publicKey
    );
    console.log(`✅ Tax Token Account: ${taxTokenAccount.address.toString()}\n`);

    // Step 5: Initialize the program
    console.log("📝 Step 5: Initializing program...");
    const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        program.programId
    );

    try {
        await program.methods
            .initialize(taxWallet.publicKey)
            .accounts({
                config: configPda,
                authority: walletKeypair.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        console.log(`✅ Program initialized`);
        console.log(`   Config PDA: ${configPda.toString()}\n`);
    } catch (error) {
        if (error.message.includes("already in use")) {
            console.log("⚠️  Program already initialized, continuing...\n");
        } else {
            throw error;
        }
    }

    // Step 6: Renounce mint authority
    console.log("📝 Step 6: Renouncing mint authority...");
    const { revokeMintAuthority } = require("@solana/spl-token");
    await revokeMintAuthority(
        connection,
        walletKeypair,
        mint,
        walletKeypair
    );
    console.log("✅ Mint authority renounced\n");

    // Step 7: Renounce freeze authority (if exists)
    console.log("📝 Step 7: Renouncing freeze authority...");
    try {
        const { revokeFreezeAuthority } = require("@solana/spl-token");
        await revokeFreezeAuthority(
            connection,
            walletKeypair,
            mint,
            walletKeypair
        );
        console.log("✅ Freeze authority renounced\n");
    } catch (error) {
        console.log("⚠️  No freeze authority to renounce\n");
    }

    // Step 8: Renounce program ownership
    console.log("📝 Step 8: Renouncing program ownership...");
    try {
        await program.methods
            .renounceOwnership()
            .accounts({
                config: configPda,
                authority: walletKeypair.publicKey,
            })
            .rpc();
        console.log("✅ Program ownership renounced\n");
    } catch (error) {
        console.log(`⚠️  Error renouncing program ownership: ${error.message}\n`);
    }

    // Summary
    console.log("=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log(`Token Name: ${TOKEN_NAME}`);
    console.log(`Token Symbol: ${TOKEN_SYMBOL}`);
    console.log(`Token Mint: ${mint.toString()}`);
    console.log(`Total Supply: ${TOTAL_SUPPLY.toLocaleString()} ${TOKEN_SYMBOL}`);
    console.log(`Tax Rate: 5%`);
    console.log(`Tax Wallet: ${taxWallet.publicKey.toString()}`);
    console.log(`Config PDA: ${configPda.toString()}`);
    console.log(`Program ID: ${programId.toString()}`);
    console.log("\n📋 View on Solana Explorer:");
    console.log(`   https://explorer.solana.com/address/${mint.toString()}?cluster=${CLUSTER}`);
    console.log("\n⚠️  IMPORTANT: Save the tax wallet private key:");
    console.log(`   ${JSON.stringify(Array.from(taxWallet.secretKey))}`);
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });

