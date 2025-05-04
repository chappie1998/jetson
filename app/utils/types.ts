// Common types used across multiple files

// Funding rate data from exchange
export interface FundingRateData {
  asset: string;
  symbol: string;
  rate: number;
  nextPaymentTimestamp: number;
  annualizedRate: number;
  exchange: string;
}

// Market data for an asset
export interface MarketData {
  price: number;
  volume24h?: number;
  openInterest?: number;
  liquidityDepth?: number;
}

// Historical data point for training and prediction
export interface HistoricalDataPoint {
  timestamp: number;
  asset?: string;
  exchange?: string;
  fundingRate?: number;
  price: number;
  volume?: number;
  openInterest?: number;
  marketVolatility?: number;
}

// Strategy execution result
export interface StrategyExecutionResult {
  success: boolean;
  txId?: string;
  error?: string;
  positions?: any[];
  profit?: number;
  executedAt: number;
}

// Risk metrics for a strategy
export interface RiskMetrics {
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  valueAtRisk: number;
  betaToMarket: number;
  correlationWithMarket: number;
} 