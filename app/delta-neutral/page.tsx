'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import { DeltaNeutralManager, StrategyType, DEFAULT_STRATEGIES } from '../utils/delta-neutral';
import { RPC_ENDPOINT, USDC_MINT, USDS_MINT } from '../config';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

export default function DeltaNeutralPage() {
  const { publicKey, signTransaction, connected } = useWallet();
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalDeposited: 0,
    totalYield: 0,
    avgApy: 0,
    activeStrategies: 0
  });

  // Create a mock connection since we're not using the manager yet
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // Initialize with default strategies for the UI
  useEffect(() => {
    // Convert the DEFAULT_STRATEGIES object to an array for display
    const defaultStrategiesArray = Object.values(DEFAULT_STRATEGIES).map(strategy => ({
      ...strategy,
      currentApy: getRandomApy(strategy.targetApy),
      tvl: getRandomTvl(strategy.maxAllocation)
    }));
    
    setStrategies(defaultStrategiesArray);
    
    // Update stats based on strategies
    calculateStats(defaultStrategiesArray);
  }, []);

  // Calculate strategy statistics
  const calculateStats = (strategiesArray: any[]) => {
    const activeStrategies = strategiesArray.filter(s => s.isActive);
    const totalTvl = strategiesArray.reduce((sum, s) => sum + (s.tvl || 0), 0);
    const totalYield = strategiesArray.reduce((sum, s) => sum + ((s.tvl || 0) * (s.currentApy / 10000)), 0);
    
    const weightedApy = totalTvl > 0 
      ? strategiesArray.reduce((sum, s) => sum + (s.currentApy * (s.tvl || 0) / totalTvl), 0) 
      : 0;
    
    setStats({
      totalDeposited: totalTvl,
      totalYield,
      avgApy: weightedApy,
      activeStrategies: activeStrategies.length
    });
  };

  // Helper functions to generate random data for demo
  function getRandomApy(targetApy: number) {
    // Random APY within ±20% of target
    const min = targetApy * 0.8;
    const max = targetApy * 1.2;
    return Math.floor(min + Math.random() * (max - min));
  }
  
  function getRandomTvl(maxAllocation: number) {
    // Random TVL between 10% and 70% of max allocation
    return Math.floor(maxAllocation * (0.1 + Math.random() * 0.6));
  }

  // Toggle strategy active state
  const toggleStrategy = (id: string) => {
    setStrategies(prev => 
      prev.map(s => 
        s.id === id ? { ...s, isActive: !s.isActive } : s
      )
    );
    
    // Recalculate stats
    setTimeout(() => {
      calculateStats(strategies);
    }, 0);
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

  // Format APY for display
  const formatApy = (basisPoints: number) => {
    return (basisPoints / 100).toFixed(2) + '%';
  };

  // Get strategy status badge
  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Active</span>
      : <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">Paused</span>;
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
  const getTypeBadge = (type: StrategyType) => {
    switch (type) {
      case StrategyType.LiquidStaking:
        return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Liquid Staking</span>;
      case StrategyType.Lending:
        return <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">Lending</span>;
      case StrategyType.LiquidityProvision:
        return <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded">Liquidity</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">Unknown</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Delta Neutral Strategies</h1>
          <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg !h-10" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-gray-400 text-sm mb-1">Total Deposits</h3>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalDeposited)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-gray-400 text-sm mb-1">Annual Yield</h3>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalYield)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-gray-400 text-sm mb-1">Average APY</h3>
            <p className="text-2xl font-bold text-white">{formatApy(stats.avgApy)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-gray-400 text-sm mb-1">Active Strategies</h3>
            <p className="text-2xl font-bold text-white">{stats.activeStrategies} / {strategies.length}</p>
          </div>
        </div>

        {/* Strategies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {strategies.map(strategy => (
            <div key={strategy.id} className={`bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 ${
              strategy.isActive ? 'border-green-500' : 'border-gray-700'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">{strategy.name}</h3>
                {getStatusBadge(strategy.isActive)}
              </div>
              
              <div className="flex items-center space-x-2 mb-4">
                {getTypeBadge(strategy.strategyType)}
                {getRiskBadge(strategy.riskScore)}
              </div>
              
              <p className="text-gray-400 text-sm mb-4">{strategy.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-xs">Current APY</p>
                  <p className="text-lg font-bold text-white">{formatApy(strategy.currentApy)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Total Value Locked</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(strategy.tvl)}</p>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between">
                <button
                  onClick={() => toggleStrategy(strategy.id)}
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
          ))}
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
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-white">
                  {strategies.find(s => s.id === selectedStrategy)?.name} Details
                </h2>
                <button 
                  onClick={() => setSelectedStrategy(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Strategy details would go here */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-gray-400 text-sm">Description</h3>
                  <p className="text-white">{strategies.find(s => s.id === selectedStrategy)?.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-gray-400 text-sm">Target APY</h3>
                    <p className="text-white">{formatApy(strategies.find(s => s.id === selectedStrategy)?.targetApy || 0)}</p>
                  </div>
                  <div>
                    <h3 className="text-gray-400 text-sm">Current APY</h3>
                    <p className="text-white">{formatApy(strategies.find(s => s.id === selectedStrategy)?.currentApy || 0)}</p>
                  </div>
                  <div>
                    <h3 className="text-gray-400 text-sm">Risk Score</h3>
                    <p className="text-white">{strategies.find(s => s.id === selectedStrategy)?.riskScore}/100</p>
                  </div>
                  <div>
                    <h3 className="text-gray-400 text-sm">Allocation</h3>
                    <p className="text-white">{strategies.find(s => s.id === selectedStrategy)?.allocationPercentage}%</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-gray-400 text-sm mb-2">Protocols</h3>
                  <div className="space-y-2">
                    {strategies.find(s => s.id === selectedStrategy)?.protocols.map((protocol: any) => (
                      <div key={protocol.name} className="bg-gray-700 p-3 rounded-lg flex justify-between">
                        <div>
                          <p className="text-white font-medium">{protocol.name}</p>
                          <p className="text-gray-400 text-xs">{protocol.address.slice(0, 8)}...{protocol.address.slice(-8)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{protocol.apy}% APY</p>
                          <p className="text-gray-400 text-xs">{protocol.weight}% Allocation</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-gray-400 text-sm mb-2">Advanced Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-xs">Rebalance Threshold</p>
                      <p className="text-white">{strategies.find(s => s.id === selectedStrategy)?.rebalanceThreshold}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Rebalance Frequency</p>
                      <p className="text-white">{(strategies.find(s => s.id === selectedStrategy)?.rebalanceFrequency / 3600).toFixed(1)} hours</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Hedge Ratio</p>
                      <p className="text-white">{strategies.find(s => s.id === selectedStrategy)?.hedgeRatio}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Leverage Ratio</p>
                      <p className="text-white">{strategies.find(s => s.id === selectedStrategy)?.leverageRatio}x</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                    onClick={() => setSelectedStrategy(null)}
                  >
                    Close
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                    onClick={() => alert('Strategy editing will be implemented')}
                  >
                    Edit Strategy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 