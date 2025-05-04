import axios from 'axios';
import { FundingRateData, HistoricalDataPoint } from './types';

/**
 * Utility for fetching historical funding rate data from exchanges
 */
export class ExchangeDataFetcher {
  private apiKeys: {
    binance?: { key: string, secret: string },
    ftx?: { key: string, secret: string },
    okx?: { key: string, secret: string },
    bybit?: { key: string, secret: string },
  };

  constructor(apiKeys?: {
    binance?: { key: string, secret: string },
    ftx?: { key: string, secret: string },
    okx?: { key: string, secret: string },
    bybit?: { key: string, secret: string },
  }) {
    this.apiKeys = apiKeys || {};
  }

  /**
   * Get historical funding rates for a specific asset
   * @param asset Asset symbol (e.g., 'BTC')
   * @param exchange Exchange name
   * @param startTime Start timestamp
   * @param endTime End timestamp
   * @returns Array of historical funding rates
   */
  public async getHistoricalFundingRates(
    asset: string,
    exchange: 'binance' | 'okx' | 'bybit',
    startTime: number,
    endTime: number
  ): Promise<HistoricalDataPoint[]> {
    try {
      switch (exchange) {
        case 'binance':
          return await this.getBinanceFundingRates(asset, startTime, endTime);
        case 'okx':
          return await this.getOkxFundingRates(asset, startTime, endTime);
        case 'bybit':
          return await this.getBybitFundingRates(asset, startTime, endTime);
        default:
          throw new Error(`Exchange ${exchange} not supported`);
      }
    } catch (error) {
      console.error(`Error fetching funding rates for ${asset} from ${exchange}:`, error);
      return [];
    }
  }

  /**
   * Get historical price data for a specific asset
   * @param asset Asset symbol (e.g., 'BTC')
   * @param startTime Start timestamp
   * @param endTime End timestamp
   * @returns Array of historical price data
   */
  public async getHistoricalPriceData(
    asset: string,
    startTime: number,
    endTime: number
  ): Promise<HistoricalDataPoint[]> {
    try {
      // Use CoinGecko API for historical price data
      const assetId = this.getCoinGeckoId(asset);
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${assetId}/market_chart/range`,
        {
          params: {
            vs_currency: 'usd',
            from: Math.floor(startTime / 1000),
            to: Math.floor(endTime / 1000)
          }
        }
      );

      // Transform the data into our format
      const priceData: HistoricalDataPoint[] = response.data.prices.map(
        (item: [number, number]) => ({
          timestamp: item[0],
          price: item[1],
          asset
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

      return priceData;
    } catch (error) {
      console.error(`Error fetching historical price data for ${asset}:`, error);
      return [];
    }
  }

  /**
   * Map short asset name to CoinGecko ID
   */
  private getCoinGeckoId(asset: string): string {
    // CoinGecko IDs differ from short names
    const mapping: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
      'AVAX': 'avalanche-2',
      'BNB': 'binancecoin',
      'MATIC': 'matic-network',
      'DOT': 'polkadot',
      'LINK': 'chainlink',
      'ADA': 'cardano',
      'NEAR': 'near',
      'ARB': 'arbitrum',
      'DOGE': 'dogecoin',
      'XRP': 'ripple',
      'USDT': 'tether',
      'USDC': 'usd-coin',
    };

    const upperAsset = asset.toUpperCase();
    return mapping[upperAsset] || asset.toLowerCase();
  }

  /**
   * Fetch historical funding rates from Binance
   */
  private async getBinanceFundingRates(asset: string, startTime: number, endTime: number): Promise<HistoricalDataPoint[]> {
    try {
      const symbol = `${asset.toUpperCase()}USDT`;
      const response = await axios.get('https://fapi.binance.com/fapi/v1/fundingRate', {
        params: {
          symbol,
          startTime,
          endTime,
          limit: 1000
        }
      });

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from Binance API');
      }

      return response.data.map((item: any) => ({
        timestamp: item.fundingTime,
        price: 0, // Not used for funding rates
        fundingRate: parseFloat(item.fundingRate),
        asset: asset.toLowerCase(),
        exchange: 'binance'
      }));
    } catch (error) {
      console.error(`Error fetching Binance funding rates for ${asset}:`, error);
      return [];
    }
  }

  /**
   * Fetch historical funding rates from OKX
   */
  private async getOkxFundingRates(asset: string, startTime: number, endTime: number): Promise<HistoricalDataPoint[]> {
    try {
      const instId = `${asset.toUpperCase()}-USDT-SWAP`;
      // OKX only supports fetching the most recent funding rate
      // For historical data, you'd need to make multiple requests or use their data service
      // This is a simplified example
      const response = await axios.get('https://www.okx.com/api/v5/public/funding-rate-history', {
        params: {
          instId,
          before: new Date(startTime).toISOString(),
          after: new Date(endTime).toISOString(),
          limit: 100
        }
      });

      if (!response.data?.data) {
        throw new Error('Invalid response from OKX API');
      }

      return response.data.data.map((item: any) => ({
        timestamp: new Date(item.fundingTime).getTime(),
        price: 0,
        fundingRate: parseFloat(item.fundingRate),
        asset: asset.toLowerCase(),
        exchange: 'okx'
      }));
    } catch (error) {
      console.error(`Error fetching OKX funding rates for ${asset}:`, error);
      return [];
    }
  }

  /**
   * Fetch historical funding rates from Bybit
   */
  private async getBybitFundingRates(asset: string, startTime: number, endTime: number): Promise<HistoricalDataPoint[]> {
    try {
      const symbol = `${asset.toUpperCase()}USDT`;
      const response = await axios.get('https://api.bybit.com/v5/market/funding/history', {
        params: {
          category: 'linear',
          symbol,
          limit: 200
        }
      });

      if (!response.data?.result?.list) {
        throw new Error('Invalid response from Bybit API');
      }

      return response.data.result.list.map((item: any) => ({
        timestamp: new Date(item.fundingRateTimestamp).getTime(),
        price: 0,
        fundingRate: parseFloat(item.fundingRate),
        asset: asset.toLowerCase(),
        exchange: 'bybit'
      })).filter((item: HistoricalDataPoint) => 
        item.timestamp >= startTime && item.timestamp <= endTime
      );
    } catch (error) {
      console.error(`Error fetching Bybit funding rates for ${asset}:`, error);
      return [];
    }
  }

  /**
   * Merge price and funding rate data for a comprehensive dataset
   */
  public async getComprehensiveData(
    asset: string,
    startTime: number,
    endTime: number,
    exchanges: ('binance' | 'okx' | 'bybit')[] = ['binance']
  ): Promise<HistoricalDataPoint[]> {
    // Get price data
    const priceData = await this.getHistoricalPriceData(asset, startTime, endTime);
    
    // Get funding rates from all specified exchanges
    const fundingPromises = exchanges.map(exchange => 
      this.getHistoricalFundingRates(asset, exchange, startTime, endTime)
    );
    
    const fundingResults = await Promise.all(fundingPromises);
    const allFundingData = fundingResults.flat();
    
    // Merge funding data into price data
    for (const pricePoint of priceData) {
      // Find closest funding rate datapoint
      const closestFunding = allFundingData
        .filter(f => Math.abs(f.timestamp - pricePoint.timestamp) < 4 * 60 * 60 * 1000) // Within 4 hours
        .sort((a, b) => Math.abs(a.timestamp - pricePoint.timestamp) - Math.abs(b.timestamp - pricePoint.timestamp))[0];
      
      if (closestFunding) {
        pricePoint.fundingRate = closestFunding.fundingRate;
        pricePoint.exchange = closestFunding.exchange;
      }
    }
    
    return priceData;
  }

  /**
   * Specialized method for getting comprehensive Solana data
   * For the Perpetual Funding Rate Strategy backtesting
   */
  public async getSolanaFundingData(
    startTime: number,
    endTime: number
  ): Promise<HistoricalDataPoint[]> {
    console.log('Fetching specialized Solana funding data for backtesting');
    
    try {
      // Get SOL price data first
      const priceData = await this.getHistoricalPriceData('SOL', startTime, endTime);
      
      // Get specialized Solana funding rates
      const fundingRates = await this.getSolanaFundingRates(startTime, endTime);
      
      // Map funding rates to timestamps for easier lookup
      const fundingRateMap = new Map<number, {rate: number, exchange: string}>();
      
      for (const rate of fundingRates) {
        // Get the timestamp from next payment by going back ~8 hours
        const timestamp = rate.nextPaymentTimestamp - 8 * 60 * 60 * 1000;
        
        // Only keep one rate per timestamp (preferring Binance if available)
        if (!fundingRateMap.has(timestamp) || 
            (rate.exchange === 'binance' && fundingRateMap.get(timestamp)?.exchange !== 'binance')) {
          fundingRateMap.set(timestamp, {
            rate: rate.rate,
            exchange: rate.exchange as string
          });
        }
      }
      
      // Merge funding rate data with price data
      for (const pricePoint of priceData) {
        // Find closest funding rate timestamp
        let closestTimestamp = 0;
        let minTimeDiff = Infinity;
        
        for (const timestamp of fundingRateMap.keys()) {
          const timeDiff = Math.abs(timestamp - pricePoint.timestamp);
          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestTimestamp = timestamp;
          }
        }
        
        // Add funding rate if we found a close enough match (within 12 hours)
        if (minTimeDiff < 12 * 60 * 60 * 1000 && fundingRateMap.has(closestTimestamp)) {
          const fundingInfo = fundingRateMap.get(closestTimestamp)!;
          pricePoint.fundingRate = fundingInfo.rate;
          pricePoint.exchange = fundingInfo.exchange;
        }
      }
      
      console.log(`Successfully merged ${priceData.length} price points with funding rates for SOL`);
      return priceData;
    } catch (error) {
      console.error('Error fetching specialized Solana data:', error);
      // Fall back to mock data
      return this.generateRealisticSolanaFundingData(startTime, endTime);
    }
  }
  
  /**
   * Generate realistic mock Solana funding rate data based on historical patterns
   * For the Perpetual Funding Rate Strategy backtesting
   */
  private generateRealisticSolanaFundingData(startTime: number, endTime: number): HistoricalDataPoint[] {
    const data: HistoricalDataPoint[] = [];
    // Solana has had periods of high positive and negative funding rates
    
    // Define time periods for the simulation
    const periodDurationMs = 8 * 60 * 60 * 1000; // 8 hours - standard funding period
    const periodsCount = Math.ceil((endTime - startTime) / periodDurationMs);
    
    // Realistic SOL price range (can be adjusted)
    let currentPrice = 50 + Math.random() * 30; // Start somewhere between $50-80
    const baseVolume = 500000000; // Base daily trading volume
    
    // Funding rate simulation parameters
    let currentTrend = Math.random() > 0.5 ? 'bullish' : 'bearish';
    let trendStrength = Math.random() * 0.7 + 0.3; // 0.3 to 1.0
    let trendDuration = Math.floor(Math.random() * 7) + 3; // 3-10 days
    let currentTrendDay = 0;
    
    for (let i = 0; i < periodsCount; i++) {
      const timestamp = startTime + i * periodDurationMs;
      const currentDate = new Date(timestamp);
      
      // Update trend if needed
      if (currentTrendDay >= trendDuration) {
        currentTrend = currentTrend === 'bullish' ? 'bearish' : 'bullish';
        trendStrength = Math.random() * 0.7 + 0.3;
        trendDuration = Math.floor(Math.random() * 7) + 3;
        currentTrendDay = 0;
      }
      
      // Generate realistic price movement
      const priceVolatility = 0.02 + (Math.random() * 0.03); // 2-5% volatility
      const trendBias = currentTrend === 'bullish' ? 0.6 : 0.4; // Slightly biased direction
      const priceChange = ((Math.random() > trendBias ? 1 : -1) * priceVolatility * currentPrice) * trendStrength;
      currentPrice = Math.max(5, currentPrice + priceChange); // Floor of $5
      
      // Generate funding rate based on trend
      // Typical SOL funding rates have ranged from -0.1% to +0.1% per 8h
      const baseFundingRate = currentTrend === 'bullish' ? 0.0005 : -0.0005; // Base direction
      const fundingNoise = (Math.random() - 0.5) * 0.001; // Add some randomness
      const fundingRate = baseFundingRate + fundingNoise;
      
      // Daily cycle adds realism - funding rates often follow daily patterns
      const hourOfDay = currentDate.getUTCHours();
      let timeOfDayFactor = 1.0;
      if (hourOfDay >= 12 && hourOfDay <= 20) {
        timeOfDayFactor = 1.2; // Higher volatility during active trading hours
      } else if (hourOfDay >= 0 && hourOfDay <= 6) {
        timeOfDayFactor = 0.8; // Lower volatility during low activity hours
      }
      
      // Volume also follows patterns
      const dayOfWeek = currentDate.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const volumeFactor = isWeekend ? 0.7 : 1.0 + (Math.random() * 0.5);
      const volume = baseVolume * volumeFactor * timeOfDayFactor;
      
      data.push({
        timestamp,
        price: currentPrice,
        volume,
        fundingRate: fundingRate * timeOfDayFactor,
        asset: 'solana',
        exchange: Math.random() > 0.6 ? 'binance' : Math.random() > 0.5 ? 'okx' : 'bybit'
      });
      
      // Move trend forward
      if (i % 3 === 0) { // Every 24 hours (3 funding periods)
        currentTrendDay++;
      }
    }
    
    return data;
  }

  /**
   * Get historical Solana funding rates from all supported exchanges
   * Specialized for the Solana Perpetual Funding Rate Strategy 
   */
  public async getSolanaFundingRates(
    startTime: number,
    endTime: number
  ): Promise<FundingRateData[]> {
    console.log(`Fetching Solana funding rates from multiple exchanges`);
    
    // Combine funding rates from multiple exchanges
    const exchanges: ('binance' | 'okx' | 'bybit')[] = ['binance', 'okx', 'bybit'];
    const results: FundingRateData[] = [];
    
    try {
      // Fetch funding rates from all supported exchanges
      const promises = exchanges.map(async (exchange) => {
        try {
          const rates = await this.getHistoricalFundingRates('SOL', exchange, startTime, endTime);
          return rates.map(rate => ({
            asset: 'solana',
            symbol: 'SOL-USDT',
            rate: rate.fundingRate || 0,
            annualizedRate: (rate.fundingRate || 0) * 3 * 365, // 3 funding periods per day
            nextPaymentTimestamp: this.calculateNextFundingTime(rate.timestamp),
            exchange
          } as FundingRateData));
        } catch (error) {
          console.error(`Error fetching ${exchange} SOL funding rates:`, error);
          return [];
        }
      });
      
      const exchangeResults = await Promise.all(promises);
      
      // Merge all results
      for (const rateList of exchangeResults) {
        results.push(...rateList);
      }
      
      // If we didn't get enough real data, supplement with realistic mock data
      if (results.length < 10) {
        console.log('Insufficient SOL funding rate data, generating realistic mock data');
        const mockRates = this.generateSolanaFundingRateData(startTime, endTime);
        results.push(...mockRates);
      }
      
      // Sort by time
      results.sort((a, b) => a.nextPaymentTimestamp - b.nextPaymentTimestamp);
      
      return results;
    } catch (error) {
      console.error('Error fetching Solana funding rates:', error);
      return this.generateSolanaFundingRateData(startTime, endTime);
    }
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
   * Generate realistic Solana funding rate data based on typical patterns
   */
  private generateSolanaFundingRateData(
    startTime: number,
    endTime: number
  ): FundingRateData[] {
    const results: FundingRateData[] = [];
    const exchanges = ['binance', 'okx', 'bybit'];
    
    // Funding rates occur every 8 hours typically
    const interval = 8 * 60 * 60 * 1000;
    const periods = Math.ceil((endTime - startTime) / interval);
    
    // Create realistic funding rate patterns based on market conditions
    // Solana tends to have more volatile funding rates than BTC or ETH
    
    // Create market regimes
    const regimes = [
      { name: 'bull', baseFunding: 0.0006, volatility: 0.0004, duration: 5 }, // Strong positive funding
      { name: 'bear', baseFunding: -0.0008, volatility: 0.0005, duration: 4 }, // Strong negative funding
      { name: 'neutral', baseFunding: 0.0001, volatility: 0.0002, duration: 3 }, // Low funding
      { name: 'volatile', baseFunding: 0, volatility: 0.001, duration: 2 }, // Highly variable funding
    ];
    
    let currentRegime = regimes[Math.floor(Math.random() * regimes.length)];
    let regimeDaysLeft = currentRegime.duration;
    let trendMagnitude = Math.random() * 0.8 + 0.2; // 0.2 to 1.0
    
    // Generate data for each funding period
    for (let i = 0; i < periods; i++) {
      const currentTime = startTime + i * interval;
      const date = new Date(currentTime);
      
      // Check if we need to change market regime
      if (regimeDaysLeft <= 0 || (Math.random() < 0.1 && regimeDaysLeft < currentRegime.duration)) {
        // 10% chance of early regime change if not at start of regime
        currentRegime = regimes[Math.floor(Math.random() * regimes.length)];
        regimeDaysLeft = currentRegime.duration;
        trendMagnitude = Math.random() * 0.8 + 0.2;
      }
      
      // Base funding rate for this regime
      const baseFunding = currentRegime.baseFunding * trendMagnitude;
      
      // Add some randomness to funding rate
      const noise = (Math.random() * 2 - 1) * currentRegime.volatility;
      let fundingRate = baseFunding + noise;
      
      // Occasionally flip direction for volatile regimes
      if (currentRegime.name === 'volatile' && Math.random() < 0.3) {
        fundingRate *= -1;
      }
      
      // Create slight variations for different exchanges
      for (const exchange of exchanges) {
        // Each exchange has slightly different rates
        const exchangeVariation = (Math.random() * 0.4 - 0.2) * 0.0001;
        const finalRate = Math.max(-0.01, Math.min(0.01, fundingRate + exchangeVariation));
        
        // Calculate next funding time
        const nextPaymentTime = this.calculateNextFundingTime(currentTime);
        
        results.push({
          asset: 'solana',
          symbol: 'SOL-USDT',
          rate: finalRate,
          annualizedRate: finalRate * 3 * 365, // 3 funding periods per day
          nextPaymentTimestamp: nextPaymentTime,
          exchange: exchange as any
        });
      }
      
      // Decrease days left in current regime (3 funding periods per day)
      if (i % 3 === 0) {
        regimeDaysLeft -= 1;
      }
    }
    
    return results;
  }
} 