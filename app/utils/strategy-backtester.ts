import { OffChainStrategy } from './off-chain-strategy';
import axios from 'axios';

// Historical price data point
interface HistoricalDataPoint {
  timestamp: number;
  price: number;
  volume?: number;
  fundingRate?: number;
}

// Price data for an asset
interface AssetPriceData {
  symbol: string;
  data: HistoricalDataPoint[];
}

// Backtesting result
export interface BacktestResult {
  strategyId: string;
  strategyName: string;
  strategyType: string;
  startDate: Date;
  endDate: Date;
  initialValue: number;
  finalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  winRate: number;
  exposureStats: {
    avgNetExposure: number;
    maxNetExposure: number;
    avgHedgeRatio: number;
  };
  dailyReturns: { date: string; value: number; return: number }[];
  monthlyReturns: { month: string; return: number }[];
  riskMetrics: {
    sortinoRatio: number;
    calmarRatio: number;
    betaToMarket: number;
  };
}

export class StrategyBacktester {
  private priceCache: Map<string, AssetPriceData> = new Map();
  private marketData: Map<string, any> = new Map();

  // Load historical price data
  async loadHistoricalData(
    assets: string[],
    startTimestamp: number,
    endTimestamp: number
  ): Promise<void> {
    for (const asset of assets) {
      try {
        // For this example, we'll use CoinGecko for historical data
        // In a real implementation, you might use multiple sources and merge the data
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${asset}/market_chart/range`,
          {
            params: {
              vs_currency: 'usd',
              from: Math.floor(startTimestamp / 1000),
              to: Math.floor(endTimestamp / 1000)
            }
          }
        );

        // Transform the data into our format
        const priceData: HistoricalDataPoint[] = response.data.prices.map(
          (item: [number, number]) => ({
            timestamp: item[0],
            price: item[1]
          })
        );

        // Add volume data if available
        if (response.data.total_volumes) {
          response.data.total_volumes.forEach((item: [number, number], index: number) => {
            if (index < priceData.length && priceData[index].timestamp === item[0]) {
              priceData[index].volume = item[1];
            }
          });
        }

        this.priceCache.set(asset, {
          symbol: asset,
          data: priceData
        });
        
        console.log(`Loaded ${priceData.length} historical data points for ${asset}`);
      } catch (error) {
        console.error(`Error loading historical data for ${asset}:`, error);
        // Use mock data for testing if API call fails
        this.priceCache.set(asset, {
          symbol: asset,
          data: this.generateMockPriceData(startTimestamp, endTimestamp, asset)
        });
      }
    }
    
    // Load funding rate data
    await this.loadFundingRateData(assets, startTimestamp, endTimestamp);
  }
  
  // Load funding rate data for perpetual futures
  private async loadFundingRateData(
    assets: string[],
    startTimestamp: number,
    endTimestamp: number
  ): Promise<void> {
    for (const asset of assets) {
      try {
        // This would be an API call to get historical funding rates
        // For example, from FTX, Binance, etc.
        // For now, we'll generate mock data
        const fundingRateData = this.generateMockFundingRateData(startTimestamp, endTimestamp);
        
        // Merge with existing price data
        const assetData = this.priceCache.get(asset);
        if (assetData) {
          assetData.data.forEach((point, index) => {
            // Find closest funding rate by timestamp
            const closestFundingRate = fundingRateData.find(
              fr => Math.abs(fr.timestamp - point.timestamp) < 3600000 // Within 1 hour
            );
            
            if (closestFundingRate) {
              point.fundingRate = closestFundingRate.fundingRate;
            }
          });
        }
      } catch (error) {
        console.error(`Error loading funding rate data for ${asset}:`, error);
      }
    }
  }
  
  // Generate mock price data for testing
  private generateMockPriceData(
    startTimestamp: number,
    endTimestamp: number,
    asset: string
  ): HistoricalDataPoint[] {
    const data: HistoricalDataPoint[] = [];
    const hoursInRange = Math.floor((endTimestamp - startTimestamp) / (60 * 60 * 1000));
    
    // Different starting prices for different assets
    let basePrice = 0;
    if (asset === 'bitcoin') basePrice = 30000;
    else if (asset === 'ethereum') basePrice = 2000;
    else if (asset === 'solana') basePrice = 100;
    else basePrice = 1; // Default for stablecoins, etc.
    
    let currentPrice = basePrice;
    let volatility = asset === 'bitcoin' ? 0.02 : asset === 'ethereum' ? 0.025 : 0.03;
    
    // Stablecoins have very low volatility
    if (asset === 'usd-coin' || asset === 'tether' || asset === 'dai') {
      volatility = 0.001;
      currentPrice = 1;
    }
    
    for (let i = 0; i < hoursInRange; i++) {
      const timestamp = startTimestamp + i * 60 * 60 * 1000;
      
      // Random walk with drift
      const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
      currentPrice = Math.max(0.001, currentPrice + change);
      
      // Add some volume data
      const volume = currentPrice * (1000000 + Math.random() * 5000000);
      
      data.push({
        timestamp,
        price: currentPrice,
        volume
      });
    }
    
    return data;
  }
  
  // Generate mock funding rate data for testing
  private generateMockFundingRateData(
    startTimestamp: number,
    endTimestamp: number
  ): HistoricalDataPoint[] {
    const data: HistoricalDataPoint[] = [];
    // Funding rates are typically 8-hourly
    const periodsInRange = Math.floor((endTimestamp - startTimestamp) / (8 * 60 * 60 * 1000));
    
    for (let i = 0; i < periodsInRange; i++) {
      const timestamp = startTimestamp + i * 8 * 60 * 60 * 1000;
      
      // Generate random funding rate between -0.1% and 0.1%
      // This represents the 8-hour funding rate
      const fundingRate = (Math.random() - 0.5) * 0.002;
      
      data.push({
        timestamp,
        price: 0, // Not used for funding rates
        fundingRate
      });
    }
    
    return data;
  }

  // Backtest a strategy with the loaded historical data
  async backtest(
    strategy: OffChainStrategy,
    startDate: Date,
    endDate: Date
  ): Promise<BacktestResult> {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Make sure we have price data for the relevant assets
    const requiredAssets = this.getStrategyAssets(strategy);
    await this.loadHistoricalData(requiredAssets, startTimestamp, endTimestamp);
    
    // Set initial state
    let portfolioValue = strategy.usdcAllocated;
    let currentTimestamp = startTimestamp;
    const dailyReturns: { date: string; value: number; return: number }[] = [];
    const monthlyReturns: Map<string, number> = new Map();
    let lastRebalance = startTimestamp;
    let maxValue = portfolioValue;
    let minDrawdown = 1.0; // Minimum drawdown ratio (1.0 = no drawdown)
    
    // For Sharpe ratio calculation
    const returns: number[] = [];
    let previousValue = portfolioValue;
    
    // For exposure tracking
    let netExposureSum = 0;
    let hedgeRatioSum = 0;
    let maxNetExposure = 0;
    let dataPoints = 0;
    
    // Process each day in the backtest period
    while (currentTimestamp <= endTimestamp) {
      const currentDate = new Date(currentTimestamp);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Process strategy-specific logic
      if (strategy.type === 'Basis Trade') {
        portfolioValue = await this.processBasisTradeStrategy(strategy, currentTimestamp, portfolioValue, lastRebalance);
      } else if (strategy.type === 'Funding Rate') {
        portfolioValue = await this.processFundingRateStrategy(strategy, currentTimestamp, portfolioValue, lastRebalance);
      } else {
        portfolioValue = await this.processGenericStrategy(strategy, currentTimestamp, portfolioValue, lastRebalance);
      }
      
      // Check for rebalance
      const hoursSinceRebalance = (currentTimestamp - lastRebalance) / (60 * 60 * 1000);
      if (hoursSinceRebalance >= 24) { // Rebalance daily in backtest
        lastRebalance = currentTimestamp;
      }
      
      // Calculate daily return
      const dailyReturn = portfolioValue / previousValue - 1;
      previousValue = portfolioValue;
      returns.push(dailyReturn);
      
      // Track max value for drawdown calculation
      if (portfolioValue > maxValue) {
        maxValue = portfolioValue;
      }
      
      // Calculate drawdown
      const drawdownRatio = portfolioValue / maxValue;
      if (drawdownRatio < minDrawdown) {
        minDrawdown = drawdownRatio;
      }
      
      // Store daily return
      dailyReturns.push({
        date: dateStr,
        value: portfolioValue,
        return: dailyReturn
      });
      
      // Aggregate monthly returns
      const monthStr = dateStr.substring(0, 7); // YYYY-MM
      if (!monthlyReturns.has(monthStr)) {
        monthlyReturns.set(monthStr, 1.0);
      }
      const currentMonthReturn = monthlyReturns.get(monthStr)!;
      monthlyReturns.set(monthStr, currentMonthReturn * (1 + dailyReturn));
      
      // Track exposure metrics
      const currentNetExposure = Math.abs(strategy.longExposure - strategy.shortExposure) / strategy.usdcDeployed;
      netExposureSum += currentNetExposure;
      hedgeRatioSum += strategy.hedgeRatio;
      maxNetExposure = Math.max(maxNetExposure, currentNetExposure);
      dataPoints++;
      
      // Move to next day
      currentTimestamp += 24 * 60 * 60 * 1000;
    }
    
    // Calculate performance metrics
    const totalDays = (endTimestamp - startTimestamp) / (24 * 60 * 60 * 1000);
    const totalReturn = portfolioValue / strategy.usdcAllocated - 1;
    const annualizedReturn = Math.pow(1 + totalReturn, 365 / totalDays) - 1;
    
    // Calculate Sharpe ratio (assuming risk-free rate of 4%)
    const riskFreeDaily = Math.pow(1.04, 1/365) - 1;
    const excessReturns = returns.map(r => r - riskFreeDaily);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const stdDevExcessReturn = Math.sqrt(
      excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcessReturn, 2), 0) / excessReturns.length
    );
    const sharpeRatio = (stdDevExcessReturn === 0) ? 0 : (avgExcessReturn / stdDevExcessReturn) * Math.sqrt(365);
    
    // Calculate Sortino ratio (downside deviation only)
    const negativeReturns = excessReturns.filter(r => r < 0);
    const avgNegativeReturn = negativeReturns.length > 0 
      ? negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length 
      : 0;
    const downsideDeviation = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + Math.pow(r - avgNegativeReturn, 2), 0) / 
      (negativeReturns.length || 1)
    );
    const sortinoRatio = (downsideDeviation === 0) ? 0 : (avgExcessReturn / downsideDeviation) * Math.sqrt(365);
    
    // Calculate Calmar ratio (return / max drawdown)
    const maxDrawdown = 1 - minDrawdown;
    const calmarRatio = (maxDrawdown === 0) ? 0 : annualizedReturn / maxDrawdown;
    
    // Calculate win rate
    const winningDays = returns.filter(r => r > 0).length;
    const winRate = returns.length > 0 ? winningDays / returns.length : 0;
    
    // Format monthly returns
    const monthlyReturnsArray = Array.from(monthlyReturns.entries())
      .map(([month, value]) => ({
        month,
        return: value - 1 // Convert from cumulative multiplier to percentage
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // Placeholder for beta calculation - would need market returns
    const betaToMarket = 0.2; // Placeholder, should be calculated with actual market data
    
    return {
      strategyId: strategy.id,
      strategyName: strategy.name,
      strategyType: strategy.type,
      startDate,
      endDate,
      initialValue: strategy.usdcAllocated,
      finalValue: portfolioValue,
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      volatility: stdDevExcessReturn * Math.sqrt(365), // Annualized
      maxDrawdown,
      winRate,
      exposureStats: {
        avgNetExposure: netExposureSum / dataPoints,
        maxNetExposure,
        avgHedgeRatio: hedgeRatioSum / dataPoints
      },
      dailyReturns,
      monthlyReturns: monthlyReturnsArray,
      riskMetrics: {
        sortinoRatio,
        calmarRatio,
        betaToMarket
      }
    };
  }
  
  // Process a basis trade strategy for the current timestamp
  private async processBasisTradeStrategy(
    strategy: OffChainStrategy,
    currentTimestamp: number,
    portfolioValue: number,
    lastRebalance: number
  ): Promise<number> {
    // Get BTC and ETH price data for this timestamp
    const btcPricePoint = this.getNearestPricePoint('bitcoin', currentTimestamp);
    const ethPricePoint = this.getNearestPricePoint('ethereum', currentTimestamp);
    
    if (!btcPricePoint || !ethPricePoint) {
      return portfolioValue; // No change if no price data
    }
    
    // Simulate basis trading
    // In a basis trade, we're capturing spread between spot and futures
    // Typically this ranges from 5-15% APY
    
    // Simulate basis trade yield (around 8-12% APY)
    const dailyYield = (0.10 / 365); // 10% annual yield
    
    // Add some variance based on market volatility
    const volatilityFactor = this.calculateVolatilityFactor(btcPricePoint, ethPricePoint);
    
    // Higher volatility generally leads to wider basis spreads
    const adjustedYield = dailyYield * (1 + volatilityFactor);
    
    // Apply the yield to the portfolio
    return portfolioValue * (1 + adjustedYield);
  }
  
  // Process a funding rate strategy for the current timestamp
  private async processFundingRateStrategy(
    strategy: OffChainStrategy,
    currentTimestamp: number,
    portfolioValue: number,
    lastRebalance: number
  ): Promise<number> {
    // Get BTC price data for this timestamp
    const btcPricePoint = this.getNearestPricePoint('bitcoin', currentTimestamp);
    
    if (!btcPricePoint || !btcPricePoint.fundingRate) {
      return portfolioValue; // No change if no funding rate data
    }
    
    // In funding rate strategies, we capture the funding payments
    // while maintaining delta neutrality
    
    // Funding is typically paid every 8 hours (3 times per day)
    // Determine if this timestamp has a funding payment
    const hourOfDay = new Date(currentTimestamp).getUTCHours();
    const hasFundingPayment = hourOfDay % 8 === 0;
    
    if (hasFundingPayment) {
      // Apply funding rate to portfolio
      // Note: funding rate is applied to the notional value, which is leveraged
      const leverage = 3; // Typical leverage for this strategy
      const fundingImpact = btcPricePoint.fundingRate * leverage;
      
      // In a real strategy, we'd be short or long based on the sign of the rate
      // Here we simplify by always being on the receiving end
      const absoluteFundingImpact = Math.abs(fundingImpact);
      
      // Apply funding impact
      return portfolioValue * (1 + absoluteFundingImpact);
    }
    
    return portfolioValue; // No change if no funding payment
  }
  
  // Process a generic strategy for the current timestamp
  private async processGenericStrategy(
    strategy: OffChainStrategy,
    currentTimestamp: number,
    portfolioValue: number,
    lastRebalance: number
  ): Promise<number> {
    // For generic multi-strategy approach, use a weighted average of strategies
    const basisComponent = await this.processBasisTradeStrategy(
      strategy, currentTimestamp, portfolioValue * 0.4, lastRebalance
    );
    
    const fundingComponent = await this.processFundingRateStrategy(
      strategy, currentTimestamp, portfolioValue * 0.4, lastRebalance
    );
    
    // Static component (stablecoin lending, etc)
    const staticYield = 0.07 / 365; // 7% APY
    const staticComponent = portfolioValue * 0.2 * (1 + staticYield);
    
    // Combine components
    return basisComponent + fundingComponent - (portfolioValue * 0.8) + staticComponent;
  }
  
  // Get the nearest price data point for an asset at a given timestamp
  private getNearestPricePoint(
    asset: string,
    timestamp: number
  ): HistoricalDataPoint | null {
    const assetData = this.priceCache.get(asset);
    if (!assetData) return null;
    
    // Find nearest data point
    let nearestPoint: HistoricalDataPoint | null = null;
    let minTimeDiff = Infinity;
    
    for (const point of assetData.data) {
      const timeDiff = Math.abs(point.timestamp - timestamp);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        nearestPoint = point;
      }
    }
    
    return nearestPoint;
  }
  
  // Calculate a volatility factor based on recent price action
  private calculateVolatilityFactor(
    btcPoint: HistoricalDataPoint,
    ethPoint: HistoricalDataPoint
  ): number {
    // In a real implementation, we'd look at historical volatility
    // Here we'll use a simplified approach based on trading volume
    const btcVolFactor = btcPoint.volume ? btcPoint.volume / 10000000000 : 1;
    const ethVolFactor = ethPoint.volume ? ethPoint.volume / 5000000000 : 1;
    
    return Math.min(2.0, (btcVolFactor + ethVolFactor) / 2);
  }
  
  // Determine which assets are needed for a strategy
  private getStrategyAssets(strategy: OffChainStrategy): string[] {
    const baseAssets = ['bitcoin', 'ethereum', 'solana', 'usd-coin'];
    
    if (strategy.type === 'Basis Trade') {
      return [...baseAssets];
    } else if (strategy.type === 'Funding Rate') {
      return [...baseAssets];
    } else {
      return [...baseAssets];
    }
  }
} 