'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection } from '@solana/web3.js';
import { RPC_ENDPOINT } from '../config';
import { FundingRateArbitrageStrategy, FRAStats } from '../utils/funding-rate-strategy';
import { OffChainStrategy, OffChainStrategyExecutor } from '../utils/off-chain-strategy';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Sample strategy config that implements OffChainStrategy interface
const sampleFundingRateStrategy: OffChainStrategy = {
  id: `fra-${Date.now()}`,
  name: 'Funding Rate Arbitrage',
  description: 'Earn yield from funding payments while maintaining delta neutrality',
  type: 'Funding Rate',
  risk: 50,
  targetApy: 0.12,
  currentApy: 0.09,
  usdcAllocated: 10000,
  usdcDeployed: 8000,
  usdcInReserve: 2000,
  allTimeYield: 0.07,
  dailyYield: 0.0003,
  sharpeRatio: 2.4,
  maxDrawdown: 0.03,
  volatility: 0.02,
  longExposure: 12000,
  shortExposure: 12000,
  netExposure: 0,
  hedgeRatio: 1.0,
  positions: [],
  stopLossThreshold: 0.05,
  takeProfitThreshold: 0.1,
  rebalanceThreshold: 0.03,
  maxSlippage: 0.003,
  createdAt: Date.now(),
  lastRebalancedAt: Date.now(),
  isActive: true
};

export default function FundingRateStrategyPage() {
  const { connected } = useWallet();
  const [loading, setLoading] = useState(true);
  const [fundingRates, setFundingRates] = useState<any[]>([]);
  const [strategyStats, setStrategyStats] = useState<FRAStats | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>(['BTC', 'ETH', 'SOL']);
  const [collateralAmount, setCollateralAmount] = useState<number>(10000);
  const [maxLeverage, setMaxLeverage] = useState<number>(3);
  const [insuranceFund, setInsuranceFund] = useState<number>(5);
  const [minFundingThreshold, setMinFundingThreshold] = useState<number>(5);
  const [executor, setExecutor] = useState<OffChainStrategyExecutor | null>(null);
  
  // Initialize strategy
  useEffect(() => {
    const initializeStrategy = async () => {
      setLoading(true);
      try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const stratExecutor = new OffChainStrategyExecutor(connection);
        await stratExecutor.initialize();
        setExecutor(stratExecutor);
        
        // Create funding rate arbitrage strategy with a properly typed strategy
        const fraStrategy = new FundingRateArbitrageStrategy(
          sampleFundingRateStrategy,
          collateralAmount,
          'USDC',
          selectedAssets,
          maxLeverage,
          insuranceFund / 100,
          minFundingThreshold / 100
        );
        
        // Get funding rates
        const rates = await fraStrategy.getAllFundingRates();
        setFundingRates(rates);
        
        // Get best opportunities
        const opportunities = await fraStrategy.findBestFundingOpportunities();
        
        // Initialize mock positions for UI demonstration
        if (opportunities.length > 0) {
          // Simulate executing trades
          await fraStrategy.execute();
          
          // Get stats
          const stats = fraStrategy.getStats();
          setStrategyStats(stats);
          
          // Mock positions data
          const mockPositions = opportunities.slice(0, 3).map((opp, index) => ({
            id: `pos-${index}`,
            asset: opp.asset,
            exchange: opp.exchange,
            direction: opp.rate > 0 ? 'SHORT' : 'LONG',
            size: (collateralAmount / opportunities.length) * maxLeverage,
            entryPrice: Math.random() * (opp.asset === 'BTC' ? 50000 : opp.asset === 'ETH' ? 3000 : 100),
            currentPrice: Math.random() * (opp.asset === 'BTC' ? 51000 : opp.asset === 'ETH' ? 3100 : 105),
            fundingRate: opp.rate,
            annualizedRate: opp.annualizedRate,
            nextPayment: new Date(opp.nextPaymentTimestamp).toLocaleTimeString(),
            pnl: Math.random() * 200 - 100,
            fundingReceived: Math.random() * 50,
            health: Math.random() * 50 + 50
          }));
          
          setPositions(mockPositions);
        }
      } catch (error) {
        console.error('Error initializing strategy:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeStrategy();
  }, [collateralAmount, maxLeverage, insuranceFund, minFundingThreshold, selectedAssets.join(',')]);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  
  // Calculate average APY from positions
  const calculateAverageAPY = () => {
    if (positions.length === 0) return '0.00%';
    
    const totalApy = positions.reduce((sum, pos) => sum + pos.annualizedRate, 0);
    return formatPercent(totalApy / positions.length);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Perpetual Funding Rate Strategy</h1>
            <p className="text-gray-400 mt-1">
              Earn yield from funding payments while maintaining delta neutrality
            </p>
          </div>
          <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg !h-10" />
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-400">Loading strategy data...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Strategy Configuration */}
            <div className="bg-gray-800 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Strategy Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 mb-2">Collateral Amount</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={collateralAmount}
                      onChange={(e) => setCollateralAmount(Number(e.target.value))}
                      className="flex-1 bg-gray-700 text-white rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="bg-gray-600 text-gray-300 py-2 px-3 rounded-r-lg">USDC</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2">Max Leverage</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={maxLeverage}
                      min={1}
                      max={10}
                      onChange={(e) => setMaxLeverage(Number(e.target.value))}
                      className="flex-1 bg-gray-700 text-white rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="bg-gray-600 text-gray-300 py-2 px-3 rounded-r-lg">×</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2">Insurance Fund</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={insuranceFund}
                      min={0}
                      max={20}
                      onChange={(e) => setInsuranceFund(Number(e.target.value))}
                      className="flex-1 bg-gray-700 text-white rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="bg-gray-600 text-gray-300 py-2 px-3 rounded-r-lg">%</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2">Min Funding Threshold</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={minFundingThreshold}
                      min={0}
                      max={20}
                      onChange={(e) => setMinFundingThreshold(Number(e.target.value))}
                      className="flex-1 bg-gray-700 text-white rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="bg-gray-600 text-gray-300 py-2 px-3 rounded-r-lg">% APY</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-gray-400 mb-2">Target Assets</label>
                <div className="flex flex-wrap gap-2">
                  {['BTC', 'ETH', 'SOL', 'AVAX', 'NEAR', 'ARB'].map(asset => (
                    <button
                      key={asset}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedAssets.includes(asset)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      onClick={() => {
                        if (selectedAssets.includes(asset)) {
                          setSelectedAssets(selectedAssets.filter(a => a !== asset));
                        } else {
                          setSelectedAssets([...selectedAssets, asset]);
                        }
                      }}
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Strategy Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-4">Strategy Overview</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Strategy Type</span>
                    <span className="text-white font-medium">Funding Rate Arbitrage</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Collateral</span>
                    <span className="text-white font-medium">{formatCurrency(collateralAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Notional</span>
                    <span className="text-white font-medium">
                      {formatCurrency(collateralAmount * maxLeverage)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Positions</span>
                    <span className="text-white font-medium">{positions.length}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target Assets</span>
                    <span className="text-white font-medium">{selectedAssets.join(', ')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Estimated APY</span>
                    <span className="text-green-400 font-medium">{calculateAverageAPY()}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-4">Risk Parameters</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Leverage</span>
                    <span className="text-white font-medium">{maxLeverage}×</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Insurance Fund</span>
                    <span className="text-white font-medium">
                      {formatCurrency(collateralAmount * (insuranceFund / 100))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Net Exposure</span>
                    <span className="text-white font-medium">
                      {strategyStats ? formatPercent(Math.abs(strategyStats.netExposure / strategyStats.totalNotional * 100)) : '0.00%'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Health Ratio</span>
                    <span className={`font-medium ${
                      (strategyStats?.healthRatio || 0) > 2 
                        ? 'text-green-400' 
                        : (strategyStats?.healthRatio || 0) > 1.5 
                          ? 'text-yellow-400' 
                          : 'text-red-400'
                    }`}>
                      {strategyStats ? strategyStats.healthRatio.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min Funding Threshold</span>
                    <span className="text-white font-medium">{formatPercent(minFundingThreshold)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Settlement Frequency</span>
                    <span className="text-white font-medium">8 hours</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-4">Performance</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Funding Collected</span>
                    <span className="text-green-400 font-medium">
                      {strategyStats 
                        ? formatCurrency(strategyStats.totalFundingCollected) 
                        : '$0'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Annualized Yield</span>
                    <span className="text-green-400 font-medium">
                      {strategyStats 
                        ? formatPercent(strategyStats.annualizedYield * 100) 
                        : '0.00%'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Highest Rate Asset</span>
                    <span className="text-white font-medium">
                      {strategyStats?.highestFundingAsset || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Highest Rate</span>
                    <span className="text-green-400 font-medium">
                      {strategyStats 
                        ? formatPercent(strategyStats.highestFundingRate) 
                        : '0.00%'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Rebalance</span>
                    <span className="text-white font-medium">
                      {strategyStats 
                        ? new Date(strategyStats.lastRebalance).toLocaleString() 
                        : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors w-full">
                      Run Strategy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Funding Rates Table */}
            <div className="bg-gray-800 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Current Funding Rates</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Asset</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Exchange</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Current Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Annualized</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Next Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {fundingRates.length > 0 ? (
                      fundingRates.map((rate, index) => (
                        <tr key={index} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{rate.asset}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{rate.exchange}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            rate.rate > 0 ? 'text-green-400' : rate.rate < 0 ? 'text-red-400' : 'text-gray-300'
                          }`}>
                            {formatPercent(rate.rate)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            rate.annualizedRate > 0 ? 'text-green-400' : rate.annualizedRate < 0 ? 'text-red-400' : 'text-gray-300'
                          }`}>
                            {formatPercent(rate.annualizedRate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {new Date(rate.nextPaymentTimestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button 
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                rate.rate > 0 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                              disabled={rate.rate <= 0}
                            >
                              {rate.rate > 0 ? 'Trade' : 'Skip'}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-400">
                          No funding rate data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Positions */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Active Positions</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Asset</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Entry/Current</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Funding Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">PnL</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Health</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {positions.length > 0 ? (
                      positions.map((position, index) => (
                        <tr key={index} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                            {position.asset}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            position.direction === 'SHORT' ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {position.direction}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatCurrency(position.size)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {position.entryPrice.toFixed(2)} / {position.currentPrice.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            position.fundingRate > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPercent(position.fundingRate)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            position.pnl > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {position.pnl > 0 ? '+' : ''}{formatCurrency(position.pnl)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  position.health > 90 ? 'bg-green-500' :
                                  position.health > 70 ? 'bg-blue-500' :
                                  position.health > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${position.health}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                                Rebalance
                              </button>
                              <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
                                Close
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-400">
                          No active positions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 