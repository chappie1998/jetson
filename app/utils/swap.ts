import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { 
  PROGRAM_ID, 
  USDC_MINT, 
  USDS_MINT, 
  TREASURY_SEED, 
  MINT_AUTHORITY_SEED, 
  CONFIG_SEED,
  DEPLOYMENT_INFO
} from '../config';

export async function swapTokens(
  connection: Connection,
  userPublicKey: PublicKey,
  amount: number,
  direction: 'usdc-to-usds' | 'usds-to-usdc',
  signTransaction: (transaction: Transaction) => Promise<Transaction>
): Promise<string> {
  try {
    console.log(`Swapping ${amount} ${direction === 'usdc-to-usds' ? 'USDC to USDS' : 'USDS to USDC'}`);
    
    // Convert amount to lamports (USDC has 6 decimals)
    const amountLamports = Math.floor(amount * 1_000_000);
    
    // Get the user's token accounts
    const userUsdcAccount = await getAssociatedTokenAddress(USDC_MINT, userPublicKey);
    const userUsdsAccount = await getAssociatedTokenAddress(USDS_MINT, userPublicKey);

    // Get PDAs
    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(TREASURY_SEED)],
      PROGRAM_ID
    );

    const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(MINT_AUTHORITY_SEED)],
      PROGRAM_ID
    );

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(CONFIG_SEED)],
      PROGRAM_ID
    );

    // Get config account and treasury token account from deployment info
    const configAccount = new PublicKey(DEPLOYMENT_INFO.configAccount);
    const treasuryTokenAccount = new PublicKey(DEPLOYMENT_INFO.treasuryTokenAccount);
    
    // Create Anchor format instruction data with 8-byte discriminator and borsh serialized data
    let discriminator: number[];
    if (direction === 'usdc-to-usds') {
      // Discriminator for swap_usdc_to_usds from IDL
      discriminator = [3, 47, 72, 28, 13, 138, 47, 210];
    } else {
      // Discriminator for swap_usds_to_usdc from IDL
      discriminator = [254, 45, 112, 36, 49, 103, 151, 48];
    }
    
    // Create buffer for instruction data (8 bytes discriminator + 8 bytes for amount)
    const instructionData = Buffer.alloc(16);
    
    // Write discriminator
    for (let i = 0; i < 8; i++) {
      instructionData.writeUInt8(discriminator[i], i);
    }
    
    // Write amount as little-endian 64-bit integer (Borsh format for u64)
    instructionData.writeBigUInt64LE(BigInt(amountLamports), 8);
    
    console.log("Instruction data:", instructionData.toString('hex'));

    // Add the Associated Token Program ID for proper account derivation
    const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    
    // Create the swap instruction with accounts exactly as expected by the program
    const swapInstruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: userPublicKey, isSigner: true, isWritable: false }, // user
        { pubkey: configAccount, isSigner: false, isWritable: false }, // config
        { pubkey: userUsdcAccount, isSigner: false, isWritable: true }, // user_usdc
        { pubkey: userUsdsAccount, isSigner: false, isWritable: true }, // user_usds
        { pubkey: treasuryPda, isSigner: false, isWritable: false }, // treasury_authority
        { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true }, // treasury_token_account
        { pubkey: mintAuthorityPda, isSigner: false, isWritable: false }, // mint_authority
        { pubkey: USDS_MINT, isSigner: false, isWritable: true }, // usds_mint
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // associated_token_program
      ],
      data: instructionData,
    });

    // Create transaction
    const transaction = new Transaction();
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;
    
    // Add instruction to transaction
    transaction.add(swapInstruction);
    
    // Sign transaction
    console.log("Signing transaction...");
    const signedTransaction = await signTransaction(transaction);
    
    // Send transaction
    console.log("Sending transaction...");
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    );
    
    console.log("Transaction sent:", signature);
    console.log("Confirming transaction...");
    
    // Confirm transaction
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    console.log("Transaction confirmed!");
    return signature;
  } catch (error) {
    console.error("Error in swapTokens:", error);
    throw error;
  }
} 