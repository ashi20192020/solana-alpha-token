const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount, getMint, getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

/**
 * Test script to verify 5% tax works correctly
 * 
 * This script:
 * 1. Gets balances BEFORE transfer
 * 2. Transfers tokens using transfer_with_tax instruction
 * 3. Gets balances AFTER transfer
 * 4. Verifies that 5% went to tax wallet and 95% went to recipient
 * 
 * Usage:
 *   node scripts/test-tax.js <TOKEN_MINT> <RECIPIENT_ADDRESS> <AMOUNT>
 * 
 * Example:
 *   node scripts/test-tax.js ABC123... XYZ789... 1000
 */

const CLUSTER = "testnet";
const RPC_URL = "https://api.testnet.solana.com";
const TAX_RATE = 5; // 5%

async function getTokenBalance(connection, tokenMint, walletAddress) {
    try {
        const tokenAccount = await getAssociatedTokenAddress(tokenMint, walletAddress);
        const account = await getAccount(connection, tokenAccount);
        return account.amount;
    } catch (error) {
        // Account doesn't exist yet
        return BigInt(0);
    }
}

function formatBalance(amount, decimals) {
    return Number(amount) / Math.pow(10, decimals);
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error("Usage: node test-tax.js <TOKEN_MINT> <RECIPIENT_ADDRESS> <AMOUNT>");
        console.error("Example: node test-tax.js ABC123... XYZ789... 1000");
        process.exit(1);
    }

    const [tokenMintStr, toAddressStr, amountStr] = args;
    const tokenMint = new PublicKey(tokenMintStr);
    const toAddress = new PublicKey(toAddressStr);
    const amount = parseInt(amountStr);

    console.log("=".repeat(70));
    console.log("🧪 TESTING 5% TAX FUNCTIONALITY");
    console.log("=".repeat(70));
    console.log(`\nToken Mint: ${tokenMint.toString()}`);
    console.log(`Recipient: ${toAddress.toString()}`);
    console.log(`Transfer Amount: ${amount} tokens\n`);

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
    console.log(`📡 Connected to ${CLUSTER}\n`);

    // Get token decimals
    const mintInfo = await getMint(connection, tokenMint);
    const decimals = mintInfo.decimals;
    console.log(`Token Decimals: ${decimals}\n`);

    // Load program
    // Use the new deployed program ID
    let programId = new PublicKey("EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR");

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

    // Get config PDA and tax wallet
    const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        program.programId
    );
    const config = await program.account.config.fetch(configPda);
    const taxWallet = config.taxWallet;

    console.log("📋 Configuration:");
    console.log(`   Config PDA: ${configPda.toString()}`);
    console.log(`   Tax Wallet: ${taxWallet.toString()}\n`);

    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(tokenMint, walletKeypair.publicKey);
    const toTokenAccount = await getAssociatedTokenAddress(tokenMint, toAddress);
    const taxTokenAccount = await getAssociatedTokenAddress(tokenMint, taxWallet);

    console.log("📦 Token Accounts:");
    console.log(`   Sender: ${fromTokenAccount.toString()}`);
    console.log(`   Recipient: ${toTokenAccount.toString()}`);
    console.log(`   Tax Wallet: ${taxTokenAccount.toString()}\n`);

    // Create token accounts if they don't exist
    console.log("📝 Ensuring token accounts exist...");
    try {
        await getOrCreateAssociatedTokenAccount(
            connection,
            walletKeypair,
            tokenMint,
            toAddress,
            true // allowOwnerOffCurve
        );
        console.log("✅ Recipient token account ready\n");
    } catch (error) {
        console.log(`⚠️  Note: ${error.message}\n`);
    }

    try {
        await getOrCreateAssociatedTokenAccount(
            connection,
            walletKeypair,
            tokenMint,
            taxWallet,
            true // allowOwnerOffCurve
        );
        console.log("✅ Tax wallet token account ready\n");
    } catch (error) {
        console.log(`⚠️  Note: ${error.message}\n`);
    }

    // ============================================
    // STEP 1: GET BALANCES BEFORE TRANSFER
    // ============================================
    console.log("=".repeat(70));
    console.log("STEP 1: Getting balances BEFORE transfer");
    console.log("=".repeat(70));

    const senderBalanceBefore = await getTokenBalance(connection, tokenMint, walletKeypair.publicKey);
    const recipientBalanceBefore = await getTokenBalance(connection, tokenMint, toAddress);
    const taxWalletBalanceBefore = await getTokenBalance(connection, tokenMint, taxWallet);

    console.log(`\n💰 Balances BEFORE transfer:`);
    console.log(`   Sender:     ${formatBalance(senderBalanceBefore, decimals).toLocaleString()} tokens`);
    console.log(`   Recipient:  ${formatBalance(recipientBalanceBefore, decimals).toLocaleString()} tokens`);
    console.log(`   Tax Wallet: ${formatBalance(taxWalletBalanceBefore, decimals).toLocaleString()} tokens\n`);

    // Calculate expected amounts
    const amountWithDecimals = BigInt(amount) * BigInt(Math.pow(10, decimals));
    const expectedTaxAmount = (amountWithDecimals * BigInt(TAX_RATE)) / BigInt(100);
    const expectedRecipientAmount = amountWithDecimals - expectedTaxAmount;

    console.log("📊 Expected transfer breakdown:");
    console.log(`   Total Transfer: ${amount} tokens (${amountWithDecimals.toString()} raw units)`);
    console.log(`   Expected Tax (${TAX_RATE}%): ${formatBalance(expectedTaxAmount, decimals).toLocaleString()} tokens`);
    console.log(`   Expected to Recipient (95%): ${formatBalance(expectedRecipientAmount, decimals).toLocaleString()} tokens\n`);

    // ============================================
    // STEP 2: EXECUTE TRANSFER WITH TAX
    // ============================================
    console.log("=".repeat(70));
    console.log("STEP 2: Executing transfer_with_tax instruction");
    console.log("=".repeat(70));

    let txSignature;
    try {
        console.log("\n📝 Calling transferWithTax...");
        txSignature = await program.methods
            .transferWithTax(new anchor.BN(amountWithDecimals.toString()))
            .accounts({
                config: configPda,
                from: fromTokenAccount,
                to: toTokenAccount,
                taxWallet: taxTokenAccount,
                authority: walletKeypair.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

        console.log(`✅ Transfer transaction successful!`);
        console.log(`   Transaction: ${txSignature}`);
        console.log(`   Explorer: https://explorer.solana.com/tx/${txSignature}?cluster=${CLUSTER}\n`);
    } catch (error) {
        console.error(`❌ Transfer failed: ${error.message}`);
        process.exit(1);
    }

    // Wait for confirmation
    console.log("⏳ Waiting for transaction confirmation...");
    await connection.confirmTransaction(txSignature, "confirmed");
    console.log("✅ Transaction confirmed\n");

    // ============================================
    // STEP 3: GET BALANCES AFTER TRANSFER
    // ============================================
    console.log("=".repeat(70));
    console.log("STEP 3: Getting balances AFTER transfer");
    console.log("=".repeat(70));

    // Wait a moment for account updates
    await new Promise(resolve => setTimeout(resolve, 2000));

    const senderBalanceAfter = await getTokenBalance(connection, tokenMint, walletKeypair.publicKey);
    const recipientBalanceAfter = await getTokenBalance(connection, tokenMint, toAddress);
    const taxWalletBalanceAfter = await getTokenBalance(connection, tokenMint, taxWallet);

    console.log(`\n💰 Balances AFTER transfer:`);
    console.log(`   Sender:     ${formatBalance(senderBalanceAfter, decimals).toLocaleString()} tokens`);
    console.log(`   Recipient:  ${formatBalance(recipientBalanceAfter, decimals).toLocaleString()} tokens`);
    console.log(`   Tax Wallet: ${formatBalance(taxWalletBalanceAfter, decimals).toLocaleString()} tokens\n`);

    // ============================================
    // STEP 4: VERIFY TAX CALCULATION
    // ============================================
    console.log("=".repeat(70));
    console.log("STEP 4: Verifying tax calculation");
    console.log("=".repeat(70));

    // Calculate actual changes
    const senderChange = senderBalanceBefore - senderBalanceAfter;
    const recipientChange = recipientBalanceAfter - recipientBalanceBefore;
    const taxWalletChange = taxWalletBalanceAfter - taxWalletBalanceBefore;

    console.log(`\n📊 Actual changes:`);
    console.log(`   Sender lost:     ${formatBalance(senderChange, decimals).toLocaleString()} tokens`);
    console.log(`   Recipient got:   ${formatBalance(recipientChange, decimals).toLocaleString()} tokens`);
    console.log(`   Tax Wallet got:  ${formatBalance(taxWalletChange, decimals).toLocaleString()} tokens\n`);

    // Verification checks
    const tolerance = BigInt(1); // Allow 1 raw unit difference for rounding
    let allTestsPassed = true;

    console.log("🧪 Running verification tests...\n");

    // Test 1: Sender lost exactly the transfer amount
    const test1 = senderChange === amountWithDecimals;
    console.log(`   Test 1 - Sender lost exact transfer amount:`);
    console.log(`      Expected: ${formatBalance(amountWithDecimals, decimals).toLocaleString()} tokens`);
    console.log(`      Actual:   ${formatBalance(senderChange, decimals).toLocaleString()} tokens`);
    if (test1) {
        console.log(`      ✅ PASSED\n`);
    } else {
        console.log(`      ❌ FAILED\n`);
        allTestsPassed = false;
    }

    // Test 2: Tax wallet received exactly 5%
    const test2 = taxWalletChange >= expectedTaxAmount - tolerance && 
                   taxWalletChange <= expectedTaxAmount + tolerance;
    console.log(`   Test 2 - Tax wallet received 5%:`);
    console.log(`      Expected: ${formatBalance(expectedTaxAmount, decimals).toLocaleString()} tokens (${TAX_RATE}%)`);
    console.log(`      Actual:   ${formatBalance(taxWalletChange, decimals).toLocaleString()} tokens`);
    if (test2) {
        console.log(`      ✅ PASSED\n`);
    } else {
        console.log(`      ❌ FAILED\n`);
        allTestsPassed = false;
    }

    // Test 3: Recipient received exactly 95%
    const test3 = recipientChange >= expectedRecipientAmount - tolerance && 
                  recipientChange <= expectedRecipientAmount + tolerance;
    console.log(`   Test 3 - Recipient received 95%:`);
    console.log(`      Expected: ${formatBalance(expectedRecipientAmount, decimals).toLocaleString()} tokens (95%)`);
    console.log(`      Actual:   ${formatBalance(recipientChange, decimals).toLocaleString()} tokens`);
    if (test3) {
        console.log(`      ✅ PASSED\n`);
    } else {
        console.log(`      ❌ FAILED\n`);
        allTestsPassed = false;
    }

    // Test 4: Total equals 100% (sender loss = recipient gain + tax gain)
    const totalReceived = recipientChange + taxWalletChange;
    const test4 = senderChange === totalReceived || 
                  (senderChange >= totalReceived - tolerance && senderChange <= totalReceived + tolerance);
    console.log(`   Test 4 - Total conservation (100%):`);
    console.log(`      Sender lost:    ${formatBalance(senderChange, decimals).toLocaleString()} tokens`);
    console.log(`      Total received: ${formatBalance(totalReceived, decimals).toLocaleString()} tokens (recipient + tax)`);
    if (test4) {
        console.log(`      ✅ PASSED\n`);
    } else {
        console.log(`      ❌ FAILED\n`);
        allTestsPassed = false;
    }

    // Final summary
    console.log("=".repeat(70));
    if (allTestsPassed) {
        console.log("🎉 ALL TESTS PASSED! 5% tax is working correctly!");
        console.log("=".repeat(70));
        console.log("\n✅ Verification Summary:");
        console.log(`   ✓ Sender lost: ${formatBalance(senderChange, decimals).toLocaleString()} tokens`);
        console.log(`   ✓ Tax wallet received: ${formatBalance(taxWalletChange, decimals).toLocaleString()} tokens (${TAX_RATE}%)`);
        console.log(`   ✓ Recipient received: ${formatBalance(recipientChange, decimals).toLocaleString()} tokens (95%)`);
        console.log(`   ✓ Transaction: https://explorer.solana.com/tx/${txSignature}?cluster=${CLUSTER}\n`);
    } else {
        console.log("❌ SOME TESTS FAILED! Please review the results above.");
        console.log("=".repeat(70));
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });

