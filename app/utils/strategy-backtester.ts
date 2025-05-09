// @ts-nocheck
import { OffChainStrategy } from './off-chain-strategy';
import axios from 'axios';
import { FundingRatePredictor, FundingRatePrediction } from './ml-prediction';
import { HistoricalDataPoint as DataPoint } from './types';
import { ExchangeDataFetcher } from './exchange-api';

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
  aiEnhanced?: boolean;
  predictionMetrics?: {
    accuracyScore: number;
    profitImprovement: number;
    averageConfidence: number;
  };
  // SOL Funding Rate Strategy specific fields
  strategyMetrics?: {
    avgFundingRate: number;
    totalFundingCollected: number;
    positionSwitches: number;
    longShortRatio: number;
  };
  fundingRateData?: { date: string; rate: number; cumulative: number }[];
}

export class StrategyBacktester {
  private priceCache: Map<string, AssetPriceData> = new Map();
  private marketData: Map<string, any> = new Map();
  private aiPredictor: FundingRatePredictor | null = null;
  private useLiveExchangeData: boolean = false;
  private exchangeDataFetcher: ExchangeDataFetcher | null = null;

  /**
   * Configure the backtester to use AI-powered predictions
   */
  public setAIPredictor(predictor: FundingRatePredictor): void {
    this.aiPredictor = predictor;
  }

  /**
   * Configure backtester to use live exchange data instead of mocks
   */
  public setUseLiveData(useLive: boolean, apiKeys?: {
    binance?: { key: string, secret: string },
    ftx?: { key: string, secret: string },
    okx?: { key: string, secret: string },
    bybit?: { key: string, secret: string },
  }): void {
    this.useLiveExchangeData = useLive;
    if (useLive) {
      this.exchangeDataFetcher = new ExchangeDataFetcher(apiKeys);
    }
  }

  // Load historical price data
  async loadHistoricalData(
    assets: string[],
    startTimestamp: number,
    endTimestamp: number
  ): Promise<void> {
    for (const asset of assets) {
      try {
        if (this.useLiveExchangeData && this.exchangeDataFetcher) {
          // Special handling for Solana in funding rate strategy
          if (asset === 'solana') {
            console.log(`Loading specialized Solana data for funding rate strategy`);
            
            // Use our specialized Solana data fetcher
            const data = await this.exchangeDataFetcher.getSolanaFundingData(startTimestamp, endTimestamp);
            
            if (data.length > 0) {
              this.priceCache.set(asset, {
                symbol: asset,
                data: data
              });
              console.log(`Loaded ${data.length} Solana data points with funding rates`);
            } else {
              // Fallback to mock data if real data fetch fails
              console.warn(`No Solana data available, using mock data`);
              this.priceCache.set(asset, {
                symbol: asset,
                data: this.generateMockPriceData(startTimestamp, endTimestamp, asset)
              });
            }
          } else {
            // Use real exchange API for price and funding data
            console.log(`Loading real exchange data for ${asset}`);
            
            // Get comprehensive data including price and funding rates
            const data = await this.exchangeDataFetcher.getComprehensiveData(
              asset, 
              startTimestamp, 
              endTimestamp,
              ['binance', 'okx', 'bybit']
            );
            
            if (data.length > 0) {
              this.priceCache.set(asset, {
                symbol: asset,
                data: data
              });
              console.log(`Loaded ${data.length} real data points for ${asset}`);
            } else {
              // Fallback to mock data if real data fetch fails
              console.warn(`No real data available for ${asset}, using mock data`);
              this.priceCache.set(asset, {
                symbol: asset,
                data: this.generateMockPriceData(startTimestamp, endTimestamp, asset)
              });
            }
          }
        } else {
          // Use CoinGecko or mock data as before
          if (this.useLiveExchangeData) {
            // Use real exchange API for price data
            // For this example, we'll use CoinGecko for historical data
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
          } else {
            // Use mock data
            this.priceCache.set(asset, {
              symbol: asset,
              data: this.generateMockPriceData(startTimestamp, endTimestamp, asset)
            });
            console.log(`Generated mock data for ${asset}`);
          }
        }
      } catch (error) {
        console.error(`Error loading historical data for ${asset}:`, error);
        // Use mock data for testing if API call fails
        this.priceCache.set(asset, {
          symbol: asset,
          data: this.generateMockPriceData(startTimestamp, endTimestamp, asset)
        });
      }
    }
    
    // Load funding rate data if we're not using the comprehensive fetcher
    if (!this.exchangeDataFetcher) {
      await this.loadFundingRateData(assets, startTimestamp, endTimestamp);
    }
  }
  
  // Load funding rate data for perpetual futures
  private async loadFundingRateData(
    assets: string[],
    startTimestamp: number,
    endTimestamp: number
  ): Promise<void> {
    for (const asset of assets) {
      try {
        if (this.useLiveExchangeData) {
          // Here we would call real funding rate API endpoints
          // For example from Binance, FTX, etc.
          // This is just a placeholder for implementation
          console.log(`Would load real funding rate data for ${asset}`);
          
          // For now, we'll still use mock data
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
        } else {
          // Use mock funding rate data
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
    else if (asset === 'solana') basePrice = 60; // Updated realistic SOL price
    else basePrice = 1; // Default for stablecoins, etc.
    
    let currentPrice = basePrice;
    let volatility = asset === 'bitcoin' ? 0.02 : asset === 'ethereum' ? 0.025 : 0.03;
    
    // Solana has higher volatility historically
    if (asset === 'solana') volatility = 0.04;
    
    // Stablecoins have very low volatility
    if (asset === 'usd-coin' || asset === 'tether' || asset === 'dai') {
      volatility = 0.001;
      currentPrice = 1;
    }
    
    // Generate price trend simulation for more realistic looking data
    // Use bull/bear cycles instead of pure random walk
    let trendDirection = Math.random() > 0.5 ? 1 : -1; // Start with random trend
    let trendStrength = Math.random() * 0.6 + 0.4; // 0.4 to 1.0
    let trendDuration = Math.floor(Math.random() * 120) + 48; // 2-7 days (in hours)
    let currentTrendHour = 0;
    
    for (let i = 0; i < hoursInRange; i++) {
      const timestamp = startTimestamp + i * 60 * 60 * 1000;
      
      // Check if we need to change trend
      if (currentTrendHour >= trendDuration) {
        trendDirection *= -1; // Reverse trend
        trendStrength = Math.random() * 0.6 + 0.4;
        trendDuration = Math.floor(Math.random() * 120) + 48;
        currentTrendHour = 0;
      }
      
      // Random walk with drift and trend influence
      const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
      const trendFactor = trendDirection * trendStrength * 0.5; // Trend influence
      const change = (randomFactor + trendFactor) * volatility * currentPrice;
      
      currentPrice = Math.max(0.001, currentPrice + change);
      
      // Add some volume data - higher during trend changes
      const trendChanging = currentTrendHour < 12 || currentTrendHour > trendDuration - 12;
      const volumeFactor = trendChanging ? 1.5 : 1.0;
      const volume = currentPrice * (1000000 + Math.random() * 5000000) * volumeFactor;
      
      // Add mock funding rate data for perpetual futures
      // Funding rates tend to follow price trends
      let fundingRate: number | undefined = undefined;
      if (i % 8 === 0) { // Every 8 hours (typical funding interval)
        // Funding rates tend to be positive in bull trends, negative in bear trends
        // With some noise and inversions
        const baseFundingRate = trendDirection * 0.0004 * trendStrength;
        const fundingNoise = (Math.random() - 0.5) * 0.0008;
        fundingRate = baseFundingRate + fundingNoise;
        
        // Occasionally, funding rates can invert with price action
        if (Math.random() > 0.8) fundingRate *= -0.5;
      }
      
      data.push({
        timestamp,
        price: currentPrice,
        volume,
        fundingRate
      });
      
      currentTrendHour++;
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
    endDate: Date,
    useAIEnhancement: boolean = false
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
    
    // For AI metrics
    let predictionCount = 0;
    let accurateCount = 0;
    let confidenceSum = 0;
    let aiImprovement = 0;
    
    // For SOL funding rate strategy metrics
    let totalFundingCollected = 0;
    let fundingRateSum = 0;
    let fundingRateCount = 0;
    let positionSwitches = 0;
    let longDays = 0;
    let shortDays = 0;
    let lastPosition: 'long' | 'short' | null = null;
    const fundingRateData: { date: string; rate: number; cumulative: number }[] = [];
    let cumulativeFundingRate = 0;
    
    // Process each day in the backtest period
    while (currentTimestamp <= endTimestamp) {
      const currentDate = new Date(currentTimestamp);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // AI enhancement
      if (useAIEnhancement && this.aiPredictor) {
        // Get predictions for the next 24 hours
        const currentSolPoint = this.getNearestPricePoint('solana', currentTimestamp);
        
        if (currentSolPoint) {
          const marketData = [
            { 
              price: currentSolPoint.price, 
              volume: currentSolPoint.volume || 0,
              volatility: this.calculateVolatility(
                this.getHistoricalPrices('solana', currentTimestamp - 7 * 24 * 60 * 60 * 1000, currentTimestamp)
              ),
              asset: 'solana'
            }
          ];
          
          // Prepare funding rate data for predictions
          const fundingRates = requiredAssets.map(asset => {
            const point = this.getNearestPricePoint(asset, currentTimestamp);
            if (!point || point.fundingRate === undefined) return null;
            
            return {
              asset,
              symbol: `${asset.toUpperCase()}-PERP`,
              rate: point.fundingRate,
              annualizedRate: point.fundingRate * 3 * 365, // 3 funding periods per day * 365 days
              nextPaymentTimestamp: this.calculateNextFundingTime(currentTimestamp),
              exchange: 'binance' // Mock exchange
            };
          }).filter(rate => rate !== null);
          
          try {
            // Get AI predictions
            const predictions = await this.aiPredictor.predictFundingRates(
              fundingRates,
              marketData
            );
            
            if (predictions.length > 0) {
              // Use predictions to adjust strategy parameters
              const bestOpportunity = this.findBestOpportunity(predictions);
              if (bestOpportunity) {
                // We'd adjust the strategy based on the prediction
                // For simulation purposes, we'll just calculate potential improvement
                const baselineReturn = previousValue > 0 
                  ? (portfolioValue - previousValue) / previousValue 
                  : 0;
                const improvedReturn = baselineReturn * (1 + (bestOpportunity.predictedRates.confidence || 0.5) * 0.5);
                
                // Track improvement
                aiImprovement += (improvedReturn - baselineReturn) * previousValue;
                
                // Track prediction metrics
                predictionCount++;
                confidenceSum += (bestOpportunity.predictedRates.confidence || 0.5);
                
                // Measure if prediction was accurate
                const nextDayPoint = this.getNearestPricePoint(bestOpportunity.asset, currentTimestamp + 24 * 60 * 60 * 1000);
                if (nextDayPoint && nextDayPoint.fundingRate !== undefined) {
                  const actualDirection = Math.sign(nextDayPoint.fundingRate);
                  const predictedDirection = bestOpportunity.recommendedAction === 'short' ? 1 : 
                                            bestOpportunity.recommendedAction === 'long' ? -1 : 0;
                  
                  if (actualDirection === predictedDirection) {
                    accurateCount++;
                  }
                }
                
                // Apply improvement to portfolio value (simulating better trading decisions)
                portfolioValue = previousValue * (1 + improvedReturn);
              }
            }
          } catch (error) {
            console.error("Error using AI predictions:", error);
          }
        }
      }
      
      // Process strategy-specific logic based on strategy type
      if (strategy.type === 'Basis Trade') {
        portfolioValue = await this.processBasisTradeStrategy(
          strategy,
          currentTimestamp,
          portfolioValue,
          lastRebalance
        );
      } else if (strategy.type === 'Funding Rate') {
        // For SOL funding rate strategy, track funding rates
        const solPoint = this.getNearestPricePoint('solana', currentTimestamp);
        if (solPoint && solPoint.fundingRate !== undefined) {
          fundingRateSum += solPoint.fundingRate;
          fundingRateCount++;
          
          const fundingRate = solPoint.fundingRate;
          cumulativeFundingRate += fundingRate;
          
          // Track funding rate data for visualization
          fundingRateData.push({
            date: dateStr,
            rate: fundingRate,
            cumulative: cumulativeFundingRate
          });
          
          // Determine position
          const currentPosition = fundingRate > 0 ? 'short' : fundingRate < 0 ? 'long' : null;
          
          // Track position switches
          if (lastPosition !== null && currentPosition !== null && currentPosition !== lastPosition) {
            positionSwitches++;
          }
          
          // Update position tracking
          if (currentPosition === 'long') {
            longDays++;
          } else if (currentPosition === 'short') {
            shortDays++;
          }
          
          lastPosition = currentPosition;
          
          // Estimate funding collected (simplified)
          const fundingCollected = Math.abs(fundingRate) * portfolioValue * 3; // 3x leverage
          totalFundingCollected += fundingCollected;
        }
        
        // Process the strategy logic
        portfolioValue = await this.processFundingRateStrategy(
          strategy,
          currentTimestamp,
          portfolioValue,
          lastRebalance
        );
      } else {
        portfolioValue = await this.processGenericStrategy(
          strategy,
          currentTimestamp,
          portfolioValue,
          lastRebalance
        );
      }
      
      // Track maximum portfolio value for drawdown calculation
      maxValue = Math.max(maxValue, portfolioValue);
      
      // Calculate drawdown
      const currentDrawdown = portfolioValue / maxValue;
      minDrawdown = Math.min(minDrawdown, currentDrawdown);
      
      // Calculate daily return
      const dailyReturn = previousValue > 0 ? (portfolioValue - previousValue) / previousValue : 0;
      returns.push(dailyReturn);
      
      // Store daily return
      dailyReturns.push({
        date: dateStr,
        value: portfolioValue,
        return: dailyReturn
      });
      
      // Track monthly returns
      const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
      if (!monthlyReturns.has(monthKey)) {
        monthlyReturns.set(monthKey, 1);
      }
      monthlyReturns.set(monthKey, monthlyReturns.get(monthKey)! * (1 + dailyReturn));
      
      // Update tracking variables
      previousValue = portfolioValue;
      
      // Track exposure
      const currentExposure = 0.5; // Placeholder - would be calculated from strategy positions
      const currentHedgeRatio = 1.0; // Placeholder - would be calculated from strategy positions
      
      netExposureSum += currentExposure;
      hedgeRatioSum += currentHedgeRatio;
      maxNetExposure = Math.max(maxNetExposure, currentExposure);
      dataPoints++;
      
      // Move to next day
      currentTimestamp += 24 * 60 * 60 * 1000;
      lastRebalance = currentTimestamp;
    }
    
    // Calculate metrics
    const totalReturn = (portfolioValue - strategy.usdcAllocated) / strategy.usdcAllocated;
    
    // Calculate annualized return
    const years = (endTimestamp - startTimestamp) / (365 * 24 * 60 * 60 * 1000);
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;
    
    // Calculate volatility (standard deviation of returns)
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    const annualizedVolatility = dailyVolatility * Math.sqrt(365);
    
    // Calculate Sharpe Ratio (assuming risk-free rate of 1.5%)
    const riskFreeRate = 0.015;
    const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedVolatility;
    
    // Calculate Sortino Ratio (downside deviation)
    const negativeReturns = returns.filter(ret => ret < 0);
    const downsideVariance = negativeReturns.length > 0
      ? negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length
      : 0;
    const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(365);
    const sortinoRatio = downsideDeviation === 0
      ? sharpeRatio // If no downside, use Sharpe as default
      : (annualizedReturn - riskFreeRate) / downsideDeviation;
    
    // Calculate Calmar Ratio
    const maxDrawdownPct = 1 - minDrawdown;
    const calmarRatio = maxDrawdownPct === 0
      ? sharpeRatio // If no drawdown, use Sharpe as default
      : annualizedReturn / maxDrawdownPct;
    
    // Calculate win rate
    const winCount = returns.filter(ret => ret > 0).length;
    const winRate = returns.length > 0 ? winCount / returns.length : 0;
    
    // Format monthly returns for output
    const monthlyReturnsArray = Array.from(monthlyReturns.entries()).map(([month, value]) => ({
      month,
      return: value - 1 // Convert from multiplier to return
    }));
    
    // Calculate exposure statistics
    const avgNetExposure = dataPoints > 0 ? netExposureSum / dataPoints : 0;
    const avgHedgeRatio = dataPoints > 0 ? hedgeRatioSum / dataPoints : 1.0;
    
    // Calculate AI metrics
    const aiMetrics = useAIEnhancement && predictionCount > 0 ? {
      accuracyScore: accurateCount / predictionCount,
      profitImprovement: aiImprovement / strategy.usdcAllocated, // As percentage of initial capital
      averageConfidence: confidenceSum / predictionCount
    } : undefined;
    
    // Calculate SOL funding rate strategy metrics
    const avgFundingRate = fundingRateCount > 0 ? fundingRateSum / fundingRateCount : 0;
    const longShortRatio = shortDays > 0 ? longDays / shortDays : longDays > 0 ? Infinity : 1;
    
    const solStrategyMetrics = {
      avgFundingRate, 
      totalFundingCollected,
      positionSwitches,
      longShortRatio
    };
    
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
      volatility: annualizedVolatility,
      maxDrawdown: maxDrawdownPct,
      winRate,
      exposureStats: {
        avgNetExposure,
        maxNetExposure,
        avgHedgeRatio
      },
      dailyReturns,
      monthlyReturns: monthlyReturnsArray,
      riskMetrics: {
        sortinoRatio,
        calmarRatio,
        betaToMarket: 0.5 // Placeholder - would need market benchmark data
      },
      aiEnhanced: useAIEnhancement,
      predictionMetrics: aiMetrics,
      // Add SOL funding rate strategy metrics for the strategy type
      ...(strategy.type === 'Funding Rate' && {
        strategyMetrics: solStrategyMetrics,
        fundingRateData: fundingRateData
      })
    };
  }

  /**
   * Find the best trading opportunity from AI predictions
   */
  private findBestOpportunity(predictions: FundingRatePrediction[]): FundingRatePrediction | null {
    if (predictions.length === 0) return null;
    
    // Sort by expected yield * confidence score
    return predictions.sort((a, b) => {
      const scoreA = a.expectedAnnualizedYield * (a.predictedRates.confidence || 0.5);
      const scoreB = b.expectedAnnualizedYield * (b.predictedRates.confidence || 0.5);
      return scoreB - scoreA; // Descending order
    })[0];
  }

  /**
   * Calculate next funding time (8-hour intervals)
   */
  private calculateNextFundingTime(timestamp: number): number {
    const date = new Date(timestamp);
    const hours = date.getUTCHours();
    const nextFundingHour = hours < 8 ? 8 : hours < 16 ? 16 : 0;
    
    const nextDate = new Date(date);
    nextDate.setUTCHours(nextFundingHour, 0, 0, 0);
    
    // If we're moving to the next day
    if (nextFundingHour === 0) {
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    }
    
    return nextDate.getTime();
  }

  /**
   * Get historical prices for an asset in a given time range
   */
  private getHistoricalPrices(asset: string, startTime: number, endTime: number): number[] {
    const assetData = this.priceCache.get(asset);
    if (!assetData) return [];
    
    return assetData.data
      .filter(point => point.timestamp >= startTime && point.timestamp <= endTime)
      .map(point => point.price);
  }

  /**
   * Calculate volatility from price series
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    // Calculate returns
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    // Calculate standard deviation
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Process basis trade strategy logic
   */
  private async processBasisTradeStrategy(
    strategy: OffChainStrategy,
    currentTimestamp: number,
    portfolioValue: number,
    lastRebalance: number
  ): Promise<number> {
    // Basis trading profit is typically from the convergence of spot and futures prices
    // This would involve much more complex logic in a real implementation
    
    // For demo, we'll simulate a modest consistent return with some volatility
    const dailyReturn = 0.0005 + (Math.random() - 0.4) * 0.001; // ~15% annualized with noise
    return portfolioValue * (1 + dailyReturn);
  }
  
  /**
   * Process funding rate strategy specifically for Solana (SOL)
   * This implements a perpetual funding rate strategy that:
   * 1. Goes short when funding rate is positive (collect funding)
   * 2. Goes long when funding rate is negative (collect funding)
   * 3. Maintains delta neutrality through hedging
   */
  private async processFundingRateStrategy(
    strategy: OffChainStrategy,
    currentTimestamp: number,
    portfolioValue: number,
    lastRebalance: number
  ): Promise<number> {
    // Get current SOL data point with funding rate
    const solPoint = this.getNearestPricePoint('solana', currentTimestamp);
    
    if (!solPoint || solPoint.fundingRate === undefined) {
      return portfolioValue; // No change if we can't get funding rates
    }
    
    // Strategy parameters
    const hoursSinceLastRebalance = (currentTimestamp - lastRebalance) / (60 * 60 * 1000);
    const rebalancePeriod = 8; // Rebalance every 8 hours (typical funding interval)
    const tradingFeeRate = 0.0005; // 0.05% per trade
    const slippageRate = 0.001; // 0.1% slippage estimate
    const leverageMultiple = 3; // 3x leverage
    const hedgeRatio = 1.0; // Perfect hedge for delta neutrality
    
    // Execute strategy logic
    let dailyReturn = 0;
    
    // For Solana-specific perpetual funding rate strategy:
    const fundingRate = solPoint.fundingRate;
    const annualizedFundingRate = fundingRate * 3 * 365; // 3 funding periods per day * 365 days
    
    // Determine position direction based on funding rate
    const shouldBeShort = fundingRate > 0;
    const shouldBeLong = fundingRate < 0;
    
    // Only rebalance at funding intervals or significant funding rate changes
    if (hoursSinceLastRebalance >= rebalancePeriod || Math.abs(fundingRate) > 0.001) {
      // Calculate trading costs for rebalancing
      const tradingCost = portfolioValue * tradingFeeRate * 2; // Enter and exit positions
      const slippageCost = portfolioValue * slippageRate * 2; // Enter and exit positions
      const totalTradingCost = tradingCost + slippageCost;
      
      // Position management logic
      if (shouldBeShort) {
        // Funding is positive, go short and collect funding
        const expectedFundingProfit = Math.abs(fundingRate) * leverageMultiple;
        
        // Simulate short position profit/loss
        // Price movement impact (negative if price rises)
        const priceImpact = -0.5 * (Math.random() - 0.4) * 0.01 * leverageMultiple; // Slight negative bias
        
        // Delta hedging impact (positive if price rises)
        const hedgeImpact = 0.5 * (Math.random() - 0.4) * 0.01 * hedgeRatio * leverageMultiple;
        
        // Net return = funding profit + price impact + hedge impact - costs
        dailyReturn = expectedFundingProfit + priceImpact + hedgeImpact - (totalTradingCost / portfolioValue);
      } else if (shouldBeLong) {
        // Funding is negative, go long and collect funding
        const expectedFundingProfit = Math.abs(fundingRate) * leverageMultiple;
        
        // Simulate long position profit/loss
        // Price movement impact (positive if price rises)
        const priceImpact = 0.5 * (Math.random() - 0.6) * 0.01 * leverageMultiple; // Slight positive bias
        
        // Delta hedging impact (negative if price rises)
        const hedgeImpact = -0.5 * (Math.random() - 0.6) * 0.01 * hedgeRatio * leverageMultiple;
        
        // Net return = funding profit + price impact + hedge impact - costs
        dailyReturn = expectedFundingProfit + priceImpact + hedgeImpact - (totalTradingCost / portfolioValue);
      } else {
        // Near-zero funding rate, stay neutral with minimal exposure
        dailyReturn = -0.0001; // Small cost for maintaining positions
      }
    } else {
      // Between rebalances, we still earn/pay funding but don't incur trading costs
      if (shouldBeShort || shouldBeLong) {
        dailyReturn = Math.abs(fundingRate) * leverageMultiple * 0.9; // 90% efficiency between rebalances
      }
    }
    
    // Add market noise (some randomness to returns)
    const marketNoise = (Math.random() - 0.5) * 0.002; // ±0.1% daily noise
    
    // Apply daily return to portfolio value
    return portfolioValue * (1 + dailyReturn + marketNoise);
  }
  
  /**
   * Process generic strategy logic
   */
  private async processGenericStrategy(
    strategy: OffChainStrategy,
    currentTimestamp: number,
    portfolioValue: number,
    lastRebalance: number
  ): Promise<number> {
    // Simple model for generic strategy
    const dailyReturn = 0.0004 + (Math.random() - 0.5) * 0.002; // ~12% annualized with noise
    return portfolioValue * (1 + dailyReturn);
  }
  
  /**
   * Get price/funding data nearest to the specified timestamp
   */
  private getNearestPricePoint(
    asset: string,
    timestamp: number
  ): HistoricalDataPoint | null {
    const assetData = this.priceCache.get(asset);
    if (!assetData) return null;
    
    let closestPoint = null;
    let minTimeDiff = Infinity;
    
    for (const point of assetData.data) {
      const timeDiff = Math.abs(point.timestamp - timestamp);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestPoint = point;
      }
    }
    
    return closestPoint;
  }
  
  /**
   * Get the list of assets required for a strategy
   */
  private getStrategyAssets(strategy: OffChainStrategy): string[] {
    // This is simplified - a real implementation would look at strategy parameters
    if (strategy.type === 'Funding Rate') {
      return ['solana']; // Focus on Solana only
    } else if (strategy.type === 'Basis Trade') {
      return ['bitcoin', 'ethereum'];
    } else {
      return ['bitcoin']; // Default
    }
  }
} 