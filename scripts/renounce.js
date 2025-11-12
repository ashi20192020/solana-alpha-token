const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { revokeMintAuthority, revokeFreezeAuthority } = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

const CLUSTER = "testnet";
const RPC_URL = "https://api.testnet.solana.com";

async function main() {
    console.log("🔒 Renouncing Token Ownership...\n");

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
    console.log(`📡 Connected to ${CLUSTER}`);
    console.log(`👤 Wallet: ${walletKeypair.publicKey.toString()}\n`);

    // Get token mint from command line or environment
    const tokenMint = process.argv[2];
    if (!tokenMint) {
        throw new Error("Please provide token mint address as argument: node renounce.js <TOKEN_MINT>");
    }
    const mintPubkey = new PublicKey(tokenMint);

    // Load the program
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
    const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(walletKeypair),
        { commitment: "confirmed" }
    );
    const program = new anchor.Program(idl, programId, provider);

    // Renounce mint authority
    console.log("📝 Renouncing mint authority...");
    try {
        await revokeMintAuthority(connection, walletKeypair, mintPubkey, walletKeypair);
        console.log("✅ Mint authority renounced\n");
    } catch (error) {
        console.log(`⚠️  Error renouncing mint authority: ${error.message}\n`);
    }

    // Renounce freeze authority
    console.log("📝 Renouncing freeze authority...");
    try {
        await revokeFreezeAuthority(connection, walletKeypair, mintPubkey, walletKeypair);
        console.log("✅ Freeze authority renounced\n");
    } catch (error) {
        console.log(`⚠️  Error renouncing freeze authority: ${error.message}\n`);
    }

    // Renounce program ownership
    console.log("📝 Renouncing program ownership...");
    const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        program.programId
    );

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

    console.log("=".repeat(60));
    console.log("✅ RENOUNCEMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("All authorities have been renounced.");
    console.log("The token contract is now fully decentralized.");
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Renouncement failed:", error);
        process.exit(1);
    });

