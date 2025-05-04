'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { 
  InteractiveAreaChart, 
  InteractiveBarChart 
} from '../components/InteractiveCharts';
import { AIEnhancedReflectManager } from '../../lib/reflect-integration/ai-middleware';

// Temporary mock API key for demo
const DEMO_API_KEY = 'demo-api-key';
const DEMO_POOL_ADDRESS = 'reflect-pool-address';

export default function ReflectPoolPage() {
  const { connected, publicKey } = useWallet();
  const [poolStats, setPoolStats] = useState<any>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadPoolData();
  }, [connected]);
  
  const loadPoolData = async () => {
    setIsLoading(true);
    
    try {
      const manager = new AIEnhancedReflectManager(
        DEMO_API_KEY,
        DEMO_POOL_ADDRESS
      );
      
      // Get pool state
      const poolState = await manager.getPoolState();
      setPoolStats(poolState);
      
      // Get optimized allocations
      const optimizedAllocations = await manager.optimizeAllocations();
      setAllocations(optimizedAllocations);
      
      // Get historical performance
      const performance = await manager.getHistoricalPerformance(90);
      setPerformanceData(performance);
      
      // Get risk metrics
      const metrics = await manager.getRiskMetrics();
      setRiskMetrics(metrics);
    } catch (error) {
      console.error('Error loading pool data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Format percentage for display
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };
  
  return (
    <div className="min-h-screen bg-gray-900 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">AI-Enhanced Delta-Neutral Pool</h1>
            <p className="text-gray-400 mt-1">Powered by Reflect Protocol with Jetson AI</p>
          </div>
          <div className="flex items-center space-x-4">
            <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg !h-10" />
          </div>
        </div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-400">Loading pool data...</p>
          </div>
        )}
        
        {/* Summary Stats */}
        {!isLoading && poolStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {formatCurrency(poolStats.totalValueLocked)}
              </div>
              <p className="text-gray-400">Total Value Locked</p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {formatPercent(poolStats.performanceMetrics.annualized)}
              </div>
              <p className="text-gray-400">Annualized Yield</p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {riskMetrics?.sharpeRatio.toFixed(2) || 'N/A'}
              </div>
              <p className="text-gray-400">Sharpe Ratio</p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {formatCurrency(poolStats.insuranceFundSize)}
              </div>
              <p className="text-gray-400">Insurance Fund</p>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Strategy Information */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">AI-Optimized Allocations</h2>
                
                {allocations.length > 0 ? (
                  <div className="space-y-4">
                    {allocations.map((allocation, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-white font-medium">{allocation.asset}</span>
                          <span className="text-white font-medium">{formatCurrency(allocation.size)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Direction</span>
                          <span className={allocation.direction === 'long' ? 'text-green-400' : 'text-red-400'}>
                            {allocation.direction.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Leverage</span>
                          <span className="text-white">{allocation.leverage}x</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Target Funding</span>
                          <span className="text-white">{formatPercent(allocation.targetFundingRate)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Expected Return</span>
                          <span className="text-green-400">{formatPercent(allocation.expectedReturn)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">AI Confidence</span>
                          <span className="text-white">{formatPercent(allocation.confidence)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-6">No allocations available</p>
                )}
                
                <div className="mt-6">
                  <button 
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                    onClick={loadPoolData}
                  >
                    Refresh Allocations
                  </button>
                </div>
              </div>
              
              {/* Risk Metrics */}
              {riskMetrics && (
                <div className="bg-gray-800 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Risk Analysis</h2>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sharpe Ratio</span>
                      <span className="text-white">{riskMetrics.sharpeRatio.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sortino Ratio</span>
                      <span className="text-white">{riskMetrics.sortinoRatio.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Drawdown</span>
                      <span className="text-white">{formatPercent(riskMetrics.maxDrawdown)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-400">Volatility</span>
                      <span className="text-white">{formatPercent(riskMetrics.volatility)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-400">Net Delta Exposure</span>
                      <span className="text-white">{formatPercent(riskMetrics.deltaExposure)}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-700 mt-2">
                      <h3 className="text-white font-medium mb-2">Asset Exposure</h3>
                      
                      {Object.entries(riskMetrics.exposureByAsset).map(([asset, exposure]) => (
                        <div key={asset} className="flex justify-between">
                          <span className="text-gray-400">{asset}</span>
                          <span className="text-white">{formatPercent(exposure as number)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Column - Charts */}
            <div className="lg:col-span-2">
              {/* Performance Chart */}
              <div className="bg-gray-800 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Performance History</h2>
                
                {performanceData.length > 0 ? (
                  <InteractiveAreaChart 
                    data={performanceData}
                    dataKey="cumulativeReturn"
                    name="Returns"
                    color="#3b82f6"
                    height={250}
                    valuePrefix=""
                    valueSuffix="%"
                    yAxisFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                    showBrush={true}
                  />
                ) : (
                  <p className="text-center text-gray-400 py-10">
                    Performance data not available
                  </p>
                )}
              </div>
              
              {/* Daily Returns */}
              <div className="bg-gray-800 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Daily Returns</h2>
                
                {performanceData.length > 0 ? (
                  <InteractiveBarChart
                    data={performanceData}
                    dataKey="dailyReturn"
                    name="Daily Return"
                    height={200}
                    valuePrefix=""
                    valueSuffix="%"
                    yAxisFormatter={(value) => `${(value * 100).toFixed(2)}%`}
                    colorByValue={true}
                  />
                ) : (
                  <p className="text-center text-gray-400 py-10">
                    Daily return data not available
                  </p>
                )}
              </div>
              
              {/* Strategy Explanation */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
                
                <div className="space-y-4 text-gray-300">
                  <p>
                    This pool implements an AI-enhanced delta-neutral strategy using the Reflect Protocol on Solana. 
                    It generates yield through funding rate arbitrage while maintaining minimal market exposure.
                  </p>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-medium text-white mb-2">AI Enhancement</h3>
                    <p className="text-sm">
                      Our AI system predicts optimal funding rates and market movements to dynamically
                      allocate capital for maximum yield while minimizing risk. The AI continuously learns 
                      from market data to improve prediction accuracy.
                    </p>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-medium text-white mb-2">Insurance Protection</h3>
                    <p className="text-sm">
                      5% of all deposits are allocated to an insurance fund that protects against 
                      extreme market events, liquidations, and smart contract risks.
                    </p>
                  </div>
                  
                  <div className="mt-4">
                    <Link 
                      href="/swap" 
                      className="inline-block py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                    >
                      Deposit USDC
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 