// @ts-nocheck
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@project-serum/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
// import * as idl from '../../target/idl/usds_swap.json';
import { 
  PROGRAM_ID, 
  USDC_MINT, 
  USDS_MINT, 
  TREASURY_SEED, 
  DEPLOYMENT_INFO 
} from '../config';

// Strategy types that match the Rust enum
export enum StrategyType {
  LiquidStaking = 0,
  Lending = 1,
  LiquidityProvision = 2
}

// Strategy states that match the Rust enum
export enum StrategyState {
  Active = 0,
  Paused = 1,
  Terminated = 2
}

// Interface for strategy metadata
export interface StrategyMetadata {
  name: string;
  description: string;
  riskLevel: string; // 'Low', 'Medium', 'High'
  expectedApy: number; // Percentage (e.g., 8.5)
  strategyType: StrategyType;
  allocationPercentage: number;
  tags: string[];
}

// Interface for off-chain delta neutral strategy configuration
export interface DeltaNeutralConfig {
  // Identifiers
  id: string;
  name: string;
  description: string;
  
  // Core parameters
  strategyType: StrategyType;
  targetApy: number; // Basis points (e.g., 500 = 5%)
  riskScore: number; // 1-100
  
  // Allocation parameters
  allocationPercentage: number; // 0-100
  minAllocation: number; // Minimum USDC allocation
  maxAllocation: number; // Maximum USDC allocation
  
  // Rebalance parameters
  rebalanceThreshold: number; // Percentage deviation to trigger rebalance
  rebalanceFrequency: number; // Minimum time between rebalances (in seconds)
  
  // Strategy-specific parameters
  hedgeRatio: number; // Percentage of position to hedge (e.g., 100 = full hedge)
  leverageRatio: number; // Leverage ratio (e.g., 3 = 3x leverage)
  
  // External protocol integration
  protocols: {
    name: string;
    address: string;
    apy: number;
    weight: number;
  }[];
  
  // Monitoring parameters
  healthThreshold: number; // Health factor threshold to warn/act
  
  // Strategy state
  isActive: boolean;
  createdAt: number;
  lastUpdatedAt: number;
}

// Class to manage delta neutral strategies
export class DeltaNeutralManager {
  private connection: Connection;
  private wallet: Wallet;
  private program: Program;
  private strategies: Map<string, DeltaNeutralConfig>;
  private onchainStrategies: Map<string, PublicKey>;
  
  constructor(connection: Connection, wallet: Wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.program = new Program(idl as any, PROGRAM_ID, new AnchorProvider(connection, wallet, {}));
    this.strategies = new Map();
    this.onchainStrategies = new Map();
  }
  
  /**
   * Initialize a new delta neutral strategy both on-chain and off-chain
   */
  async initializeStrategy(
    config: DeltaNeutralConfig,
    onchain: boolean = true
  ): Promise<string> {
    try {
      // Store off-chain strategy config
      this.strategies.set(config.id, config);
      
      // Initialize on-chain if requested
      if (onchain) {
        // Derive the PDAs we need
        const [treasuryPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(TREASURY_SEED)],
          PROGRAM_ID
        );
        
        // Convert config to on-chain format
        const targetApyBN = new BN(config.targetApy);
        const strategySeed = config.id;
        
        // Submit transaction to initialize strategy on-chain
        const tx = await this.program.methods
          .initializeStrategy(
            config.strategyType,
            config.allocationPercentage,
            targetApyBN,
            config.riskScore,
            strategySeed
          )
          .accounts({
            authority: this.wallet.publicKey,
            config: new PublicKey(DEPLOYMENT_INFO.configAccount),
            treasury: treasuryPda,
            treasuryTokenAccount: new PublicKey(DEPLOYMENT_INFO.treasuryTokenAccount),
          })
          .rpc();
          
        console.log(`Strategy initialized on-chain with tx: ${tx}`);
        
        // Get the strategy address
        const [strategyPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("strategy"), treasuryPda.toBuffer(), Buffer.from(strategySeed)],
          PROGRAM_ID
        );
        
        // Store the on-chain address
        this.onchainStrategies.set(config.id, strategyPda);
      }
      
      return config.id;
    } catch (error) {
      console.error('Error initializing strategy:', error);
      throw error;
    }
  }
  
  /**
   * Activate a delta neutral strategy
   */
  async activateStrategy(strategyId: string): Promise<void> {
    try {
      const config = this.strategies.get(strategyId);
      if (!config) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      
      // Update local state
      config.isActive = true;
      config.lastUpdatedAt = Date.now();
      this.strategies.set(strategyId, config);
      
      // Update on-chain if we have an on-chain strategy
      const strategyPda = this.onchainStrategies.get(strategyId);
      if (strategyPda) {
        // Get the treasury stats PDA
        const [treasuryPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(TREASURY_SEED)],
          PROGRAM_ID
        );
        
        const [treasuryStatsPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("treasury-stats"), treasuryPda.toBuffer()],
          PROGRAM_ID
        );
        
        // Submit transaction to activate strategy on-chain
        const tx = await this.program.methods
          .activateStrategy()
          .accounts({
            authority: this.wallet.publicKey,
            strategy: strategyPda,
            treasuryStats: treasuryStatsPda,
          })
          .rpc();
          
        console.log(`Strategy activated on-chain with tx: ${tx}`);
      }
    } catch (error) {
      console.error('Error activating strategy:', error);
      throw error;
    }
  }
  
  /**
   * Pause a delta neutral strategy
   */
  async pauseStrategy(strategyId: string): Promise<void> {
    try {
      const config = this.strategies.get(strategyId);
      if (!config) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      
      // Update local state
      config.isActive = false;
      config.lastUpdatedAt = Date.now();
      this.strategies.set(strategyId, config);
      
      // Update on-chain if we have an on-chain strategy
      const strategyPda = this.onchainStrategies.get(strategyId);
      if (strategyPda) {
        // Get the treasury stats PDA
        const [treasuryPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(TREASURY_SEED)],
          PROGRAM_ID
        );
        
        const [treasuryStatsPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("treasury-stats"), treasuryPda.toBuffer()],
          PROGRAM_ID
        );
        
        // Submit transaction to pause strategy on-chain
        const tx = await this.program.methods
          .pauseStrategy()
          .accounts({
            authority: this.wallet.publicKey,
            strategy: strategyPda,
            treasuryStats: treasuryStatsPda,
          })
          .rpc();
          
        console.log(`Strategy paused on-chain with tx: ${tx}`);
      }
    } catch (error) {
      console.error('Error pausing strategy:', error);
      throw error;
    }
  }
  
  /**
   * Update the allocation percentage for a strategy
   */
  async updateAllocation(strategyId: string, newAllocation: number): Promise<void> {
    try {
      if (newAllocation < 0 || newAllocation > 100) {
        throw new Error('Allocation percentage must be between 0 and 100');
      }
      
      const config = this.strategies.get(strategyId);
      if (!config) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      
      // Update local state
      config.allocationPercentage = newAllocation;
      config.lastUpdatedAt = Date.now();
      this.strategies.set(strategyId, config);
      
      // Update on-chain if we have an on-chain strategy
      const strategyPda = this.onchainStrategies.get(strategyId);
      if (strategyPda) {
        // Get the treasury stats PDA
        const [treasuryPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(TREASURY_SEED)],
          PROGRAM_ID
        );
        
        const [treasuryStatsPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("treasury-stats"), treasuryPda.toBuffer()],
          PROGRAM_ID
        );
        
        // Submit transaction to update allocation on-chain
        const tx = await this.program.methods
          .updateAllocation(newAllocation)
          .accounts({
            authority: this.wallet.publicKey,
            strategy: strategyPda,
            treasuryStats: treasuryStatsPda,
          })
          .rpc();
          
        console.log(`Strategy allocation updated on-chain with tx: ${tx}`);
      }
    } catch (error) {
      console.error('Error updating allocation:', error);
      throw error;
    }
  }
  
  /**
   * Report generated yield for a strategy
   */
  async reportYield(strategyId: string, yieldAmount: number, newPortfolioValue: number): Promise<void> {
    try {
      const config = this.strategies.get(strategyId);
      if (!config) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      
      // Convert to lamports
      const yieldLamports = Math.floor(yieldAmount * 1_000_000);
      const portfolioValueLamports = Math.floor(newPortfolioValue * 1_000_000);
      
      // Update on-chain treasury stats
      const [treasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(TREASURY_SEED)],
        PROGRAM_ID
      );
      
      const [treasuryStatsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury-stats"), treasuryPda.toBuffer()],
        PROGRAM_ID
      );
      
      // Submit transaction to report yield on-chain
      const tx = await this.program.methods
        .reportYield(new BN(yieldLamports), new BN(portfolioValueLamports))
        .accounts({
          authority: this.wallet.publicKey,
          treasury: treasuryPda,
          treasuryStats: treasuryStatsPda,
        })
        .rpc();
        
      console.log(`Yield reported on-chain with tx: ${tx}`);
    } catch (error) {
      console.error('Error reporting yield:', error);
      throw error;
    }
  }
  
  /**
   * Get all strategies
   */
  getAllStrategies(): DeltaNeutralConfig[] {
    return Array.from(this.strategies.values());
  }
  
  /**
   * Get a specific strategy by ID
   */
  getStrategy(strategyId: string): DeltaNeutralConfig | undefined {
    return this.strategies.get(strategyId);
  }
  
  /**
   * Execute rebalancing for a strategy (off-chain)
   * This is where the core delta neutral hedging logic would be implemented
   */
  async rebalanceStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy || !strategy.isActive) {
      console.log(`Strategy ${strategyId} not found or not active`);
      return;
    }
    
    // Check if rebalance is needed based on time threshold
    const timeSinceLastRebalance = Date.now() - strategy.lastUpdatedAt;
    if (timeSinceLastRebalance < strategy.rebalanceFrequency * 1000) {
      console.log(`Rebalance not needed yet, last rebalance was ${timeSinceLastRebalance/1000}s ago`);
      return;
    }
    
    console.log(`Rebalancing strategy ${strategy.name} (${strategyId})`);
    
    try {
      // This would be implemented based on the specific strategy type
      switch (strategy.strategyType) {
        case StrategyType.LiquidStaking:
          await this.rebalanceLiquidStakingStrategy(strategy);
          break;
        case StrategyType.Lending:
          await this.rebalanceLendingStrategy(strategy);
          break;
        case StrategyType.LiquidityProvision:
          await this.rebalanceLiquidityStrategy(strategy);
          break;
      }
      
      // Update last rebalance time
      strategy.lastUpdatedAt = Date.now();
      this.strategies.set(strategyId, strategy);
      
    } catch (error) {
      console.error(`Error rebalancing strategy ${strategyId}:`, error);
      throw error;
    }
  }
  
  /**
   * Check the health of all strategies
   */
  async checkStrategiesHealth(): Promise<any> {
    const healthReports: Array<{
      id: string;
      name: string;
      healthFactor?: number;
      isHealthy: boolean;
      lastRebalanced: string;
      needsRebalancing?: boolean;
      error?: string;
    }> = [];
    
    for (const strategy of this.strategies.values()) {
      if (!strategy.isActive) continue;
      
      try {
        const healthFactor = await this.calculateStrategyHealthFactor(strategy);
        const isHealthy = healthFactor >= strategy.healthThreshold;
        
        healthReports.push({
          id: strategy.id,
          name: strategy.name,
          healthFactor,
          isHealthy,
          lastRebalanced: new Date(strategy.lastUpdatedAt).toISOString(),
          needsRebalancing: healthFactor < strategy.healthThreshold
        });
        
        // Auto-rebalance if health is below threshold
        if (healthFactor < strategy.healthThreshold) {
          console.log(`Strategy ${strategy.id} health is below threshold, rebalancing...`);
          await this.rebalanceStrategy(strategy.id);
        }
      } catch (error) {
        console.error(`Error checking health for strategy ${strategy.id}:`, error);
        healthReports.push({
          id: strategy.id,
          name: strategy.name,
          error: `Failed to check health: ${(error as Error).message}`,
          isHealthy: false,
          lastRebalanced: new Date(strategy.lastUpdatedAt).toISOString()
        });
      }
    }
    
    return healthReports;
  }
  
  /**
   * Calculate current APY for a strategy
   */
  async calculateCurrentApy(strategyId: string): Promise<number> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }
    
    // This would be implemented based on the specific strategy type and integrated protocols
    try {
      let apy = 0;
      
      // Sum weighted APYs from all protocols
      for (const protocol of strategy.protocols) {
        // In a real implementation, we would fetch real-time APYs from each protocol
        // For now, we'll just use the stored value
        apy += protocol.apy * (protocol.weight / 100);
      }
      
      // Apply any adjustments based on strategy type
      switch (strategy.strategyType) {
        case StrategyType.LiquidStaking:
          // For liquid staking, APY is typically staking yield + hedging yield
          apy = this.adjustLiquidStakingApy(apy);
          break;
        case StrategyType.Lending:
          // For lending, APY is typically lending yield - borrowing cost + hedging yield
          apy = this.adjustLendingApy(apy);
          break;
        case StrategyType.LiquidityProvision:
          // For LP, APY is typically LP fees + rewards - IL + hedging yield
          apy = this.adjustLpApy(apy);
          break;
      }
      
      // Convert to basis points
      const apyBasisPoints = Math.floor(apy * 100);
      
      // Update on-chain if we have an on-chain strategy
      const strategyPda = this.onchainStrategies.get(strategyId);
      if (strategyPda) {
        // Get the treasury stats PDA
        const [treasuryPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(TREASURY_SEED)],
          PROGRAM_ID
        );
        
        const [treasuryStatsPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("treasury-stats"), treasuryPda.toBuffer()],
          PROGRAM_ID
        );
        
        // Submit transaction to update APY on-chain
        const tx = await this.program.methods
          .updateApy(new BN(apyBasisPoints))
          .accounts({
            authority: this.wallet.publicKey,
            strategy: strategyPda,
            treasuryStats: treasuryStatsPda,
          })
          .rpc();
          
        console.log(`APY updated on-chain with tx: ${tx}`);
      }
      
      return apy;
    } catch (error) {
      console.error(`Error calculating APY for strategy ${strategyId}:`, error);
      throw error;
    }
  }
  
  /* Private implementation methods */
  
  // These methods would implement the specific logic for each strategy type
  private async rebalanceLiquidStakingStrategy(strategy: DeltaNeutralConfig): Promise<void> {
    // 1. Check current position sizes
    // 2. Calculate target position based on strategy parameters
    // 3. Adjust positions to match target
    // 4. Update hedging positions
    console.log(`Executing liquid staking rebalance for ${strategy.name}`);
    
    // Implementation would involve:
    // - Querying current staked token positions
    // - Calculating the hedge positions needed based on staked value
    // - Adjusting futures or options positions to maintain hedge ratio
    // - Reporting results back to on-chain strategy if needed
  }
  
  private async rebalanceLendingStrategy(strategy: DeltaNeutralConfig): Promise<void> {
    // 1. Check current lending and borrowing positions
    // 2. Calculate optimal borrowing ratio based on interest rates
    // 3. Adjust positions to maintain delta neutrality
    console.log(`Executing lending rebalance for ${strategy.name}`);
    
    // Implementation would involve:
    // - Querying current lending protocol positions
    // - Checking collateralization ratios
    // - Adjusting borrowing positions based on interest rates
    // - Maintaining hedges against borrowed assets
  }
  
  private async rebalanceLiquidityStrategy(strategy: DeltaNeutralConfig): Promise<void> {
    // 1. Check current LP positions and impermanent loss
    // 2. Calculate optimal hedging position
    // 3. Adjust hedges to minimize IL exposure
    console.log(`Executing liquidity provision rebalance for ${strategy.name}`);
    
    // Implementation would involve:
    // - Calculating current LP exposure to price movements
    // - Adjusting hedging positions based on LP composition
    // - Balancing fee income against hedging costs
  }
  
  private async calculateStrategyHealthFactor(strategy: DeltaNeutralConfig): Promise<number> {
    // This would calculate how "healthy" a strategy is based on:
    // - Hedge accuracy (how well hedged is the position)
    // - Collateralization ratios
    // - Distance from liquidation thresholds
    // - Yield performance vs target
    
    // For now, return a dummy value
    return 1.5; // Above 1.0 is typically considered healthy
  }
  
  private adjustLiquidStakingApy(baseApy: number): number {
    // In a liquid staking delta neutral strategy:
    // - Positive yield comes from staking rewards
    // - Additional yield may come from funding rates on hedges
    // - Costs come from trading fees and rebalancing
    
    // Apply a simple adjustment factor for now
    return baseApy * 0.95; // Account for costs
  }
  
  private adjustLendingApy(baseApy: number): number {
    // In a lending delta neutral strategy:
    // - Positive yield comes from lending rates
    // - Costs come from borrowing rates and hedging
    
    // Apply a simple adjustment factor for now
    return baseApy * 0.9; // Account for costs
  }
  
  private adjustLpApy(baseApy: number): number {
    // In an LP delta neutral strategy:
    // - Positive yield comes from trading fees and rewards
    // - Costs come from impermanent loss and hedging
    
    // Apply a simple adjustment factor for now
    return baseApy * 0.85; // Account for IL and costs
  }
}

// Default strategy configurations for quick setup
export const DEFAULT_STRATEGIES = {
  liquidStaking: {
    id: 'liquid-staking-sol',
    name: 'Delta Neutral SOL Staking',
    description: 'Generates yield by staking SOL with delta neutral hedging to eliminate price exposure',
    strategyType: StrategyType.LiquidStaking,
    targetApy: 800, // 8%
    riskScore: 20,
    allocationPercentage: 40,
    minAllocation: 1000, // 1000 USDC
    maxAllocation: 1000000, // 1M USDC
    rebalanceThreshold: 5, // 5% deviation
    rebalanceFrequency: 86400, // Once a day
    hedgeRatio: 100, // 100% hedged
    leverageRatio: 1, // No leverage
    protocols: [
      { name: 'Marinade Finance', address: 'mSOLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', apy: 6.5, weight: 100 }
    ],
    healthThreshold: 1.2,
    isActive: false,
    createdAt: Date.now(),
    lastUpdatedAt: Date.now()
  },
  
  lending: {
    id: 'delta-neutral-lending',
    name: 'Delta Neutral Lending Strategy',
    description: 'Leverages interest rate differentials while maintaining delta neutrality',
    strategyType: StrategyType.Lending,
    targetApy: 1000, // 10%
    riskScore: 40,
    allocationPercentage: 30,
    minAllocation: 5000, // 5000 USDC
    maxAllocation: 500000, // 500K USDC
    rebalanceThreshold: 3, // 3% deviation
    rebalanceFrequency: 43200, // Twice a day
    hedgeRatio: 100, // 100% hedged
    leverageRatio: 3, // 3x leverage
    protocols: [
      { name: 'Solend', address: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo', apy: 8, weight: 60 },
      { name: 'Jet Protocol', address: 'JPv1rCqrhagNNmJVM5J1he7msQ5ybtvE1nNuHpDHMNU', apy: 6, weight: 40 }
    ],
    healthThreshold: 1.3,
    isActive: false,
    createdAt: Date.now(),
    lastUpdatedAt: Date.now()
  },
  
  liquidity: {
    id: 'delta-neutral-lp',
    name: 'Delta Neutral Liquidity Provision',
    description: 'Earns trading fees and incentives while hedging against impermanent loss',
    strategyType: StrategyType.LiquidityProvision,
    targetApy: 1200, // 12%
    riskScore: 60,
    allocationPercentage: 30,
    minAllocation: 10000, // 10K USDC
    maxAllocation: 300000, // 300K USDC
    rebalanceThreshold: 2, // 2% deviation
    rebalanceFrequency: 21600, // 4 times a day
    hedgeRatio: 90, // 90% hedged
    leverageRatio: 2, // 2x leverage
    protocols: [
      { name: 'Orca', address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', apy: 15, weight: 50 },
      { name: 'Raydium', address: 'RVKd61ztZW9GUwhRbbLoYVRE5Xf1B2tVscKqwZqXgEr', apy: 12, weight: 50 }
    ],
    healthThreshold: 1.4,
    isActive: false,
    createdAt: Date.now(),
    lastUpdatedAt: Date.now()
  }
};

// Example usage:
/*
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = new Wallet(Keypair.generate());
const deltaNeutralManager = new DeltaNeutralManager(connection, wallet);

// Initialize strategies
deltaNeutralManager.initializeStrategy(DEFAULT_STRATEGIES.liquidStaking);
deltaNeutralManager.initializeStrategy(DEFAULT_STRATEGIES.lending);
deltaNeutralManager.initializeStrategy(DEFAULT_STRATEGIES.liquidity);

// Activate a strategy
deltaNeutralManager.activateStrategy('liquid-staking-sol');

// Rebalance a strategy
deltaNeutralManager.rebalanceStrategy('liquid-staking-sol');

// Check strategies health
deltaNeutralManager.checkStrategiesHealth().then(console.log);
*/ 