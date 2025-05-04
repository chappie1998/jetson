import axios from 'axios';
import { FundingRateData, MarketData } from './types';

// Supported exchange types
export type ExchangeId = 'binance' | 'okx' | 'bybit' | 'deribit' | 'bitget' | 'ftx' | 'kraken' | 'huobi' | 'coinbase';

// Exchange configuration
export interface ExchangeConfig {
  id: ExchangeId;
  name: string;
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
  weight: number; // Reliability weight (0-1)
  supportedAssets: string[];
  rateLimit: number; // Requests per minute
  enabled: boolean;
}

// Comprehensive asset market data
export interface AssetMarketData {
  asset: string;
  timestamp: number;
  priceData: {
    price: number;
    bid: number;
    ask: number;
    source: ExchangeId;
    weight: number;
  }[];
  fundingData: {
    rate: number;
    nextPaymentTimestamp: number;
    exchange: ExchangeId;
    weight: number;
  }[];
  aggregated: {
    price: number;
    volume24h: number;
    volatility: number;
    openInterest: number;
    fundingRate: number;
    nextFundingTime: number;
    currentBasisPoints: number;
    basisVolatility: number;
  };
  // For strategy decision making
  strategyMetrics: {
    expectedHourlyYield: number;
    liquidityScore: number;
    executionRisk: number;
    volatilityRisk: number;
    counterpartyRisk: number;
    overallRiskScore: number;
  };
}

// Market update subscription
interface MarketUpdateSubscription {
  assets: string[];
  callback: (data: AssetMarketData[]) => void;
  interval: number; // milliseconds
  lastUpdate: number;
  timerId?: NodeJS.Timeout;
}

/**
 * Multi-Exchange Market Data Service
 * Fetches, aggregates, and analyzes market data from multiple exchanges
 */
export class MultiExchangeDataService {
  private exchanges: Map<ExchangeId, ExchangeConfig> = new Map();
  private cachedData: Map<string, AssetMarketData> = new Map();
  private subscriptions: MarketUpdateSubscription[] = [];
  private rateTimers: Map<ExchangeId, { lastCall: number, queue: number }> = new Map();
  private isInitialized = false;
  private historyDb: Map<string, {
    price: { timestamp: number, value: number }[],
    funding: { timestamp: number, value: number }[],
    volume: { timestamp: number, value: number }[]
  }> = new Map();
  
  // Default supported assets
  private defaultAssets = ['BTC', 'ETH', 'SOL', 'AVAX', 'NEAR', 'ARB', 'MATIC', 'LINK', 'DOT', 'ADA'];

  constructor() {
    // Initialize default exchange configurations
    this.initializeExchanges();
  }

  /**
   * Initialize exchange configurations
   */
  private initializeExchanges(): void {
    // Binance
    this.exchanges.set('binance', {
      id: 'binance',
      name: 'Binance',
      baseUrl: 'https://fapi.binance.com',
      weight: 1.0,
      supportedAssets: this.defaultAssets,
      rateLimit: 1200, // 1200 requests per minute
      enabled: true
    });

    // OKX
    this.exchanges.set('okx', {
      id: 'okx',
      name: 'OKX',
      baseUrl: 'https://www.okx.com',
      weight: 0.9,
      supportedAssets: this.defaultAssets,
      rateLimit: 600, // 600 requests per minute
      enabled: true
    });

    // Bybit
    this.exchanges.set('bybit', {
      id: 'bybit',
      name: 'Bybit',
      baseUrl: 'https://api.bybit.com',
      weight: 0.85,
      supportedAssets: this.defaultAssets,
      rateLimit: 300, // 300 requests per minute
      enabled: true
    });

    // Deribit
    this.exchanges.set('deribit', {
      id: 'deribit',
      name: 'Deribit',
      baseUrl: 'https://www.deribit.com/api/v2',
      weight: 0.8,
      supportedAssets: ['BTC', 'ETH', 'SOL'],
      rateLimit: 300,
      enabled: true
    });

    // Bitget
    this.exchanges.set('bitget', {
      id: 'bitget',
      name: 'Bitget',
      baseUrl: 'https://api.bitget.com',
      weight: 0.7,
      supportedAssets: this.defaultAssets,
      rateLimit: 300,
      enabled: true
    });
  }

  /**
   * Initialize the service and start data collection
   */
  public async initialize(apiKeys?: Record<ExchangeId, { key: string, secret: string }>): Promise<void> {
    if (this.isInitialized) return;

    // Apply API keys if provided
    if (apiKeys) {
      for (const [exchangeId, auth] of Object.entries(apiKeys)) {
        const exchange = this.exchanges.get(exchangeId as ExchangeId);
        if (exchange) {
          exchange.apiKey = auth.key;
          exchange.apiSecret = auth.secret;
        }
      }
    }

    // Initialize rate limiters
    for (const exchange of this.exchanges.values()) {
      this.rateTimers.set(exchange.id, {
        lastCall: 0,
        queue: 0
      });
    }

    // Perform initial data fetch for all enabled exchanges and supported assets
    await this.fetchAllMarketData();

    this.isInitialized = true;
  }

  /**
   * Fetch market data for all supported assets across all enabled exchanges
   */
  public async fetchAllMarketData(): Promise<Map<string, AssetMarketData>> {
    const promises: Promise<AssetMarketData | null>[] = [];
    
    // Get unique list of supported assets across all exchanges
    const allAssets = new Set<string>();
    for (const exchange of this.exchanges.values()) {
      if (exchange.enabled) {
        exchange.supportedAssets.forEach(asset => allAssets.add(asset));
      }
    }
    
    // Fetch data for each asset
    for (const asset of allAssets) {
      promises.push(this.fetchAssetData(asset));
    }
    
    await Promise.allSettled(promises);
    return this.cachedData;
  }

  /**
   * Fetch market data for a specific asset across all exchanges
   */
  private async fetchAssetData(asset: string): Promise<AssetMarketData | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      const priceData: AssetMarketData['priceData'] = [];
      const fundingData: AssetMarketData['fundingData'] = [];
      const timestamp = Date.now();
      
      // Fetch from each exchange
      const promises: Promise<void>[] = [];
      
      for (const exchange of this.exchanges.values()) {
        if (!exchange.enabled || !exchange.supportedAssets.includes(asset)) continue;
        
        promises.push(this.fetchExchangeData(exchange.id, asset).then(data => {
          if (!data) return;
          
          // Add price data
          priceData.push({
            price: data.price,
            bid: data.bid || data.price,
            ask: data.ask || data.price,
            source: exchange.id,
            weight: exchange.weight
          });
          
          // Add funding data if available
          if (data.fundingRate !== undefined) {
            fundingData.push({
              rate: data.fundingRate,
              nextPaymentTimestamp: data.nextFundingTime || 0,
              exchange: exchange.id,
              weight: exchange.weight
            });
          }
        }).catch(error => {
          console.error(`Error fetching data for ${asset} from ${exchange.name}:`, error);
        }));
      }
      
      await Promise.allSettled(promises);
      
      // If no data was retrieved, return null
      if (priceData.length === 0) {
        return null;
      }
      
      // Calculate aggregated data
      const weightedPrice = this.calculateWeightedAverage(priceData.map(p => ({ value: p.price, weight: p.weight })));
      const weightedFundingRate = fundingData.length > 0 
        ? this.calculateWeightedAverage(fundingData.map(f => ({ value: f.rate, weight: f.weight })))
        : 0;
      
      // Determine next funding time (minimum of all reported times)
      const nextFundingTimes = fundingData
        .filter(f => f.nextPaymentTimestamp > 0)
        .map(f => f.nextPaymentTimestamp);
      const nextFundingTime = nextFundingTimes.length > 0
        ? Math.min(...nextFundingTimes)
        : this.calculateNextFundingTime();
      
      // Get historical data for volatility calculation
      const historyKey = asset;
      const history = this.historyDb.get(historyKey) || { 
        price: [], 
        funding: [],
        volume: []
      };
      
      // Add current data point to history
      history.price.push({ timestamp, value: weightedPrice });
      history.funding.push({ timestamp, value: weightedFundingRate });
      
      // Limit history to last 30 days
      const thirtyDaysAgo = timestamp - 30 * 24 * 60 * 60 * 1000;
      history.price = history.price.filter(p => p.timestamp > thirtyDaysAgo);
      history.funding = history.funding.filter(f => f.timestamp > thirtyDaysAgo);
      
      // Save updated history
      this.historyDb.set(historyKey, history);
      
      // Calculate volatility (past 24h)
      const dayAgo = timestamp - 24 * 60 * 60 * 1000;
      const recentPrices = history.price.filter(p => p.timestamp > dayAgo).map(p => p.value);
      const volatility = this.calculateVolatility(recentPrices);
      
      // Calculate basis volatility
      const recentFunding = history.funding.filter(f => f.timestamp > dayAgo).map(f => f.value);
      const basisVolatility = this.calculateVolatility(recentFunding);
      
      // Create aggregate market data
      const marketData: AssetMarketData = {
        asset,
        timestamp,
        priceData,
        fundingData,
        aggregated: {
          price: weightedPrice,
          volume24h: 0, // Will be populated from exchange data
          volatility,
          openInterest: 0, // Will be populated from exchange data
          fundingRate: weightedFundingRate,
          nextFundingTime,
          currentBasisPoints: weightedFundingRate * 10000, // Convert to basis points
          basisVolatility
        },
        strategyMetrics: {
          expectedHourlyYield: Math.abs(weightedFundingRate) / 8, // 8-hour funding periods
          liquidityScore: 0,
          executionRisk: 0,
          volatilityRisk: 0,
          counterpartyRisk: 0,
          overallRiskScore: 0
        }
      };
      
      // Calculate strategy metrics
      this.calculateStrategyMetrics(marketData);
      
      // Cache the data
      this.cachedData.set(asset, marketData);
      
      return marketData;
    } catch (error) {
      console.error(`Error fetching market data for ${asset}:`, error);
      return null;
    }
  }

  /**
   * Fetch asset data from a specific exchange
   */
  private async fetchExchangeData(
    exchangeId: ExchangeId, 
    asset: string
  ): Promise<{
    price: number;
    bid?: number;
    ask?: number;
    volume?: number;
    openInterest?: number;
    fundingRate?: number;
    nextFundingTime?: number;
  } | null> {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange || !exchange.enabled) return null;
    
    // Apply rate limiting
    await this.applyRateLimit(exchangeId);
    
    try {
      switch (exchangeId) {
        case 'binance':
          return await this.fetchBinanceData(asset);
        case 'okx':
          return await this.fetchOkxData(asset);
        case 'bybit':
          return await this.fetchBybitData(asset);
        case 'deribit':
          return await this.fetchDeribitData(asset);
        case 'bitget':
          return await this.fetchBitgetData(asset);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error fetching data from ${exchangeId} for ${asset}:`, error);
      return null;
    }
  }

  /**
   * Fetch data from Binance
   */
  private async fetchBinanceData(asset: string): Promise<any> {
    const exchange = this.exchanges.get('binance')!;
    const symbol = `${asset}USDT`;
    
    try {
      // Get ticker data
      const tickerResponse = await axios.get(`${exchange.baseUrl}/fapi/v1/ticker/24hr`, {
        params: { symbol }
      });
      
      // Get funding rate data
      const fundingResponse = await axios.get(`${exchange.baseUrl}/fapi/v1/premiumIndex`, {
        params: { symbol }
      });
      
      if (!tickerResponse.data || !fundingResponse.data) {
        throw new Error('Invalid response from Binance API');
      }
      
      return {
        price: parseFloat(tickerResponse.data.lastPrice),
        bid: parseFloat(tickerResponse.data.bidPrice),
        ask: parseFloat(tickerResponse.data.askPrice),
        volume: parseFloat(tickerResponse.data.volume) * parseFloat(tickerResponse.data.lastPrice),
        openInterest: parseFloat(tickerResponse.data.openInterest) * parseFloat(tickerResponse.data.lastPrice),
        fundingRate: parseFloat(fundingResponse.data.lastFundingRate),
        nextFundingTime: fundingResponse.data.nextFundingTime
      };
    } catch (error) {
      console.error(`Error fetching Binance data for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Fetch data from OKX
   */
  private async fetchOkxData(asset: string): Promise<any> {
    const exchange = this.exchanges.get('okx')!;
    const instId = `${asset}-USDT-SWAP`;
    
    try {
      // Get ticker data
      const tickerResponse = await axios.get(`${exchange.baseUrl}/api/v5/market/ticker`, {
        params: { instId }
      });
      
      // Get funding rate data
      const fundingResponse = await axios.get(`${exchange.baseUrl}/api/v5/public/funding-rate`, {
        params: { instId }
      });
      
      // Get open interest data
      const oiResponse = await axios.get(`${exchange.baseUrl}/api/v5/public/open-interest`, {
        params: { instId }
      });
      
      if (!tickerResponse.data?.data || !fundingResponse.data?.data) {
        throw new Error('Invalid response from OKX API');
      }
      
      const ticker = tickerResponse.data.data[0];
      const funding = fundingResponse.data.data[0];
      const openInterest = oiResponse.data?.data?.[0];
      
      return {
        price: parseFloat(ticker.last),
        bid: parseFloat(ticker.bidPx),
        ask: parseFloat(ticker.askPx),
        volume: parseFloat(ticker.vol24h) * parseFloat(ticker.last),
        openInterest: openInterest ? parseFloat(openInterest.oi) * parseFloat(ticker.last) : undefined,
        fundingRate: parseFloat(funding.fundingRate),
        nextFundingTime: new Date(funding.nextFundingTime).getTime()
      };
    } catch (error) {
      console.error(`Error fetching OKX data for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Fetch data from Bybit
   */
  private async fetchBybitData(asset: string): Promise<any> {
    const exchange = this.exchanges.get('bybit')!;
    const symbol = `${asset}USDT`;
    
    try {
      // Get ticker data
      const tickerResponse = await axios.get(`${exchange.baseUrl}/v5/market/tickers`, {
        params: { category: 'linear', symbol }
      });
      
      // Get funding rate data
      const fundingResponse = await axios.get(`${exchange.baseUrl}/v5/market/funding/history`, {
        params: { category: 'linear', symbol, limit: 1 }
      });
      
      if (!tickerResponse.data?.result?.list || !fundingResponse.data?.result?.list) {
        throw new Error('Invalid response from Bybit API');
      }
      
      const ticker = tickerResponse.data.result.list[0];
      const funding = fundingResponse.data.result.list[0];
      
      // Calculate next funding time (Bybit pays funding every 8 hours: 00:00, 08:00, 16:00 UTC)
      const nextFundingTime = this.calculateNextFundingTime();
      
      return {
        price: parseFloat(ticker.lastPrice),
        bid: parseFloat(ticker.bid1Price),
        ask: parseFloat(ticker.ask1Price),
        volume: parseFloat(ticker.volume24h) * parseFloat(ticker.lastPrice),
        openInterest: parseFloat(ticker.openInterest) * parseFloat(ticker.lastPrice),
        fundingRate: parseFloat(funding.fundingRate),
        nextFundingTime
      };
    } catch (error) {
      console.error(`Error fetching Bybit data for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Fetch data from Deribit
   */
  private async fetchDeribitData(asset: string): Promise<any> {
    const exchange = this.exchanges.get('deribit')!;
    const instrumentName = `${asset.toUpperCase()}-PERPETUAL`;
    
    try {
      // Get ticker data
      const tickerResponse = await axios.get(`${exchange.baseUrl}/public/get_ticker`, {
        params: { instrument_name: instrumentName }
      });
      
      if (!tickerResponse.data?.result) {
        throw new Error('Invalid response from Deribit API');
      }
      
      const ticker = tickerResponse.data.result;
      
      return {
        price: ticker.last_price,
        bid: ticker.best_bid_price,
        ask: ticker.best_ask_price,
        volume: ticker.stats.volume_usd,
        openInterest: ticker.open_interest * ticker.last_price,
        fundingRate: ticker.funding_8h / 100, // Convert from percentage
        nextFundingTime: new Date(ticker.next_funding_time).getTime()
      };
    } catch (error) {
      console.error(`Error fetching Deribit data for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Fetch data from Bitget
   */
  private async fetchBitgetData(asset: string): Promise<any> {
    // Implementation similar to other exchanges
    // Using their specific API endpoints and data formats
    return null; // Placeholder
  }

  /**
   * Get funding rate data for all supported assets
   */
  public async getAllFundingRates(): Promise<FundingRateData[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const allRates: FundingRateData[] = [];
    
    // Loop through all cached data
    for (const data of this.cachedData.values()) {
      // Loop through all funding data for this asset
      for (const funding of data.fundingData) {
        allRates.push({
          asset: data.asset,
          symbol: `${data.asset}USDT`,
          rate: funding.rate,
          nextPaymentTimestamp: funding.nextPaymentTimestamp,
          annualizedRate: funding.rate * 3 * 365, // 3 funding periods per day * 365 days
          exchange: funding.exchange
        });
      }
    }
    
    return allRates;
  }

  /**
   * Get market data for all supported assets
   */
  public async getAllMarketData(): Promise<MarketData[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const allMarketData: MarketData[] = [];
    
    // Loop through all cached data
    for (const data of this.cachedData.values()) {
      // Create market data for each price source
      for (const price of data.priceData) {
        allMarketData.push({
          price: price.price,
          volume24h: data.aggregated.volume24h,
          openInterest: data.aggregated.openInterest,
          liquidityDepth: data.strategyMetrics.liquidityScore
        });
      }
    }
    
    return allMarketData;
  }

  /**
   * Get the best funding rate opportunities across all exchanges
   */
  public async getBestFundingOpportunities(
    minThreshold: number = 0.05, // 5% annualized
    maxCount: number = 10
  ): Promise<FundingRateData[]> {
    const allRates = await this.getAllFundingRates();
    
    // Sort by absolute annualized rate (highest first)
    const sortedRates = allRates
      .filter(rate => Math.abs(rate.annualizedRate) >= minThreshold)
      .sort((a, b) => Math.abs(b.annualizedRate) - Math.abs(a.annualizedRate));
    
    return sortedRates.slice(0, maxCount);
  }
  
  /**
   * Subscribe to market data updates
   */
  public subscribe(
    assets: string[],
    callback: (data: AssetMarketData[]) => void,
    intervalMs: number = 60000 // Default 1 minute
  ): () => void {
    // Create subscription
    const subscription: MarketUpdateSubscription = {
      assets,
      callback,
      interval: intervalMs,
      lastUpdate: 0
    };
    
    // Start timer
    subscription.timerId = setInterval(async () => {
      try {
        const data: AssetMarketData[] = [];
        
        // Fetch data for each asset
        for (const asset of assets) {
          const assetData = await this.fetchAssetData(asset);
          if (assetData) {
            data.push(assetData);
          }
        }
        
        // Update timestamp
        subscription.lastUpdate = Date.now();
        
        // Call callback with data
        callback(data);
      } catch (error) {
        console.error('Error in market data subscription:', error);
      }
    }, intervalMs);
    
    // Add to subscriptions
    this.subscriptions.push(subscription);
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscription);
    };
  }
  
  /**
   * Unsubscribe from market data updates
   */
  private unsubscribe(subscription: MarketUpdateSubscription): void {
    // Clear timer
    if (subscription.timerId) {
      clearInterval(subscription.timerId);
    }
    
    // Remove from subscriptions
    const index = this.subscriptions.indexOf(subscription);
    if (index !== -1) {
      this.subscriptions.splice(index, 1);
    }
  }
  
  /**
   * Calculate next funding time
   * Funding typically happens at 00:00, 08:00, 16:00 UTC
   */
  private calculateNextFundingTime(): number {
    const now = new Date();
    const hours = now.getUTCHours();
    const nextHour = hours < 8 ? 8 : hours < 16 ? 16 : 24;
    
    // Create date for next funding time
    const nextFunding = new Date(now);
    nextFunding.setUTCHours(nextHour, 0, 0, 0);
    
    // If next funding is tomorrow (hours >= 16)
    if (nextHour === 24) {
      nextFunding.setUTCDate(nextFunding.getUTCDate() + 1);
      nextFunding.setUTCHours(0, 0, 0, 0);
    }
    
    return nextFunding.getTime();
  }
  
  /**
   * Calculate weighted average of values
   */
  private calculateWeightedAverage(
    values: { value: number, weight: number }[]
  ): number {
    if (values.length === 0) return 0;
    
    const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight === 0) return 0;
    
    const weightedSum = values.reduce((sum, v) => sum + v.value * v.weight, 0);
    return weightedSum / totalWeight;
  }
  
  /**
   * Calculate volatility of values
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Calculate mean
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    // Calculate variance
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    
    // Return standard deviation
    return Math.sqrt(variance);
  }
  
  /**
   * Rate limiting for API calls
   */
  private async applyRateLimit(exchangeId: ExchangeId): Promise<void> {
    const rateTimer = this.rateTimers.get(exchangeId);
    if (!rateTimer) return;
    
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) return;
    
    // Calculate time per request
    const timePerRequest = 60000 / exchange.rateLimit; // milliseconds
    
    // Check if rate limit is exceeded
    const now = Date.now();
    const timeSinceLastCall = now - rateTimer.lastCall;
    
    if (timeSinceLastCall < timePerRequest) {
      // Wait for rate limit
      const waitTime = timePerRequest - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Update last call time
    rateTimer.lastCall = Date.now();
  }
  
  /**
   * Calculate strategy metrics for a given asset
   */
  private calculateStrategyMetrics(data: AssetMarketData): void {
    // Liquidity score (0-10)
    const liquidityScore = Math.min(10, Math.log10(data.aggregated.volume24h / 1000000));
    
    // Execution risk (0-10)
    // Higher spread and lower liquidity means higher execution risk
    const spreadSum = data.priceData.reduce((sum, p) => sum + (p.ask - p.bid) / p.price, 0);
    const avgSpread = spreadSum / data.priceData.length;
    const executionRisk = Math.min(10, avgSpread * 10000 + (10 - liquidityScore));
    
    // Volatility risk (0-10)
    const volatilityRisk = Math.min(10, data.aggregated.volatility * 100);
    
    // Counterparty risk (0-10)
    // Based on exchange weights
    const avgExchangeWeight = data.priceData.reduce((sum, p) => sum + p.weight, 0) / data.priceData.length;
    const counterpartyRisk = 10 - (avgExchangeWeight * 10);
    
    // Overall risk score (0-10)
    const overallRiskScore = (
      executionRisk * 0.3 +
      volatilityRisk * 0.4 +
      counterpartyRisk * 0.3
    );
    
    // Update strategy metrics
    data.strategyMetrics = {
      expectedHourlyYield: Math.abs(data.aggregated.fundingRate) / 8,
      liquidityScore,
      executionRisk,
      volatilityRisk,
      counterpartyRisk,
      overallRiskScore
    };
  }
} 