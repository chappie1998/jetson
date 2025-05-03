import {
    Connection,
    Keypair,
    PublicKey,
    LAMPORTS_PER_SOL
  } from '@solana/web3.js';
  import {
    createMint,
    getMint,
    setAuthority,
    AuthorityType
  } from '@solana/spl-token';
  import * as fs from 'fs';
  import * as path from 'path';
  import * as os from 'os';
  
  // Setup connection to cluster
  const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const WALLET_KEYPAIR_PATH = process.env.WALLET_KEYPAIR_PATH || path.resolve(os.homedir(), '.config/solana/id.json');
  
  // Program ID from your contract
  const PROGRAM_ID = new PublicKey("AqFGP1Fs3nJ3Ue2Nc7RVZ1AUAad5AsEr4VBRJB2mEnk3");
  
  // Constants
  const USDS_DECIMALS = 6; // Same as USDC
  
  async function main() {
    try {
      // Set up connection and wallet
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      
      // Load wallet keypair
      const walletKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_KEYPAIR_PATH, 'utf-8')))
      );
      
      console.log(`Using wallet: ${walletKeypair.publicKey.toBase58()}`);
  
      // Check wallet balance
      const balance = await connection.getBalance(walletKeypair.publicKey);
      console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
      
      if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.warn("Warning: Your wallet balance is low. Consider requesting an airdrop first.");
        console.log("Requesting SOL airdrop (1 SOL)...");
        const airdropSignature = await connection.requestAirdrop(
          walletKeypair.publicKey,
          LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropSignature);
        console.log(`Airdrop successful! New balance: ${await connection.getBalance(walletKeypair.publicKey) / LAMPORTS_PER_SOL} SOL`);
      }
  
      // Step 1: Create USDS mint account
      console.log("\n1. Creating USDs mint account...");
      
      // Fix: Make sure walletKeypair is properly created and spl-token functions are imported correctly
      try {
        const usdsMint = await createMint(
          connection,
          walletKeypair,             // Payer
          walletKeypair.publicKey,   // Mint Authority
          null,                      // Freeze Authority 
          USDS_DECIMALS              // Decimals
        );
        
        console.log(`✅ USDs mint created: ${usdsMint.toBase58()}`);
        
        // Step 2: Derive the PDAs needed for the contract
        const [treasuryPDA, treasuryBump] = PublicKey.findProgramAddressSync(
          [Buffer.from("treasury")],
          PROGRAM_ID
        );
        
        const [mintAuthorityPDA, mintAuthorityBump] = PublicKey.findProgramAddressSync(
          [Buffer.from("mint-authority")],
          PROGRAM_ID
        );
        
        console.log(`\n2. Program PDAs:`);
        console.log(`  Treasury PDA:      ${treasuryPDA.toBase58()} (bump: ${treasuryBump})`);
        console.log(`  Mint Authority PDA: ${mintAuthorityPDA.toBase58()} (bump: ${mintAuthorityBump})`);
        
        // Step 3: Transfer mint authority to the PDA
        console.log("\n3. Transferring mint authority to the PDA...");
        
        const mintAuthorityTx = await setAuthority(
          connection,
          walletKeypair,             // Payer
          usdsMint,                  // Token mint
          walletKeypair.publicKey,   // Current authority
          AuthorityType.MintTokens,  // Authority type
          mintAuthorityPDA           // New authority
        );
        
        console.log(`✅ Mint authority transferred successfully!`);
        console.log(`  Transaction signature: ${mintAuthorityTx}`);
        
        // Verification
        console.log("\nVerifying mint authority...");
        const mintInfo = await getMint(connection, usdsMint);
        
        if (mintInfo.mintAuthority?.toBase58() === mintAuthorityPDA.toBase58()) {
          console.log(`✅ Mint authority verified: ${mintInfo.mintAuthority.toBase58()}`);
        } else {
          console.log(`❌ Verification failed! Current mint authority: ${mintInfo.mintAuthority?.toBase58()}`);
        }
        
        // Save deployment information
        const deploymentInfo = {
          usdsMint: usdsMint.toBase58(),
          treasuryPDA: treasuryPDA.toBase58(),
          treasuryBump: treasuryBump,
          mintAuthorityPDA: mintAuthorityPDA.toBase58(),
          mintAuthorityBump: mintAuthorityBump,
          network: SOLANA_RPC_URL,
          deployedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(
          'usds_deployment.json',
          JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log("\n✅ Deployment information saved to usds_deployment.json");
        console.log("\nSummary:");
        console.log(`  USDS Mint:         ${usdsMint.toBase58()}`);
        console.log(`  Treasury PDA:      ${treasuryPDA.toBase58()}`);
        console.log(`  Mint Authority PDA: ${mintAuthorityPDA.toBase58()}`);
        
        return deploymentInfo;
      } catch (mintError) {
        console.error("Error creating mint:", mintError);
        
        // Check if this is a wallet format issue
        //@ts-ignore
        if (mintError.toString().includes("expected Uint8Array")) {
          console.log("\nThis appears to be a wallet format issue.");
          console.log("Try modifying the wallet loading code to ensure proper Uint8Array format.");
        }
        
        throw mintError;
      }
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  }
  
  // Run the script
  main()
    .then(() => {
      console.log("\n🎉 All done! USDs token has been created and mint authority transferred.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Failed:", error);
      process.exit(1);
    });