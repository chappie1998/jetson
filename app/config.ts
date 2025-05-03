import { PublicKey } from '@solana/web3.js';

// Program IDs
export const PROGRAM_ID = new PublicKey('AqFGP1Fs3nJ3Ue2Nc7RVZ1AUAad5AsEr4VBRJB2mEnk3');
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Token mints
// Note: Use actual USDC devnet address for testing
export const USDC_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'); // Devnet USDC for testing
export const USDS_MINT = new PublicKey('5jMCx4W5425TPRj23KRng5nbyaZkZiD47yLXDkk5tLAV'); // USDS mint address

// PDAs
export const TREASURY_SEED = 'treasury';
export const MINT_AUTHORITY_SEED = 'mint-authority';
export const CONFIG_SEED = 'config';

// Other constants
export const USDC_DECIMALS = 6; // USDC has 6 decimals
export const USDS_DECIMALS = 6; // USDS also has 6 decimals
export const LAMPORTS_PER_USDC = 1_000_000; // 1 USDC = 10^6 lamports

// Connection
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// UI constants
export const SLIPPAGE_TOLERANCE = 0.005; // 0.5% 

// Deployment information - These are predefined accounts from program initialization
export const DEPLOYMENT_INFO = {
  usdsMint: '5jMCx4W5425TPRj23KRng5nbyaZkZiD47yLXDkk5tLAV',
  configAccount: '29K9NuhZ32uxLETt5Pzk5ukJrhidQwc47VzqKbzTHMFo',
  treasuryTokenAccount: '5Zp9heu5YsSE9iDWbu55kX7pVx8Uyru4qxjudKsx1BsM',
}; 