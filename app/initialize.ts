// // Import Solana web3.js and SPL token
// import {
//   Connection,
//   Keypair,
//   PublicKey,
//   SystemProgram,
//   LAMPORTS_PER_SOL,
//   Transaction,
//   TransactionInstruction,
//   sendAndConfirmTransaction
// } from '@solana/web3.js';
// import {
//   TOKEN_PROGRAM_ID,
//   getAssociatedTokenAddress,
//   createAssociatedTokenAccountInstruction,
//   getAccount,
//   ASSOCIATED_TOKEN_PROGRAM_ID,
//   createInitializeAccountInstruction
// } from '@solana/spl-token';

// // File system imports
// import * as fs from 'fs';
// import * as path from 'path';
// import * as os from 'os';
// import { fileURLToPath } from 'url';

// // Get current directory in ESM
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Setup connection to cluster
// const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
// const WALLET_KEYPAIR_PATH = process.env.WALLET_KEYPAIR_PATH || path.resolve(os.homedir(), '.config/solana/id.json');

// // Program ID - Use the same program ID from your transaction logs
// const PROGRAM_ID = new PublicKey("2PJ62bc8F6drJw2HQYfYA2yhSxLKpuJUm9TQdusDcCaL");

// // USDC mint address (using devnet USDC for testing)
// const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // devnet USDC

// // Load deployment information
// const loadDeploymentInfo = () => {
//   try {
//     // First try the updated deployment file
//     if (fs.existsSync('usds_deployment_updated.json')) {
//       const data = fs.readFileSync('usds_deployment_updated.json', 'utf-8');
//       return JSON.parse(data);
//     }
    
//     // Fall back to original deployment file
//     const data = fs.readFileSync('usds_deployment.json', 'utf-8');
//     return JSON.parse(data);
//   } catch (error) {
//     console.error("Error loading deployment info:", error);
//     throw new Error("Make sure you have initialized the contract first");
//   }
// };


// // Save updated deployment info
// const saveDeploymentInfo = (info: any) => {
//   try {
//     fs.writeFileSync('usds_deployment_updated.json', JSON.stringify(info, null, 2));
//     console.log("Deployment info saved to usds_deployment_updated.json");
//   } catch (error) {
//     console.error("Error saving deployment info:", error);
//     throw error;
//   }
// };

// // Recalculate PDAs to ensure they match what the program expects
// const calculatePDAs = () => {
//   // Calculate treasury PDA with the CORRECT program ID
//   const [treasuryPDA, treasuryBump] = PublicKey.findProgramAddressSync(
//     [Buffer.from("treasury")],
//     PROGRAM_ID
//   );
  
//   // Calculate mint authority PDA
//   const [mintAuthorityPDA, mintAuthorityBump] = PublicKey.findProgramAddressSync(
//     [Buffer.from("mint-authority")],
//     PROGRAM_ID
//   );
  
//   return {
//     treasuryPDA,
//     treasuryBump,
//     mintAuthorityPDA,
//     mintAuthorityBump
//   };
// };

// // Function to check if token account exists
// async function checkTokenAccount(
//   connection: Connection,
//   address: PublicKey
// ): Promise<boolean> {
//   try {
//     await getAccount(connection, address);
//     return true;
//   } catch (error) {
//     return false;
//   }
// }

// // Function to create a token account if it doesn't exist
// async function getOrCreateAssociatedTokenAccount(
//   connection: Connection,
//   payer: Keypair,
//   mint: PublicKey,
//   owner: PublicKey
// ): Promise<PublicKey> {
//   const associatedTokenAddress = await getAssociatedTokenAddress(mint, owner, true);
  
//   try {
//     // Check if the account already exists
//     await getAccount(connection, associatedTokenAddress);
//     console.log(`Token account ${associatedTokenAddress.toBase58()} already exists`);
//     return associatedTokenAddress;
//   } catch (error) {
//     // If the account doesn't exist, create it
//     console.log(`Creating token account ${associatedTokenAddress.toBase58()}`);
    
//     const transaction = new Transaction().add(
//       createAssociatedTokenAccountInstruction(
//         payer.publicKey,
//         associatedTokenAddress,
//         owner,
//         mint
//       )
//     );
    
//     await sendAndConfirmTransaction(connection, transaction, [payer]);
//     return associatedTokenAddress;
//   }
// }

// // Main function to initialize the treasury account
// async function initializeTreasury() {
//   try {
//     let deploymentInfo;
//     try {
//       deploymentInfo = loadDeploymentInfo();
//       console.log("Loaded existing deployment info:", deploymentInfo);
//     } catch (error) {
//       console.log("No existing deployment info found. Will create new deployment info after initialization.");
//       deploymentInfo = {};
//     }
    
//     console.log("Starting treasury initialization...");
    
//     // Set up connection and wallet
//     const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
//     const walletKeypair = Keypair.fromSecretKey(
//       Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_KEYPAIR_PATH, 'utf-8')))
//     );
    
//     console.log(`Using wallet: ${walletKeypair.publicKey.toBase58()}`);
    
//     // Check wallet balance
//     const balance = await connection.getBalance(walletKeypair.publicKey);
//     console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
//     if (balance < 0.1 * LAMPORTS_PER_SOL) {
//       console.warn("Warning: Your wallet balance is low. Consider requesting an airdrop first.");
//       console.log("Requesting SOL airdrop (1 SOL)...");
//       const airdropSignature = await connection.requestAirdrop(
//         walletKeypair.publicKey,
//         LAMPORTS_PER_SOL
//       );
//       await connection.confirmTransaction(airdropSignature);
//       console.log(`Airdrop successful! New balance: ${await connection.getBalance(walletKeypair.publicKey) / LAMPORTS_PER_SOL} SOL`);
//     }
    
//     // Calculate PDAs
//     const pdas = calculatePDAs();
//     console.log("\nCalculated PDAs:");
//     console.log(`  Treasury PDA:      ${pdas.treasuryPDA.toBase58()} (bump: ${pdas.treasuryBump})`);
//     console.log(`  Mint Authority PDA: ${pdas.mintAuthorityPDA.toBase58()} (bump: ${pdas.mintAuthorityBump})`);
    
//     const treasuryPDA = pdas.treasuryPDA;
    
//     // Create the associated token account for the treasury
//     console.log("\nSetting up treasury token account for USDC...");
//     const treasuryTokenAddress = await getAssociatedTokenAddress(
//       USDC_MINT, 
//       treasuryPDA, 
//       true // allowOwnerOffCurve
//     );
    
//     console.log(`Treasury token account address: ${treasuryTokenAddress.toBase58()}`);
    
//     // Check if token account exists
//     const tokenAccountExists = await checkTokenAccount(connection, treasuryTokenAddress);
    
//     if (!tokenAccountExists) {
//       console.log("Treasury token account doesn't exist yet. Creating it...");
      
//       // Create the treasury token account
//       const createTokenAccountTx = new Transaction().add(
//         createAssociatedTokenAccountInstruction(
//           walletKeypair.publicKey,
//           treasuryTokenAddress,
//           treasuryPDA,
//           USDC_MINT
//         )
//       );
      
//       const signature = await sendAndConfirmTransaction(
//         connection,
//         createTokenAccountTx,
//         [walletKeypair],
//         { commitment: 'confirmed' }
//       );
      
//       console.log(`✅ Treasury token account created successfully!`);
//       console.log(`Transaction signature: ${signature}`);
//     } else {
//       console.log("Treasury token account already exists!");
//     }
    
//     // Update deployment info
//     if (!deploymentInfo.treasuryPDA) {
//       deploymentInfo.treasuryPDA = treasuryPDA.toBase58();
//     }
    
//     if (!deploymentInfo.treasuryTokenAccount) {
//       deploymentInfo.treasuryTokenAccount = treasuryTokenAddress.toBase58();
//     }
    
//     // Save the updated deployment info
//     saveDeploymentInfo(deploymentInfo);
    
//     return {
//       treasuryPDA: treasuryPDA.toBase58(),
//       treasuryTokenAccount: treasuryTokenAddress.toBase58(),
//       success: true
//     };
//   } catch (error) {
//     console.error("Error initializing treasury:", error);
//     throw error;
//   }
// }

// // Run the script
// initializeTreasury()
//   .then((result) => {
//     console.log("\n🎉 Treasury initialization completed successfully.");
//     console.log(result);
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error("\n❌ Treasury initialization failed:", error);
//     process.exit(1);
//   });


// Import Solana web3.js and SPL token
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeAccountInstruction
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

// Program ID - Use the same program ID from your transaction logs
const PROGRAM_ID = new PublicKey("AqFGP1Fs3nJ3Ue2Nc7RVZ1AUAad5AsEr4VBRJB2mEnk3");

// USDC mint address (using devnet USDC for testing)
const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"); // devnet USDC

// // Load deployment information
// const loadDeploymentInfo = () => {
//   try {
//     // First try the updated deployment file
//     if (fs.existsSync('usds_deployment_updated.json')) {
//       const data = fs.readFileSync('usds_deployment_updated.json', 'utf-8');
//       return JSON.parse(data);
//     }
//   } catch (error) {
//     console.error("Error initializing treasury:", error);
//     throw error;
//   }
    
//     // Fall back to original deployment file
//     const data = fs.readFileSync('usds_deployment.json', 'utf-8');
//     return JSON.parse(data);
//   } catch (error) {
//     console.error("Error loading deployment info:", error);
//     throw new Error("Make sure you have initialized the contract first");
//   }
// };

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

// Save updated deployment info
const saveDeploymentInfo = (info: any) => {
  try {
    fs.writeFileSync('usds_deployment_updated.json', JSON.stringify(info, null, 2));
    console.log("Deployment info saved to usds_deployment_updated.json");
  } catch (error) {
    console.error("Error saving deployment info:", error);
    throw error;
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

// Function to check if token account exists
async function checkTokenAccount(
  connection: Connection,
  address: PublicKey
): Promise<boolean> {
  try {
    await getAccount(connection, address);
    return true;
  } catch (error) {
    return false;
  }
}

// Function to create a token account if it doesn't exist
async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const associatedTokenAddress = await getAssociatedTokenAddress(mint, owner, true);
  
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

// Helper to encode the account instruction data
function encodeInstruction(name: string): Buffer {
  // These are placeholders; you would need the actual instruction discriminator
  const discriminators: {[key: string]: number[]} = {
    initialize: [175, 175, 109, 31, 13, 152, 155, 237] // You may need to update this based on actual IDL
  };
  
  if (!discriminators[name]) {
    throw new Error(`No discriminator found for instruction: ${name}`);
  }
  
  return Buffer.from(discriminators[name]);
}

// Main function to initialize the contract
async function initializeTreasury() {
  try {
    let deploymentInfo;
    try {
      deploymentInfo = loadDeploymentInfo();
      console.log("Loaded existing deployment info:", deploymentInfo);
      
      // Check if already initialized
      if (deploymentInfo.configAccount && deploymentInfo.initialized) {
        console.log("Contract already initialized!");
        console.log(`Config account: ${deploymentInfo.configAccount}`);
        return deploymentInfo;
      }
    } catch (error) {
      console.log("No existing deployment info found. Will create new deployment info after initialization.");
      deploymentInfo = {};
    }
    
    console.log("Starting contract initialization...");
    
    // Set up connection and wallet
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
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
    
    // Calculate PDAs
    const pdas = calculatePDAs();
    console.log("\nCalculated PDAs:");
    console.log(`  Treasury PDA:      ${pdas.treasuryPDA.toBase58()} (bump: ${pdas.treasuryBump})`);
    console.log(`  Mint Authority PDA: ${pdas.mintAuthorityPDA.toBase58()} (bump: ${pdas.mintAuthorityBump})`);
    
    const treasuryPDA = pdas.treasuryPDA;
    const mintAuthorityPDA = pdas.mintAuthorityPDA;
    
    // Create the associated token account for the treasury
    console.log("\nSetting up treasury token account for USDC...");
    const treasuryTokenAddress = await getAssociatedTokenAddress(
      USDC_MINT, 
      treasuryPDA, 
      true // allowOwnerOffCurve
    );
    
    console.log(`Treasury token account address: ${treasuryTokenAddress.toBase58()}`);
    
    // Check if token account exists
    const tokenAccountExists = await checkTokenAccount(connection, treasuryTokenAddress);
    
    if (!tokenAccountExists) {
      console.log("Treasury token account doesn't exist yet. Creating it...");
      
      // Create the treasury token account
      const createTokenAccountTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          walletKeypair.publicKey,
          treasuryTokenAddress,
          treasuryPDA,
          USDC_MINT
        )
      );
      
      const signature = await sendAndConfirmTransaction(
        connection,
        createTokenAccountTx,
        [walletKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`✅ Treasury token account created successfully!`);
      console.log(`Transaction signature: ${signature}`);
    } else {
      console.log("Treasury token account already exists!");
    }
    
    // Now we need to actually call the initialize function of your contract
    console.log("\nInitializing the contract...");
    
    // Check if we have a USDs mint address
    if (!deploymentInfo.usdsMint) {
      throw new Error("USDs mint address not found in deployment info. Make sure to create the USDs mint first.");
    }
    
    const usdsMint = new PublicKey(deploymentInfo.usdsMint);
    console.log(`Using USDs mint: ${usdsMint.toBase58()}`);
    
    // Create a new config account
    const configAccount = Keypair.generate();
    console.log(`Generated new config account: ${configAccount.publicKey.toBase58()}`);
    
    // Prepare the initialize instruction
    const initializeInstruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true }, // admin
        { pubkey: configAccount.publicKey, isSigner: true, isWritable: true }, // config
        { pubkey: treasuryPDA, isSigner: false, isWritable: false }, // treasury
        { pubkey: treasuryTokenAddress, isSigner: false, isWritable: false }, // treasury_token_account
        { pubkey: mintAuthorityPDA, isSigner: false, isWritable: false }, // mint_authority
        { pubkey: usdsMint, isSigner: false, isWritable: false }, // usds_mint
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      data: encodeInstruction("initialize")
    });
    
    // Create and send the transaction
    const transaction = new Transaction().add(initializeInstruction);
    
    try {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [walletKeypair, configAccount], // Both need to sign
        { commitment: 'confirmed' }
      );
      
      console.log(`✅ Contract initialized successfully!`);
      console.log(`Transaction signature: ${signature}`);
      
      // Update deployment info
      deploymentInfo.treasuryPDA = treasuryPDA.toBase58();
      deploymentInfo.mintAuthorityPDA = mintAuthorityPDA.toBase58();
      deploymentInfo.treasuryTokenAccount = treasuryTokenAddress.toBase58();
      deploymentInfo.configAccount = configAccount.publicKey.toBase58();
      deploymentInfo.initialized = true;
      
      // Save the updated deployment info
      saveDeploymentInfo(deploymentInfo);
      
      return {
        treasuryPDA: treasuryPDA.toBase58(),
        treasuryTokenAccount: treasuryTokenAddress.toBase58(),
        configAccount: configAccount.publicKey.toBase58(),
        success: true
      };
    } catch (error) {
      console.error("Error initializing contract:", error);
      
      // Add transaction logs if available
      //@ts-ignore
      if (error && error.logs) {
        console.log("\nTransaction logs:");
        //@ts-ignore
        error.logs.forEach((log, i) => console.log(`  ${i}: ${log}`));
      }
      
      throw new Error("Failed to initialize contract. See logs for details.");
    }
  } catch (error) {
    console.error("Error initializing treasury:", error);
    throw error;
  }
}

// Run the script
initializeTreasury()
  .then((result) => {
    console.log("\n🎉 Treasury initialization completed successfully.");
    console.log(result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Treasury initialization failed:", error);
    process.exit(1);
  });