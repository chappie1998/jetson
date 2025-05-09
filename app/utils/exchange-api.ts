import axios from 'axios';

/**
 * API service for fetching exchange data (prices, funding rates, etc.)
 */
export class ExchangeDataFetcher {
  private apiKey?: string;
  private apiKeys?: {
    binance?: { key: string, secret: string },
    ftx?: { key: string, secret: string },
    okx?: { key: string, secret: string },
    bybit?: { key: string, secret: string },
  };
  
  constructor(apiKeyOrKeys?: string | {
    binance?: { key: string, secret: string },
    ftx?: { key: string, secret: string },
    okx?: { key: string, secret: string },
    bybit?: { key: string, secret: string },
  }) {
    if (typeof apiKeyOrKeys === 'string') {
      this.apiKey = apiKeyOrKeys;
    } else {
      this.apiKeys = apiKeyOrKeys;
    }
  }
  
  /**
   * Fetch historical funding rates for an asset on a specific exchange
   */
  async getFundingRateHistory(
    asset: string, 
    exchange: string, 
    fromTimestamp: number, 
    toTimestamp: number
  ): Promise<any[]> {
    // In a real implementation, this would call exchange APIs
    // For now, return mock data for demonstration
    
    const mockData: Array<{
      timestamp: number;
      asset: string;
      exchange: string;
      fundingRate: number;
      price: number;
      volume: number;
    }> = [];
    const hourMs = 60 * 60 * 1000;
    const day = 24 * hourMs;
    
    // Generate mock funding rate data with realistic patterns
    let currentRate = this.getInitialRate(asset, exchange);
    let currentTimestamp = fromTimestamp;
    let trendDirection = Math.random() > 0.5 ? 1 : -1;
    let trendDuration = Math.floor(Math.random() * 48) + 24; // 1-3 days trend
    let trendCounter = 0;
    
    while (currentTimestamp <= toTimestamp) {
      // Add some randomness to the rate
      currentRate += (Math.random() * 0.0002 - 0.0001) * trendDirection;
      
      // Ensure rates stay within realistic bounds
      currentRate = Math.max(-0.002, Math.min(0.002, currentRate));
      
      mockData.push({
        timestamp: currentTimestamp,
        asset,
        exchange,
        fundingRate: currentRate,
        price: this.getMockPrice(asset, currentTimestamp),
        volume: this.getMockVolume(asset, currentTimestamp)
      });
      
      // Advance timestamp by 8 hours (typical funding interval)
      currentTimestamp += 8 * hourMs;
      
      // Possibly change trend direction
      trendCounter++;
      if (trendCounter >= trendDuration) {
        trendDirection *= -1;
        trendDuration = Math.floor(Math.random() * 48) + 24;
        trendCounter = 0;
      }
    }
    
    return mockData;
  }
  
  /**
   * Fetch historical price data for an asset
   */
  async getPriceHistory(
    asset: string, 
    fromTimestamp: number, 
    toTimestamp: number,
    interval: string = '1d'
  ): Promise<any[]> {
    // In a real implementation, this would call exchange APIs
    // For now, return mock data for demonstration
    
    const mockData: Array<{
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> = [];
    let intervalMs;
    
    switch (interval) {
      case '1h':
        intervalMs = 60 * 60 * 1000;
        break;
      case '4h':
        intervalMs = 4 * 60 * 60 * 1000;
        break;
      case '1d':
      default:
        intervalMs = 24 * 60 * 60 * 1000;
        break;
    }
    
    let currentTimestamp = fromTimestamp;
    
    while (currentTimestamp <= toTimestamp) {
      mockData.push({
        timestamp: currentTimestamp,
        open: this.getMockPrice(asset, currentTimestamp),
        high: this.getMockPrice(asset, currentTimestamp) * (1 + Math.random() * 0.02),
        low: this.getMockPrice(asset, currentTimestamp) * (1 - Math.random() * 0.02),
        close: this.getMockPrice(asset, currentTimestamp + intervalMs),
        volume: this.getMockVolume(asset, currentTimestamp)
      });
      
      currentTimestamp += intervalMs;
    }
    
    return mockData;
  }
  
  /**
   * Fetch data specifically for Solana
   */
  async getSolanaFundingRates(
    fromTimestamp: number, 
    toTimestamp: number
  ): Promise<any[]> {
    return this.getFundingRateHistory('SOL', 'Binance', fromTimestamp, toTimestamp);
  }
  
  /**
   * Get initial funding rate value based on asset and exchange
   */
  private getInitialRate(asset: string, exchange: string): number {
    // Different assets have different typical funding rate ranges
    switch (asset) {
      case 'BTC':
        return 0.0001; // Lower volatility, more stable funding
      case 'ETH':
        return 0.00015;
      case 'SOL':
        return 0.0004; // Higher volatility, higher funding
      default:
        return 0.0002;
    }
  }
  
  /**
   * Generate mock price based on asset and timestamp
   */
  private getMockPrice(asset: string, timestamp: number): number {
    // Use timestamp to generate somewhat realistic price movements
    const daysSinceEpoch = timestamp / (24 * 60 * 60 * 1000);
    const basePrice = this.getBasePrice(asset);
    
    // Create some sine wave patterns with different frequencies
    const wave1 = Math.sin(daysSinceEpoch / 30) * 0.2; // ~Monthly cycle
    const wave2 = Math.sin(daysSinceEpoch / 7) * 0.1;  // ~Weekly cycle
    const wave3 = Math.sin(daysSinceEpoch) * 0.05;     // ~Daily noise
    
    return basePrice * (1 + wave1 + wave2 + wave3);
  }
  
  /**
   * Get base price for asset
   */
  private getBasePrice(asset: string): number {
    switch (asset) {
      case 'BTC':
        return 40000;
      case 'ETH':
        return 2500;
      case 'SOL':
        return 60;
      default:
        return 100;
    }
  }
  
  /**
   * Generate mock volume based on asset and timestamp
   */
  private getMockVolume(asset: string, timestamp: number): number {
    const daysSinceEpoch = timestamp / (24 * 60 * 60 * 1000);
    const baseVolume = this.getBaseVolume(asset);
    
    // Volume tends to spike with volatility
    const dailyCycle = Math.sin(daysSinceEpoch * Math.PI) * 0.2 + 1;
    // Weekend effect (lower volume)
    const weekendEffect = Math.sin(daysSinceEpoch / 7 * Math.PI * 2) > 0.5 ? 0.8 : 1;
    
    return baseVolume * dailyCycle * weekendEffect * (0.9 + Math.random() * 0.2);
  }
  
  /**
   * Get base volume for asset
   */
  private getBaseVolume(asset: string): number {
    switch (asset) {
      case 'BTC':
        return 20000000000;
      case 'ETH':
        return 8000000000;
      case 'SOL':
        return 1500000000;
      default:
        return 500000000;
    }
  }
  
  /**
   * Get Solana funding data (specialized method for SOL funding strategy)
   */
  async getSolanaFundingData(
    fromTimestamp: number, 
    toTimestamp: number
  ): Promise<any[]> {
    // Add funding data for Solana on different exchanges
    const data: Array<{
      timestamp: number;
      price: number;
      volume: number;
      fundingRate: number;
      exchange: string;
    }> = [];
    
    // Get funding rates from getSolanaFundingRates
    const fundingRates = await this.getSolanaFundingRates(fromTimestamp, toTimestamp);
    
    // Get price history
    const priceHistory = await this.getPriceHistory('SOL', fromTimestamp, toTimestamp, '4h');
    
    // Merge the data
    for (const price of priceHistory) {
      // Find closest funding rate entry
      const closestFunding = fundingRates.find(fr => 
        Math.abs(fr.timestamp - price.timestamp) < 4 * 60 * 60 * 1000 // Within 4 hours
      );
      
      if (closestFunding) {
        data.push({
          timestamp: price.timestamp,
          price: price.close,
          volume: price.volume,
          fundingRate: closestFunding.fundingRate,
          exchange: closestFunding.exchange
        });
      }
    }
    
    return data;
  }
  
  /**
   * Get comprehensive data including price and funding rates for multiple exchanges
   */
  async getComprehensiveData(
    asset: string,
    fromTimestamp: number,
    toTimestamp: number,
    exchanges: string[] = ['binance']
  ): Promise<any[]> {
    const data: Array<{
      timestamp: number;
      price: number;
      volume: number;
      fundingRate?: number;
      exchange?: string;
    }> = [];
    
    // Get price history
    const priceHistory = await this.getPriceHistory(asset, fromTimestamp, toTimestamp, '4h');
    
    // For each exchange, get funding rates
    for (const exchange of exchanges) {
      try {
        const fundingRates = await this.getFundingRateHistory(
          asset, 
          exchange, 
          fromTimestamp, 
          toTimestamp
        );
        
        // Merge data for this exchange
        for (const price of priceHistory) {
          // Find closest funding rate entry
          const closestFunding = fundingRates.find(fr => 
            Math.abs(fr.timestamp - price.timestamp) < 4 * 60 * 60 * 1000 // Within 4 hours
          );
          
          if (closestFunding) {
            data.push({
              timestamp: price.timestamp,
              price: price.close,
              volume: price.volume,
              fundingRate: closestFunding.fundingRate,
              exchange
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching data for ${asset} on ${exchange}:`, error);
      }
    }
    
    return data;
  }
} 