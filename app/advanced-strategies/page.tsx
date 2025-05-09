'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection } from '@solana/web3.js';
import { OffChainStrategyExecutor, OffChainStrategy, DEFAULT_STRATEGIES } from '../utils/off-chain-strategy';
import { RPC_ENDPOINT } from '../config';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Mock charts library - in a real app use Chart.js or similar
const LineChart = ({ data, labels, color }: { data: number[], labels: string[], color: string }) => {
  // In a real implementation, this would be a real chart
  return (
    <div className="h-32 w-full bg-gray-800 rounded-lg flex items-end relative">
      {data.map((value, i) => (
        <div 
          key={i} 
          className="flex-1 mx-px transition-all duration-500"
          style={{ 
            height: `${(value / Math.max(...data)) * 100}%`, 
            backgroundColor: color 
          }}
          title={`${labels[i]}: ${value.toFixed(2)}%`}
        />
      ))}
    </div>
  );
};

export default function AdvancedStrategiesPage() {
  const { publicKey, connected } = useWallet();
  const [strategies, setStrategies] = useState<OffChainStrategy[]>([]);
  const [simulationData, setSimulationData] = useState<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'1d' | '7d' | '30d' | '90d'>('30d');
  
  // Create connection and executor
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  
  // Initialize strategies
  useEffect(() => {
    const initializeStrategies = async () => {
      setLoading(true);
      try {
        // In a production app, we would create this once and store it in context
        const executor = new OffChainStrategyExecutor(connection);
        await executor.initialize();
        
        const strategyList = executor.getStrategies();
        if (strategyList.length === 0) {
          // Add default strategies for demo
          const defaultList = Object.values(DEFAULT_STRATEGIES).map(strategy => ({
            ...strategy,
            id: `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            createdAt: Date.now(),
          })) as OffChainStrategy[];
          
          setStrategies(defaultList);
        } else {
          setStrategies(strategyList);
        }
        
        // Run simulation for charts
        const days = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
        const simulationConfig = {
          interval: timeframe === '1d' ? 1 : 24, // Hourly for 1d, daily for others
          volatility: 0.2,
          marketTrend: 0.05
        };
        
        const simResults = await executor.simulateYieldGeneration(days, simulationConfig);
        setSimulationData(simResults);
        
      } catch (error) {
        console.error('Failed to initialize strategies:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeStrategies();
  }, [timeframe]);
  
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
  
  // Get risk level badge
  const getRiskBadge = (riskScore: number) => {
    if (riskScore < 30) {
      return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Low Risk</span>;
    } else if (riskScore < 70) {
      return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Medium Risk</span>;
    } else {
      return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">High Risk</span>;
    }
  };
  
  // Get strategy type badge
  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Basis Trade': 'bg-blue-100 text-blue-800',
      'Funding Rate': 'bg-purple-100 text-purple-800',
      'Staking-Hedged': 'bg-green-100 text-green-800',
      'LP-Hedged': 'bg-indigo-100 text-indigo-800',
      'Multi-Protocol': 'bg-orange-100 text-orange-800'
    };
    
    const bgColor = colors[type] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`${bgColor} text-xs font-medium px-2.5 py-0.5 rounded`}>
        {type}
      </span>
    );
  };
  
  // Extract chart data from simulation results
  const getChartData = (strategyId: string) => {
    const simulation = simulationData.get(strategyId);
    if (!simulation) return { values: [], labels: [] };
    
    // For apy chart
    const apyValues = simulation.map(point => point.apy * 100);
    const labels = simulation.map(point => {
      const date = new Date(point.timestamp);
      return date.toLocaleDateString();
    });
    
    return { values: apyValues, labels };
  };
  
  // Calculate total portfolio stats
  const calculatePortfolioStats = () => {
    const totalAllocated = strategies.reduce((sum, s) => sum + s.usdcAllocated, 0);
    const totalDeployed = strategies.reduce((sum, s) => sum + s.usdcDeployed, 0);
    const avgApy = strategies.reduce((sum, s) => sum + (s.currentApy * s.usdcAllocated), 0) / totalAllocated;
    const activeCount = strategies.filter(s => s.isActive).length;
    
    return {
      totalAllocated,
      totalDeployed,
      deploymentRatio: totalDeployed / totalAllocated,
      avgApy,
      activeCount
    };
  };
  
  const portfolioStats = calculatePortfolioStats();

  return (
    <div className="min-h-screen bg-gray-900 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Advanced Delta Neutral Strategies</h1>
            <p className="text-gray-400 mt-1">Comprehensive off-chain strategy execution with enhanced risk management</p>
          </div>
          <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg !h-10" />
        </div>

        {/* Timeframe Selection */}
        <div className="flex justify-end mb-6">
          <div className="inline-flex bg-gray-800 rounded-lg p-1">
            {(['1d', '7d', '30d', '90d'] as const).map((option) => (
              <button
                key={option}
                className={`px-3 py-1 text-sm font-medium rounded ${
                  timeframe === option 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setTimeframe(option)}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Portfolio Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-gray-400 text-sm mb-1">Total Allocated</h3>
            <p className="text-2xl font-bold text-white">{formatCurrency(portfolioStats.totalAllocated)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-gray-400 text-sm mb-1">Total Deployed</h3>
            <p className="text-2xl font-bold text-white">{formatCurrency(portfolioStats.totalDeployed)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-gray-400 text-sm mb-1">Deployment Ratio</h3>
            <p className="text-2xl font-bold text-white">{formatPercent(portfolioStats.deploymentRatio)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-gray-400 text-sm mb-1">Avg APY</h3>
            <p className="text-2xl font-bold text-white">{formatPercent(portfolioStats.avgApy)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-gray-400 text-sm mb-1">Active Strategies</h3>
            <p className="text-2xl font-bold text-white">{portfolioStats.activeCount} / {strategies.length}</p>
          </div>
        </div>

        {/* Strategies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {strategies.map(strategy => {
            const chartData = getChartData(strategy.id);
            
            return (
              <div key={strategy.id} className={`bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 ${
                strategy.isActive ? 'border-green-500' : 'border-gray-700'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white">{strategy.name}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    strategy.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {strategy.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 mb-4">
                  {getTypeBadge(strategy.type)}
                  {getRiskBadge(strategy.risk)}
                </div>
                
                <p className="text-gray-400 text-sm mb-6 line-clamp-2">{strategy.description}</p>
                
                {/* APY Chart */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>APY Performance</span>
                    <span className="font-semibold text-white">
                      {formatPercent(strategy.currentApy)}
                    </span>
                  </div>
                  <LineChart 
                    data={chartData.values} 
                    labels={chartData.labels} 
                    color="rgb(59, 130, 246)"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
                  <div>
                    <p className="text-gray-400">Current APY</p>
                    <p className="text-white font-semibold">{formatPercent(strategy.currentApy)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Target APY</p>
                    <p className="text-white font-semibold">{formatPercent(strategy.targetApy)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Net Exposure</p>
                    <p className="text-white font-semibold">{formatPercent(strategy.netExposure)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Sharpe Ratio</p>
                    <p className="text-white font-semibold">{strategy.sharpeRatio.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-700 flex justify-between">
                  <button
                    onClick={() => {
                      const updated = [...strategies];
                      const index = updated.findIndex(s => s.id === strategy.id);
                      if (index >= 0) {
                        updated[index] = {
                          ...updated[index],
                          isActive: !updated[index].isActive
                        };
                        setStrategies(updated);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      strategy.isActive
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {strategy.isActive ? 'Pause Strategy' : 'Activate Strategy'}
                  </button>
                  
                  <button
                    onClick={() => setSelectedStrategy(strategy.id)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-white"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Strategy Button */}
        <div className="flex justify-center mb-8">
          <button
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
            onClick={() => alert('Custom strategy creation will be implemented')}
          >
            Create Custom Strategy
          </button>
        </div>

        {/* Strategy Details Modal */}
        {selectedStrategy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {(() => {
                    const strategy = strategies.find(s => s.id === selectedStrategy);
                    if (!strategy) return <p className="text-white">Strategy not found</p>;
                    
                    return (
                      <>
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="flex items-center gap-3">
                              <h2 className="text-2xl font-bold text-white">{strategy.name}</h2>
                              {getTypeBadge(strategy.type)}
                              {getRiskBadge(strategy.risk)}
                            </div>
                            <p className="text-gray-400 mt-1">{strategy.description}</p>
                          </div>
                          <button 
                            onClick={() => setSelectedStrategy(null)}
                            className="text-gray-400 hover:text-white p-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Left Column */}
                          <div>
                            <div className="mb-6">
                              <h3 className="text-white font-semibold text-lg mb-3">Performance Metrics</h3>
                              <div className="bg-gray-700 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-400 text-sm">Current APY</p>
                                    <p className="text-white font-semibold">{formatPercent(strategy.currentApy)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Target APY</p>
                                    <p className="text-white font-semibold">{formatPercent(strategy.targetApy)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Daily Yield</p>
                                    <p className="text-white font-semibold">{formatPercent(strategy.dailyYield)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">All-Time Yield</p>
                                    <p className="text-white font-semibold">{formatPercent(strategy.allTimeYield)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Sharpe Ratio</p>
                                    <p className="text-white font-semibold">{strategy.sharpeRatio.toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Max Drawdown</p>
                                    <p className="text-white font-semibold">{formatPercent(strategy.maxDrawdown)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Volatility</p>
                                    <p className="text-white font-semibold">{formatPercent(strategy.volatility)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Last Rebalanced</p>
                                    <p className="text-white font-semibold">
                                      {new Date(strategy.lastRebalancedAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mb-6">
                              <h3 className="text-white font-semibold text-lg mb-3">Allocation</h3>
                              <div className="bg-gray-700 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-400 text-sm">Total Allocated</p>
                                    <p className="text-white font-semibold">{formatCurrency(strategy.usdcAllocated)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Total Deployed</p>
                                    <p className="text-white font-semibold">{formatCurrency(strategy.usdcDeployed)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">In Reserve</p>
                                    <p className="text-white font-semibold">{formatCurrency(strategy.usdcInReserve)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Deployment Ratio</p>
                                    <p className="text-white font-semibold">
                                      {formatPercent(strategy.usdcDeployed / strategy.usdcAllocated)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right Column */}
                          <div>
                            <div className="mb-6">
                              <h3 className="text-white font-semibold text-lg mb-3">Exposure</h3>
                              <div className="bg-gray-700 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-400 text-sm">Long Exposure</p>
                                    <p className="text-white font-semibold">{formatCurrency(strategy.longExposure)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Short Exposure</p>
                                    <p className="text-white font-semibold">{formatCurrency(strategy.shortExposure)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Net Exposure</p>
                                    <p className={`font-semibold ${Math.abs(strategy.netExposure) < 0.02 ? 'text-green-400' : 'text-yellow-400'}`}>
                                      {formatCurrency(strategy.netExposure * strategy.usdcDeployed)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Hedge Ratio</p>
                                    <p className="text-white font-semibold">{formatPercent(strategy.hedgeRatio)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mb-6">
                              <h3 className="text-white font-semibold text-lg mb-3">Risk Parameters</h3>
                              <div className="bg-gray-700 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-400 text-sm">Risk Score</p>
                                    <p className="text-white font-semibold">{strategy.risk}/100</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Stop Loss</p>
                                    <p className="text-white font-semibold">{formatPercent(strategy.stopLossThreshold)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Take Profit</p>
                                    <p className="text-white font-semibold">{formatPercent(strategy.takeProfitThreshold)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Rebalance Threshold</p>
                                    <p className="text-white font-semibold">{formatPercent(strategy.rebalanceThreshold)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-sm">Max Slippage</p>
                                    <p className="text-white font-semibold">{formatPercent(strategy.maxSlippage)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-700">
                          <button
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                            onClick={() => setSelectedStrategy(null)}
                          >
                            Close
                          </button>
                          <button
                            className={`px-4 py-2 rounded-lg text-white ${
                              strategy.isActive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                            onClick={() => {
                              const updated = [...strategies];
                              const index = updated.findIndex(s => s.id === strategy.id);
                              if (index >= 0) {
                                updated[index] = {
                                  ...updated[index],
                                  isActive: !updated[index].isActive
                                };
                                setStrategies(updated);
                              }
                              setSelectedStrategy(null);
                            }}
                          >
                            {strategy.isActive ? 'Pause Strategy' : 'Activate Strategy'}
                          </button>
                          <button
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                            onClick={() => alert('Strategy editing will be implemented')}
                          >
                            Edit Strategy
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 