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

// Delta Neutral Strategy Constants
export const STRATEGY_SEEDS = {
  STRATEGY: 'strategy',
  TREASURY_STATS: 'treasury-stats'
};

export const STRATEGY_TYPE_NAMES = {
  0: 'Liquid Staking',
  1: 'Lending',
  2: 'Liquidity Provision'
};

export const STRATEGY_DEFAULT_PARAMETERS = {
  liquidStaking: {
    minAllocation: 1000, // 1000 USDC
    maxAllocation: 500000, // 500K USDC
    targetHedgeRatio: 100, // 100% hedged
    rebalanceThreshold: 5, // 5% deviation triggers rebalance
    rebalanceInterval: 86400, // Once a day in seconds
  },
  lending: {
    minAllocation: 5000, // 5000 USDC
    maxAllocation: 1000000, // 1M USDC
    targetHedgeRatio: 100, // 100% hedged
    rebalanceThreshold: 3, // 3% deviation triggers rebalance
    rebalanceInterval: 43200, // Twice a day in seconds
  },
  liquidityProvision: {
    minAllocation: 10000, // 10K USDC
    maxAllocation: 2000000, // 2M USDC
    targetHedgeRatio: 90, // 90% hedged (allowing some IL exposure)
    rebalanceThreshold: 2, // 2% deviation triggers rebalance
    rebalanceInterval: 21600, // 4 times a day in seconds
  }
}; 