// Import Solana web3.js and SPL token
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';

// File system imports
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup connection to cluster
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const WALLET_KEYPAIR_PATH = process.env.WALLET_KEYPAIR_PATH || path.resolve(os.homedir(), '.config/solana/id.json');

// Program ID - THIS IS IMPORTANT!
const PROGRAM_ID = new PublicKey("AqFGP1Fs3nJ3Ue2Nc7RVZ1AUAad5AsEr4VBRJB2mEnk3");

// USDC mint address (using devnet USDC for testing)
const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"); // devnet USDC

// Load deployment information
const loadDeploymentInfo = () => {
  try {
    // First try the updated deployment file
    if (fs.existsSync('usds_deployment_updated.json')) {
      const data = fs.readFileSync('usds_deployment_updated.json', 'utf-8');
      return JSON.parse(data);
    }
    
    // Fall back to original deployment file
    const data = fs.readFileSync('usds_deployment.json', 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading deployment info:", error);
    throw new Error("Make sure you have initialized the contract first");
  }
};

// Recalculate PDAs to ensure they match what the program expects
const calculatePDAs = () => {
  // Calculate treasury PDA with the CORRECT program ID
  const [treasuryPDA, treasuryBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    PROGRAM_ID
  );
  
  // Calculate mint authority PDA
  const [mintAuthorityPDA, mintAuthorityBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint-authority")],
    PROGRAM_ID
  );
  
  return {
    treasuryPDA,
    treasuryBump,
    mintAuthorityPDA,
    mintAuthorityBump
  };
};

// Load instruction discriminators from IDL
const loadDiscriminators = () => {
  try {
    const idlFile = fs.readFileSync('idl.json', 'utf-8');
    const idl = JSON.parse(idlFile);
    
    // Get swap instruction discriminators
    const swapUsdcToUsdsInstr = idl.instructions.find((instr: { name: string; }) => instr.name === 'swap_usdc_to_usds');
    const swapUsdsToUsdcInstr = idl.instructions.find((instr: { name: string; }) => instr.name === 'swap_usds_to_usdc');
    
    if (!swapUsdcToUsdsInstr || !swapUsdcToUsdsInstr.discriminator) {
      throw new Error("swap_usdc_to_usds instruction or discriminator not found in IDL");
    }
    
    if (!swapUsdsToUsdcInstr || !swapUsdsToUsdcInstr.discriminator) {
      throw new Error("swap_usds_to_usdc instruction or discriminator not found in IDL");
    }
    
    return {
      swapUsdcToUsds: new Uint8Array(swapUsdcToUsdsInstr.discriminator),
      swapUsdsToUsdc: new Uint8Array(swapUsdsToUsdcInstr.discriminator)
    };
  } catch (error) {
    console.error("Error loading discriminators from IDL:", error);
    // Fallback to hardcoded discriminators
    console.log("Using hardcoded discriminators as fallback");
    return {
      swapUsdcToUsds: new Uint8Array([3, 47, 72, 28, 13, 138, 47, 210]),
      swapUsdsToUsdc: new Uint8Array([254, 45, 112, 36, 49, 103, 151, 48])
    };
  }
};

// Function to create a token account if it doesn't exist
async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const associatedTokenAddress = await getAssociatedTokenAddress(mint, owner);
  
  try {
    // Check if the account already exists
    await getAccount(connection, associatedTokenAddress);
    console.log(`Token account ${associatedTokenAddress.toBase58()} already exists`);
    return associatedTokenAddress;
  } catch (error) {
    // If the account doesn't exist, create it
    console.log(`Creating token account ${associatedTokenAddress.toBase58()}`);
    
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAddress,
        owner,
        mint
      )
    );
    
    await sendAndConfirmTransaction(connection, transaction, [payer]);
    return associatedTokenAddress;
  }
}

// Helper to encode u64 amounts for the instruction data
function encodeU64(value: number): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value), 0);
  return buffer;
}

// Function to check token balance
async function checkTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<number> {
  try {
    const account = await getAccount(connection, tokenAccount);
    return Number(account.amount);
  } catch (error) {
    console.error("Error checking token balance:", error);
    return 0;
  }
}

// Function to swap USDC to USDs
async function swapUsdcToUsds(amount: number) {
  try {
    const deploymentInfo = loadDeploymentInfo();
    const discriminators = loadDiscriminators();
    
    console.log("Starting USDC to USDs swap...");
    console.log(`Amount to swap: ${amount} USDC`);
    
    // Set up connection and wallet
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const walletKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_KEYPAIR_PATH, 'utf-8')))
    );
    
    console.log(`Using wallet: ${walletKeypair.publicKey.toBase58()}`);
    
    // IMPORTANT: Calculate PDAs fresh to ensure they match what the program expects
    const pdas = calculatePDAs();
    console.log("\nRecalculated PDAs from seeds:");
    console.log(`  Treasury PDA:      ${pdas.treasuryPDA.toBase58()} (bump: ${pdas.treasuryBump})`);
    console.log(`  Mint Authority PDA: ${pdas.mintAuthorityPDA.toBase58()} (bump: ${pdas.mintAuthorityBump})`);
    
    // Get the necessary accounts from deployment info
    const usdsMint = new PublicKey(deploymentInfo.usdsMint);
    const configAccount = new PublicKey(deploymentInfo.configAccount);
    
    // Use the recalculated PDAs
    const treasuryPDA = pdas.treasuryPDA;
    const mintAuthorityPDA = pdas.mintAuthorityPDA;
    
    // Get the treasury token account from deployment info or calculate it
    let treasuryTokenAccount;
    if (deploymentInfo.treasuryTokenAccount) {
      treasuryTokenAccount = new PublicKey(deploymentInfo.treasuryTokenAccount);
      console.log(`Using treasury token account from deployment info: ${treasuryTokenAccount.toBase58()}`);
    } else {
      // If not in deployment info, calculate it (this is a fallback)
      treasuryTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        treasuryPDA,
        true // Allow the PDA to be off-curve
      );
      console.log(`Calculated treasury token account: ${treasuryTokenAccount.toBase58()}`);
    }
    
    // Get or create token accounts
    console.log("\nChecking and creating token accounts if needed...");
    const userUsdcAddress = await getOrCreateAssociatedTokenAccount(
      connection,
      walletKeypair,
      USDC_MINT,
      walletKeypair.publicKey
    );
    
    const userUsdsAddress = await getOrCreateAssociatedTokenAccount(
      connection,
      walletKeypair,
      usdsMint,
      walletKeypair.publicKey
    );
    
    // Check if user has enough USDC
    const usdcBalance = await checkTokenBalance(connection, userUsdcAddress);
    console.log(`\nUSDC balance: ${usdcBalance}`);
    
    if (usdcBalance < amount) {
      throw new Error(`Insufficient USDC. You have ${usdcBalance} but trying to swap ${amount}`);
    }
    
    // Create the instruction data (discriminator + amount)
    const instructionData = Buffer.concat([
      Buffer.from(discriminators.swapUsdcToUsds),
      encodeU64(amount)
    ]);
    
    // IMPORTANT: Create the swap instruction with BOTH treasuryPDA AND treasuryTokenAccount
    const swapInstruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false }, // user
        { pubkey: configAccount, isSigner: false, isWritable: false }, // config
        { pubkey: userUsdcAddress, isSigner: false, isWritable: true }, // user_usdc
        { pubkey: userUsdsAddress, isSigner: false, isWritable: true }, // user_usds
        { pubkey: treasuryPDA, isSigner: false, isWritable: false }, // treasury PDA (authority)
        { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true }, // treasury token account
        { pubkey: mintAuthorityPDA, isSigner: false, isWritable: false }, // mint_authority
        { pubkey: usdsMint, isSigner: false, isWritable: true }, // usds_mint
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
      ],
      data: instructionData
    });
    
    // Create and send the transaction
    const transaction = new Transaction().add(swapInstruction);
    
    console.log("\nSending swap transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [walletKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log(`✅ Swap successful! Transaction signature: ${signature}`);
    
    // Check new balances
    const newUsdcBalance = await checkTokenBalance(connection, userUsdcAddress);
    const newUsdsBalance = await checkTokenBalance(connection, userUsdsAddress);
    
    console.log("\nBalances after swap:");
    console.log(`  USDC: ${newUsdcBalance}`);
    console.log(`  USDs: ${newUsdsBalance}`);
    
    return {
      success: true,
      signature,
      newUsdcBalance,
      newUsdsBalance
    };
  } catch (error) {
    console.error("Error swapping USDC to USDs:", error);
    
    //@ts-ignore
    if ('logs' in error) {
      console.log("\nTransaction logs:");
      //@ts-ignore
      error.logs.forEach((log, i) => console.log(`  ${i}: ${log}`));
    }
    
    throw error;
  }
}

// Function to swap USDs to USDC
async function swapUsdsToUsdc(amount: number) {
  try {
    const deploymentInfo = loadDeploymentInfo();
    const discriminators = loadDiscriminators();
    
    console.log("Starting USDs to USDC swap...");
    console.log(`Amount to swap: ${amount} USDs`);
    
    // Set up connection and wallet
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const walletKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_KEYPAIR_PATH, 'utf-8')))
    );
    
    console.log(`Using wallet: ${walletKeypair.publicKey.toBase58()}`);
    
    // IMPORTANT: Calculate PDAs fresh to ensure they match what the program expects
    const pdas = calculatePDAs();
    console.log("\nRecalculated PDAs from seeds:");
    console.log(`  Treasury PDA:      ${pdas.treasuryPDA.toBase58()} (bump: ${pdas.treasuryBump})`);
    console.log(`  Mint Authority PDA: ${pdas.mintAuthorityPDA.toBase58()} (bump: ${pdas.mintAuthorityBump})`);
    
    // Get the necessary accounts from deployment info
    const usdsMint = new PublicKey(deploymentInfo.usdsMint);
    const configAccount = new PublicKey(deploymentInfo.configAccount);
    
    // Use the recalculated PDAs
    const treasuryPDA = pdas.treasuryPDA;
    
    // Get the treasury token account from deployment info or calculate it
    let treasuryTokenAccount;
    if (deploymentInfo.treasuryTokenAccount) {
      treasuryTokenAccount = new PublicKey(deploymentInfo.treasuryTokenAccount);
      console.log(`Using treasury token account from deployment info: ${treasuryTokenAccount.toBase58()}`);
    } else {
      // If not in deployment info, calculate it (this is a fallback)
      treasuryTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        treasuryPDA,
        true // Allow the PDA to be off-curve
      );
      console.log(`Calculated treasury token account: ${treasuryTokenAccount.toBase58()}`);
    }
    
    // Get or create token accounts
    console.log("\nChecking and creating token accounts if needed...");
    const userUsdcAddress = await getOrCreateAssociatedTokenAccount(
      connection,
      walletKeypair,
      USDC_MINT,
      walletKeypair.publicKey
    );
    
    const userUsdsAddress = await getOrCreateAssociatedTokenAccount(
      connection,
      walletKeypair,
      usdsMint,
      walletKeypair.publicKey
    );
    
    // Check if user has enough USDs
    const usdsBalance = await checkTokenBalance(connection, userUsdsAddress);
    console.log(`\nUSDs balance: ${usdsBalance}`);
    
    if (usdsBalance < amount) {
      throw new Error(`Insufficient USDs. You have ${usdsBalance} but trying to swap ${amount}`);
    }
    
    // Create the instruction data (discriminator + amount)
    const instructionData = Buffer.concat([
      Buffer.from(discriminators.swapUsdsToUsdc),
      encodeU64(amount)
    ]);
    
    // IMPORTANT: Create the swap instruction with BOTH treasuryPDA AND treasuryTokenAccount
    const swapInstruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false }, // user
        { pubkey: configAccount, isSigner: false, isWritable: false }, // config
        { pubkey: userUsdcAddress, isSigner: false, isWritable: true }, // user_usdc
        { pubkey: userUsdsAddress, isSigner: false, isWritable: true }, // user_usds
        { pubkey: treasuryPDA, isSigner: false, isWritable: false }, // treasury PDA (authority)
        { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true }, // treasury token account
        { pubkey: usdsMint, isSigner: false, isWritable: true }, // usds_mint
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
      ],
      data: instructionData
    });
    
    // Create and send the transaction
    const transaction = new Transaction().add(swapInstruction);
    
    console.log("\nSending swap transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [walletKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log(`✅ Swap successful! Transaction signature: ${signature}`);
    
    // Check new balances
    const newUsdcBalance = await checkTokenBalance(connection, userUsdcAddress);
    const newUsdsBalance = await checkTokenBalance(connection, userUsdsAddress);
    
    console.log("\nBalances after swap:");
    console.log(`  USDC: ${newUsdcBalance}`);
    console.log(`  USDs: ${newUsdsBalance}`);
    
    return {
      success: true,
      signature,
      newUsdcBalance,
      newUsdsBalance
    };
  } catch (error) {
    console.error("Error swapping USDs to USDC:", error);
    
    //@ts-ignore
    if ('logs' in error) {
      console.log("\nTransaction logs:");
      //@ts-ignore
      error.logs.forEach((log, i) => console.log(`  ${i}: ${log}`));
    }
    
    throw error;
  }
}

// Function to check balances
async function checkBalances() {
  try {
    const deploymentInfo = loadDeploymentInfo();
    
    console.log("Checking token balances...");
    
    // Set up connection and wallet
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const walletKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_KEYPAIR_PATH, 'utf-8')))
    );
    
    console.log(`Using wallet: ${walletKeypair.publicKey.toBase58()}`);
    
    // IMPORTANT: Calculate PDAs fresh to ensure they match what the program expects
    const pdas = calculatePDAs();
    console.log("\nRecalculated PDAs from seeds:");
    console.log(`  Treasury PDA:      ${pdas.treasuryPDA.toBase58()} (bump: ${pdas.treasuryBump})`);
    console.log(`  Mint Authority PDA: ${pdas.mintAuthorityPDA.toBase58()} (bump: ${pdas.mintAuthorityBump})`);
    
    // Get the necessary accounts from deployment info
    const usdsMint = new PublicKey(deploymentInfo.usdsMint);
    
    // Use the recalculated treasury PDA
    const treasuryPDA = pdas.treasuryPDA;
    
    // Get the treasury token account from deployment info or calculate it
    let treasuryTokenAccount;
    if (deploymentInfo.treasuryTokenAccount) {
      treasuryTokenAccount = new PublicKey(deploymentInfo.treasuryTokenAccount);
      console.log(`Using treasury token account from deployment info: ${treasuryTokenAccount.toBase58()}`);
    } else {
      // If not in deployment info, calculate it (this is a fallback)
      treasuryTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        treasuryPDA,
        true // Allow the PDA to be off-curve
      );
      console.log(`Calculated treasury token account: ${treasuryTokenAccount.toBase58()}`);
    }
    
    // Get token account addresses
    const userUsdcAddress = await getAssociatedTokenAddress(
      USDC_MINT,
      walletKeypair.publicKey
    );
    
    const userUsdsAddress = await getAssociatedTokenAddress(
      usdsMint,
      walletKeypair.publicKey
    );
    
    console.log(`User USDC account: ${userUsdcAddress.toBase58()}`);
    console.log(`User USDs account: ${userUsdsAddress.toBase58()}`);
    console.log(`Treasury USDC account: ${treasuryTokenAccount.toBase58()}`);
    
    // Check if accounts exist and get balances
    let usdcBalance = 0;
    try {
      usdcBalance = await checkTokenBalance(connection, userUsdcAddress);
    } catch (error) {
      console.log(`User USDC account doesn't exist`);
    }
    
    let usdsBalance = 0;
    try {
      usdsBalance = await checkTokenBalance(connection, userUsdsAddress);
    } catch (error) {
      console.log(`User USDs account doesn't exist`);
    }
    
    let treasuryUsdcBalance = 0;
    try {
      treasuryUsdcBalance = await checkTokenBalance(connection, treasuryTokenAccount);
    } catch (error) {
      console.log(`Treasury USDC account doesn't exist`);
    }
    
    console.log("\nCurrent balances:");
    console.log(`  User USDC: ${usdcBalance}`);
    console.log(`  User USDs: ${usdsBalance}`);
    console.log(`  Treasury USDC: ${treasuryUsdcBalance}`);
    
    // Get SOL balance
    const solBalance = await connection.getBalance(walletKeypair.publicKey);
    console.log(`  SOL: ${solBalance / LAMPORTS_PER_SOL}`);
    
    return {
      usdcBalance,
      usdsBalance,
      treasuryUsdcBalance,
      solBalance: solBalance / LAMPORTS_PER_SOL
    };
  } catch (error) {
    console.error("Error checking balances:", error);
    throw error;
  }
}

// Command-line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage:");
    console.log("  ts-node swap.ts balances                  - Check token balances");
    console.log("  ts-node swap.ts swap-usdc-to-usds <amount> - Swap USDC to USDs");
    console.log("  ts-node swap.ts swap-usds-to-usdc <amount> - Swap USDs to USDC");
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case "balances":
      await checkBalances();
      break;
      
    case "swap-usdc-to-usds":
      if (args.length < 2) {
        console.error("Amount required. Usage: ts-node swap.ts swap-usdc-to-usds <amount>");
        return;
      }
      const usdcAmount = parseInt(args[1]);
      if (isNaN(usdcAmount) || usdcAmount <= 0) {
        console.error("Invalid amount. Please provide a positive number.");
        return;
      }
      await swapUsdcToUsds(usdcAmount);
      break;
      
    case "swap-usds-to-usdc":
      if (args.length < 2) {
        console.error("Amount required. Usage: ts-node swap.ts swap-usds-to-usdc <amount>");
        return;
      }
      const usdsAmount = parseInt(args[1]);
      if (isNaN(usdsAmount) || usdsAmount <= 0) {
        console.error("Invalid amount. Please provide a positive number.");
        return;
      }
      await swapUsdsToUsdc(usdsAmount);
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      console.log("Usage:");
      console.log("  ts-node swap.ts balances                  - Check token balances");
      console.log("  ts-node swap.ts swap-usdc-to-usds <amount> - Swap USDC to USDs");
      console.log("  ts-node swap.ts swap-usds-to-usdc <amount> - Swap USDs to USDC");
  }
}

// Run the script
main()
  .then(() => {
    console.log("\n🎉 Operation completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Operation failed:", error);
    process.exit(1);
  });