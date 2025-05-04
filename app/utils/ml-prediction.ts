import axios from 'axios';
import { FundingRateData, HistoricalDataPoint } from './types';

// Configuration for ML services
interface MLServiceConfig {
  apiKey: string;
  endpoint: string;
  modelId?: string;
}

// Prediction result
export interface FundingRatePrediction {
  asset: string;
  exchange: string;
  currentRate: number;
  predictedRates: {
    hourly: number[];    // Predicted rates for next 24 hours
    confidence: number;  // Confidence score (0-1)
  };
  expectedAnnualizedYield: number;
  volatilityScore: number;
  recommendedAction: 'long' | 'short' | 'neutral' | 'avoid';
  explanation: string;
}

// Historical data point for training and prediction
interface HistoricalDataPoint {
  timestamp: number;
  asset: string;
  exchange: string;
  fundingRate: number;
  price: number;
  volume: number;
  openInterest?: number;
  marketVolatility?: number;
}

/**
 * ML-based funding rate prediction service
 * Uses external APIs (OpenAI, Grok, etc.) for predictions
 * with fallback to statistical models when API is unavailable
 */
export class FundingRatePredictor {
  private openAiConfig?: MLServiceConfig;
  private grokConfig?: MLServiceConfig;
  private historicalData: Map<string, HistoricalDataPoint[]> = new Map();
  private lastUpdate: number = 0;
  private cacheTTL: number = 1000 * 60 * 15; // 15 minutes

  constructor(
    openAiApiKey?: string,
    grokApiKey?: string
  ) {
    if (openAiApiKey) {
      this.openAiConfig = {
        apiKey: openAiApiKey,
        endpoint: 'https://api.openai.com/v1/chat/completions',
        modelId: 'gpt-4-turbo'
      };
    }

    if (grokApiKey) {
      this.grokConfig = {
        apiKey: grokApiKey,
        endpoint: 'https://api.grok.ai/v1/predictions'
      };
    }
  }

  /**
   * Add historical data for training and prediction
   */
  public addHistoricalData(data: HistoricalDataPoint[]): void {
    for (const point of data) {
      const key = `${point.asset}-${point.exchange}`;
      if (!this.historicalData.has(key)) {
        this.historicalData.set(key, []);
      }
      this.historicalData.get(key)!.push(point);
    }

    // Sort data by timestamp (ascending)
    for (const [key, points] of this.historicalData.entries()) {
      this.historicalData.set(
        key,
        points.sort((a, b) => a.timestamp - b.timestamp)
      );
    }

    this.lastUpdate = Date.now();
  }

  /**
   * Predict future funding rates using ML models
   */
  public async predictFundingRates(
    currentRates: FundingRateData[],
    marketData: {
      price: number;
      volume: number;
      volatility: number;
      asset: string;
    }[]
  ): Promise<FundingRatePrediction[]> {
    try {
      // Try ML APIs if configured
      if (this.openAiConfig) {
        return await this.predictWithOpenAI(currentRates, marketData);
      } else if (this.grokConfig) {
        return await this.predictWithGrok(currentRates, marketData);
      }

      // Fallback to statistical prediction if no ML APIs available
      return this.predictWithStatisticalModel(currentRates, marketData);
    } catch (error) {
      console.error('Error predicting funding rates:', error);
      // Fallback to statistical model in case of API errors
      return this.predictWithStatisticalModel(currentRates, marketData);
    }
  }

  /**
   * Use OpenAI API for funding rate prediction
   */
  private async predictWithOpenAI(
    currentRates: FundingRateData[],
    marketData: any[]
  ): Promise<FundingRatePrediction[]> {
    if (!this.openAiConfig) {
      throw new Error('OpenAI config not available');
    }

    const predictions: FundingRatePrediction[] = [];

    for (const rate of currentRates) {
      const assetData = marketData.find(md => md.asset === rate.asset);
      if (!assetData) continue;

      // Get historical data for this asset/exchange
      const historyKey = `${rate.asset}-${rate.exchange}`;
      const history = this.historicalData.get(historyKey) || [];
      
      // Format recent history for the prompt (last 7 days, sampled every 8 hours)
      const recentHistory = history
        .filter(h => h.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000)
        .filter((_, i) => i % 24 === 0) // Sample every 24 points (assuming hourly data)
        .map(h => ({
          timestamp: new Date(h.timestamp).toISOString(),
          fundingRate: h.fundingRate.toFixed(6),
          price: h.price.toFixed(2),
          volume: h.volume ? Math.round(h.volume / 1000000) + 'M' : 'N/A'
        }));

      // Create prompt for OpenAI
      const prompt = {
        model: this.openAiConfig.modelId,
        messages: [
          {
            role: "system",
            content: "You are a specialized model for predicting cryptocurrency funding rates. Your task is to analyze historical funding rate patterns and current market conditions to predict future funding rates for the next 24 hours. Provide quantitative predictions with reasoning."
          },
          {
            role: "user",
            content: `
              I need a prediction for ${rate.asset} funding rates on ${rate.exchange}.
              
              Current data:
              - Current funding rate: ${rate.rate}%
              - Annualized rate: ${rate.annualizedRate}%
              - Current price: $${assetData.price}
              - 24h volume: $${assetData.volume}
              - Market volatility: ${assetData.volatility}
              
              Recent funding rate history:
              ${JSON.stringify(recentHistory, null, 2)}
              
              Please predict:
              1. Hourly funding rates for next 24 hours (as JSON array of numbers)
              2. Confidence score (0-1)
              3. Expected annualized yield from funding
              4. Volatility score (0-10)
              5. Recommended action (long/short/neutral/avoid)
              6. Brief explanation
              
              Format your response as valid JSON with these exact fields:
              { 
                "hourlyRates": [numbers], 
                "confidence": number, 
                "annualizedYield": number, 
                "volatilityScore": number, 
                "recommendedAction": "string", 
                "explanation": "string" 
              }
            `
          }
        ]
      };

      try {
        const response = await axios.post(
          this.openAiConfig.endpoint,
          prompt,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.openAiConfig.apiKey}`
            }
          }
        );

        const content = response.data.choices[0].message.content;
        // Extract JSON from the response
        const jsonMatch = content.match(/({[\s\S]*})/);
        const predictionData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (predictionData) {
          predictions.push({
            asset: rate.asset,
            exchange: rate.exchange,
            currentRate: rate.rate,
            predictedRates: {
              hourly: predictionData.hourlyRates,
              confidence: predictionData.confidence,
            },
            expectedAnnualizedYield: predictionData.annualizedYield,
            volatilityScore: predictionData.volatilityScore,
            recommendedAction: predictionData.recommendedAction as any,
            explanation: predictionData.explanation
          });
        }
      } catch (error) {
        console.error(`Error predicting with OpenAI for ${rate.asset}:`, error);
        // Fall back to statistical prediction for this asset
        const statPrediction = this.predictSingleAssetStatistically(rate, assetData);
        predictions.push(statPrediction);
      }
    }

    return predictions;
  }

  /**
   * Use Grok API for funding rate prediction
   */
  private async predictWithGrok(
    currentRates: FundingRateData[],
    marketData: any[]
  ): Promise<FundingRatePrediction[]> {
    // Implementation similar to OpenAI but using Grok API
    // This is a placeholder as Grok API details may vary
    return this.predictWithStatisticalModel(currentRates, marketData);
  }

  /**
   * Use statistical models as fallback when ML APIs are unavailable
   */
  private predictWithStatisticalModel(
    currentRates: FundingRateData[],
    marketData: any[]
  ): Promise<FundingRatePrediction[]> {
    const predictions: FundingRatePrediction[] = [];

    for (const rate of currentRates) {
      const assetData = marketData.find(md => md.asset === rate.asset);
      if (!assetData) continue;

      const prediction = this.predictSingleAssetStatistically(rate, assetData);
      predictions.push(prediction);
    }

    return Promise.resolve(predictions);
  }

  /**
   * Predict a single asset using statistical methods
   */
  private predictSingleAssetStatistically(
    rate: FundingRateData,
    marketData: any
  ): FundingRatePrediction {
    // Get historical data for this asset/exchange
    const historyKey = `${rate.asset}-${rate.exchange}`;
    const history = this.historicalData.get(historyKey) || [];

    // Calculate mean, volatility of historical rates
    const rateValues = history.map(h => h.fundingRate);
    const mean = rateValues.length > 0
      ? rateValues.reduce((a, b) => a + b, 0) / rateValues.length
      : rate.rate;
    
    const variance = rateValues.length > 0
      ? rateValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rateValues.length
      : 0.0001;
    
    const volatility = Math.sqrt(variance);

    // Generate predicted rates with mean-reverting random walk
    const hourlyRates: number[] = [];
    let currentPrediction = rate.rate;
    
    for (let i = 0; i < 24; i++) {
      // Mean-reverting component
      const meanReversion = 0.1 * (mean - currentPrediction);
      // Random component based on historical volatility
      const randomComponent = volatility * (Math.random() * 2 - 1) * 0.5;
      // Trend component based on recent movement
      const trendComponent = history.length >= 2
        ? 0.2 * (history[history.length - 1].fundingRate - history[Math.max(0, history.length - 3)].fundingRate)
        : 0;
      
      // Update prediction
      currentPrediction = currentPrediction + meanReversion + randomComponent + trendComponent;
      hourlyRates.push(currentPrediction);
    }

    // Calculate expected yield
    const avgPredictedRate = hourlyRates.reduce((a, b) => a + b, 0) / hourlyRates.length;
    const annualizedYield = Math.abs(avgPredictedRate) * 3 * 365; // 3 funding periods per day * 365 days

    // Determine recommended action
    let action: 'long' | 'short' | 'neutral' | 'avoid' = 'neutral';
    if (avgPredictedRate > 0.01) {
      action = 'short'; // Short when positive funding (collect payments)
    } else if (avgPredictedRate < -0.01) {
      action = 'long'; // Long when negative funding (collect payments)
    } else if (volatility > 0.05) {
      action = 'avoid'; // Avoid when volatile but low funding
    }

    // Create prediction
    return {
      asset: rate.asset,
      exchange: rate.exchange,
      currentRate: rate.rate,
      predictedRates: {
        hourly: hourlyRates,
        confidence: 1 / (1 + volatility * 10), // Lower confidence when more volatile
      },
      expectedAnnualizedYield: annualizedYield,
      volatilityScore: Math.min(10, volatility * 100), // Scale to 0-10
      recommendedAction: action,
      explanation: `Statistical prediction based on mean-reversion model. ${
        action === 'short' ? 'Predicted positive funding rates suggest shorting to collect payments.' :
        action === 'long' ? 'Predicted negative funding rates suggest longing to collect payments.' :
        action === 'avoid' ? 'High volatility with low expected funding rates suggests avoiding this pair.' :
        'Funding rates close to zero with low volatility suggest neutral stance.'
      }`
    };
  }
} 