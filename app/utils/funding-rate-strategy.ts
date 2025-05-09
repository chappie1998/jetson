import axios from 'axios';
import { BN } from '@project-serum/anchor';
import { OffChainStrategy } from './off-chain-strategy';

// Extended strategy that may include metrics
interface ExtendedStrategy extends OffChainStrategy {
  metrics?: {
    fundingRate?: number;
    healthRatio?: number;
    fundingCollected?: number;
    [key: string]: any;
  };
}

// Exchange interface for API interactions
interface Exchange {
  name: string;
  baseUrl: string;
  getFundingRates: (assets: string[]) => Promise<FundingRateData[]>;
  getMarketData: (asset: string) => Promise<MarketData>;
}

// Funding rate data structure
interface FundingRateData {
  asset: string;
  symbol: string;
  rate: number;  // Current funding rate (%)
  nextPaymentTimestamp: number;
  annualizedRate: number;
  exchange: string;
}

// Market data structure
interface MarketData {
  price: number;
  volume24h: number;
  openInterest: number;
  liquidityDepth: number;
}

// Position tracking
interface Position {
  asset: string;
  exchange: string;
  size: number;  // Size in USD
  direction: 'long' | 'short';
  entryPrice: number;
  leverage: number;
  fundingPaid: number;
  fundingReceived: number;
  timestamp: number;
}

// FRA Strategy stats
export interface FRAStats {
  totalFundingCollected: number;
  annualizedYield: number;
  averageFundingRate: number;
  highestFundingAsset: string;
  highestFundingRate: number;
  lastRebalance: number;
  activePositions: number;
  totalCollateral: number;
  totalNotional: number;
  netExposure: number;
  healthRatio: number;
}

/**
 * Funding Rate Arbitrage Strategy
 * 
 * This strategy captures funding payments from perpetual futures markets
 * while maintaining delta-neutral exposure to the underlying assets.
 */
export class FundingRateArbitrageStrategy {
  private exchanges: Exchange[] = [];
  private positions: Position[] = [];
  private collateralAmount: number;
  private collateralAsset: string;
  private targetAssets: string[];
  private stats: FRAStats;
  private maxLeverage: number;
  private strategy: ExtendedStrategy;
  private insuranceFundPercentage: number;
  private minFundingThreshold: number;

  constructor(
    strategy: OffChainStrategy,
    collateralAmount: number,
    collateralAsset: string = 'USDC',
    targetAssets: string[] = ['ETH', 'SOL', 'BTC'],
    maxLeverage: number = 3,
    insuranceFundPercentage: number = 0.05,
    minFundingThreshold: number = 0.05 // 5% annualized
  ) {
    this.strategy = strategy as ExtendedStrategy;
    this.collateralAmount = collateralAmount;
    this.collateralAsset = collateralAsset;
    this.targetAssets = targetAssets;
    this.maxLeverage = maxLeverage;
    this.insuranceFundPercentage = insuranceFundPercentage;
    this.minFundingThreshold = minFundingThreshold;
    
    // Initialize stats
    this.stats = {
      totalFundingCollected: 0,
      annualizedYield: 0,
      averageFundingRate: 0,
      highestFundingAsset: '',
      highestFundingRate: 0,
      lastRebalance: Date.now(),
      activePositions: 0,
      totalCollateral: collateralAmount,
      totalNotional: 0,
      netExposure: 0,
      healthRatio: 1
    };
    
    // Initialize supported exchanges
    this.initializeExchanges();
  }
  
  // Initialize exchange API integrations
  private initializeExchanges() {
    // Binance
    this.exchanges.push({
      name: 'Binance',
      baseUrl: 'https://fapi.binance.com',
      getFundingRates: async (assets: string[]): Promise<FundingRateData[]> => {
        try {
          const response = await axios.get(`${this.exchanges[0].baseUrl}/fapi/v1/premiumIndex`);
          return response.data
            .filter((item: any) => assets.some(asset => item.symbol.includes(asset)))
            .map((item: any) => ({
              asset: this.extractAsset(item.symbol),
              symbol: item.symbol,
              rate: parseFloat(item.lastFundingRate) * 100,
              nextPaymentTimestamp: item.nextFundingTime,
              annualizedRate: parseFloat(item.lastFundingRate) * 100 * 3 * 365, // 3 times per day * 365 days
              exchange: 'Binance'
            }));
        } catch (error) {
          console.error('Error fetching Binance funding rates:', error);
          return [];
        }
      },
      getMarketData: async (asset: string): Promise<MarketData> => {
        try {
          const symbol = `${asset}USDT`;
          const response = await axios.get(`${this.exchanges[0].baseUrl}/fapi/v1/ticker/24hr?symbol=${symbol}`);
          return {
            price: parseFloat(response.data.lastPrice),
            volume24h: parseFloat(response.data.volume) * parseFloat(response.data.lastPrice),
            openInterest: parseFloat(response.data.openInterest) * parseFloat(response.data.lastPrice),
            liquidityDepth: parseFloat(response.data.volume) / parseFloat(response.data.count) // rough estimate
          };
        } catch (error) {
          console.error(`Error fetching Binance market data for ${asset}:`, error);
          return { price: 0, volume24h: 0, openInterest: 0, liquidityDepth: 0 };
        }
      }
    });
    
    // OKX
    this.exchanges.push({
      name: 'OKX',
      baseUrl: 'https://www.okx.com',
      getFundingRates: async (assets: string[]): Promise<FundingRateData[]> => {
        try {
          const response = await axios.get(`${this.exchanges[1].baseUrl}/api/v5/public/funding-rate?instType=SWAP`);
          return response.data.data
            .filter((item: any) => assets.some(asset => item.instId.includes(asset.toUpperCase())))
            .map((item: any) => ({
              asset: this.extractAsset(item.instId),
              symbol: item.instId,
              rate: parseFloat(item.fundingRate) * 100,
              nextPaymentTimestamp: Date.now() + this.getTimeToNextFunding(),
              annualizedRate: parseFloat(item.fundingRate) * 100 * 3 * 365, // 3 times per day * 365 days
              exchange: 'OKX'
            }));
        } catch (error) {
          console.error('Error fetching OKX funding rates:', error);
          return [];
        }
      },
      getMarketData: async (asset: string): Promise<MarketData> => {
        try {
          const symbol = `${asset}-USDT-SWAP`;
          const response = await axios.get(`${this.exchanges[1].baseUrl}/api/v5/market/ticker?instId=${symbol}`);
          const openInterestResp = await axios.get(`${this.exchanges[1].baseUrl}/api/v5/public/open-interest?instId=${symbol}`);
          
          return {
            price: parseFloat(response.data.data[0].last),
            volume24h: parseFloat(response.data.data[0].vol24h) * parseFloat(response.data.data[0].last),
            openInterest: parseFloat(openInterestResp.data.data[0].oi) * parseFloat(response.data.data[0].last),
            liquidityDepth: parseFloat(response.data.data[0].bidSz) + parseFloat(response.data.data[0].askSz)
          };
        } catch (error) {
          console.error(`Error fetching OKX market data for ${asset}:`, error);
          return { price: 0, volume24h: 0, openInterest: 0, liquidityDepth: 0 };
        }
      }
    });
  }
  
  // Helper to extract asset name from symbol
  private extractAsset(symbol: string): string {
    for (const asset of this.targetAssets) {
      if (symbol.includes(asset)) {
        return asset;
      }
    }
    return symbol.split('-')[0].replace('USDT', '');
  }
  
  // Calculate time to next funding payment (usually every 8 hours)
  private getTimeToNextFunding(): number {
    const now = new Date();
    const hours = now.getUTCHours();
    let hoursToNext = 0;
    
    // Funding typically happens at 00:00, 08:00, 16:00 UTC
    if (hours < 8) {
      hoursToNext = 8 - hours;
    } else if (hours < 16) {
      hoursToNext = 16 - hours;
    } else {
      hoursToNext = 24 - hours;
    }
    
    return hoursToNext * 60 * 60 * 1000;
  }
  
  // Get all funding rates across exchanges
  async getAllFundingRates(): Promise<FundingRateData[]> {
    const allRates: FundingRateData[] = [];
    
    for (const exchange of this.exchanges) {
      const rates = await exchange.getFundingRates(this.targetAssets);
      allRates.push(...rates);
    }
    
    return allRates;
  }
  
  // Find the best funding opportunities
  async findBestFundingOpportunities(): Promise<FundingRateData[]> {
    const allRates = await this.getAllFundingRates();
    
    // Sort by annualized rate (highest first)
    const sortedRates = allRates.sort((a, b) => b.annualizedRate - a.annualizedRate);
    
    // Filter by minimum threshold
    return sortedRates.filter(rate => Math.abs(rate.annualizedRate) > this.minFundingThreshold);
  }
  
  // Execute the funding rate arbitrage strategy
  async execute(): Promise<void> {
    // 1. Find best opportunities
    const opportunities = await this.findBestFundingOpportunities();
    
    if (opportunities.length === 0) {
      console.log('No funding opportunities above threshold.');
      return;
    }
    
    // 2. Allocate capital
    const allocatedCapital = this.allocateCapital(opportunities);
    
    // 3. Place trades
    for (const allocation of allocatedCapital) {
      if (allocation.amount > 0) {
        await this.executeTrade(allocation.opportunity, allocation.amount);
      }
    }
    
    // 4. Update strategy state
    this.updateStrategyState();
    
    // 5. Update parent strategy with stats
    this.updateParentStrategy();
  }
  
  // Allocate capital across opportunities
  private allocateCapital(opportunities: FundingRateData[]): { opportunity: FundingRateData, amount: number }[] {
    const allocations: { opportunity: FundingRateData, amount: number }[] = [];
    
    // Set aside insurance fund
    const deployableCapital = this.collateralAmount * (1 - this.insuranceFundPercentage);
    
    // Simple allocation - weight by funding rate
    const totalRates = opportunities.reduce((sum, opp) => sum + Math.abs(opp.annualizedRate), 0);
    
    for (const opportunity of opportunities) {
      const weightedAllocation = (Math.abs(opportunity.annualizedRate) / totalRates) * deployableCapital;
      allocations.push({
        opportunity,
        amount: weightedAllocation
      });
    }
    
    return allocations;
  }
  
  // Execute a single trade
  private async executeTrade(opportunity: FundingRateData, amount: number): Promise<void> {
    try {
      // Get current market data
      const exchange = this.exchanges.find(ex => ex.name === opportunity.exchange);
      if (!exchange) {
        throw new Error(`Exchange ${opportunity.exchange} not found`);
      }
      
      const marketData = await exchange.getMarketData(opportunity.asset);
      
      // Calculate position size
      const positionSize = amount * this.maxLeverage;
      
      // In real implementation, this would call the exchange API to place the trade
      console.log(`Placing ${opportunity.rate > 0 ? 'SHORT' : 'LONG'} position of ${positionSize} USD on ${opportunity.asset} at ${exchange.name}`);
      
      // Add to positions list
      this.positions.push({
        asset: opportunity.asset,
        exchange: opportunity.exchange,
        size: positionSize,
        direction: opportunity.rate > 0 ? 'short' : 'long', // Short when funding rate is positive
        entryPrice: marketData.price,
        leverage: this.maxLeverage,
        fundingPaid: 0,
        fundingReceived: 0,
        timestamp: Date.now()
      });
      
      // Update stats
      this.stats.activePositions = this.positions.length;
      this.stats.totalNotional += positionSize;
      this.stats.lastRebalance = Date.now();
    } catch (error) {
      console.error(`Error executing trade for ${opportunity.asset} on ${opportunity.exchange}:`, error);
    }
  }
  
  // Simulate funding payment for a position
  async simulateFundingPayment(position: Position): Promise<number> {
    const exchange = this.exchanges.find(ex => ex.name === position.exchange);
    if (!exchange) {
      return 0;
    }
    
    try {
      const rates = await exchange.getFundingRates([position.asset]);
      const assetRate = rates.find(rate => rate.asset === position.asset);
      
      if (!assetRate) {
        return 0;
      }
      
      // Calculate funding payment
      // Funding rate is expressed as a percentage
      const fundingPayment = (position.size * assetRate.rate) / 100;
      
      // If we're short and rate is positive, we receive funding
      // If we're long and rate is negative, we receive funding
      let fundingReceived = 0;
      
      if ((position.direction === 'short' && assetRate.rate > 0) || 
          (position.direction === 'long' && assetRate.rate < 0)) {
        fundingReceived = Math.abs(fundingPayment);
        position.fundingReceived += fundingReceived;
        this.stats.totalFundingCollected += fundingReceived;
      } else {
        // We pay funding
        position.fundingPaid += Math.abs(fundingPayment);
      }
      
      return fundingReceived;
    } catch (error) {
      console.error(`Error simulating funding payment for ${position.asset}:`, error);
      return 0;
    }
  }
  
  // Update strategy state
  private updateStrategyState(): void {
    // Calculate net exposure
    let longNotional = 0;
    let shortNotional = 0;
    
    for (const position of this.positions) {
      if (position.direction === 'long') {
        longNotional += position.size;
      } else {
        shortNotional += position.size;
      }
    }
    
    this.stats.netExposure = longNotional - shortNotional;
    
    // Update health ratio
    this.stats.healthRatio = this.collateralAmount / (this.stats.totalNotional * 0.1); // Assuming 10% maintenance margin
    
    // Update yield calculations
    const totalFunding = this.stats.totalFundingCollected;
    const elapsedDays = (Date.now() - this.positions[0]?.timestamp || Date.now()) / (24 * 60 * 60 * 1000);
    
    if (elapsedDays > 0) {
      this.stats.annualizedYield = (totalFunding / this.collateralAmount) * (365 / elapsedDays);
    }
  }
  
  // Update parent strategy with our stats
  private updateParentStrategy(): void {
    try {
      // Initialize metrics if it doesn't exist
      if (!this.strategy.metrics) {
        this.strategy.metrics = {};
      }
      
      // Update the metrics
      this.strategy.metrics = {
        ...this.strategy.metrics,
        fundingRate: this.stats.averageFundingRate,
        healthRatio: this.stats.healthRatio,
        fundingCollected: this.stats.totalFundingCollected
      };
      
      // Update hedge ratio if available
      if ('hedgeRatio' in this.strategy) {
        const netExposurePercent = this.stats.netExposure / this.stats.totalNotional;
        this.strategy.hedgeRatio = 1 - Math.abs(netExposurePercent);
      }
      
      // Update other fields using type assertion when needed
      (this.strategy as any).dailyYield = this.stats.annualizedYield / 365;
      
      // Use lastRebalancedAt instead of lastUpdate 
      this.strategy.lastRebalancedAt = Date.now();
    } catch (error) {
      console.error('Error updating parent strategy:', error);
    }
  }
  
  // Close a position
  async closePosition(positionIndex: number): Promise<void> {
    if (positionIndex < 0 || positionIndex >= this.positions.length) {
      throw new Error('Invalid position index');
    }
    
    const position = this.positions[positionIndex];
    
    // In real implementation, this would call the exchange API to close the position
    console.log(`Closing ${position.direction} position of ${position.size} USD on ${position.asset} at ${position.exchange}`);
    
    // Calculate PnL
    const exchange = this.exchanges.find(ex => ex.name === position.exchange);
    if (!exchange) {
      throw new Error(`Exchange ${position.exchange} not found`);
    }
    
    const marketData = await exchange.getMarketData(position.asset);
    const priceDiff = position.direction === 'short' 
      ? position.entryPrice - marketData.price
      : marketData.price - position.entryPrice;
      
    const pnl = (priceDiff / position.entryPrice) * position.size;
    
    console.log(`Position closed with PnL: ${pnl} USD`);
    console.log(`Total funding received: ${position.fundingReceived} USD`);
    console.log(`Total funding paid: ${position.fundingPaid} USD`);
    
    // Remove position
    this.positions.splice(positionIndex, 1);
    
    // Update stats
    this.stats.activePositions = this.positions.length;
    this.stats.totalNotional -= position.size;
    
    // Update strategy state
    this.updateStrategyState();
    this.updateParentStrategy();
  }
  
  // Get strategy stats
  getStats(): FRAStats {
    return this.stats;
  }
} 