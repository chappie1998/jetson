'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection } from '@solana/web3.js';
import { OffChainStrategyExecutor, OffChainStrategy, DEFAULT_STRATEGIES } from '../utils/off-chain-strategy';
import { StrategyBacktester, BacktestResult } from '../utils/strategy-backtester';
import { RPC_ENDPOINT } from '../config';
import {
  InteractiveAreaChart,
  InteractiveBarChart,
  CombinedBarLineChart,
  DistributionChart,
  TimeRangeSelector
} from '../components/InteractiveCharts';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

export default function StrategyBacktestPage() {
  const { connected } = useWallet();
  const [strategies, setStrategies] = useState<OffChainStrategy[]>([]);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBacktest, setRunningBacktest] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [backtestPeriod, setBacktestPeriod] = useState<'1m' | '3m' | '6m' | '1y'>('3m');
  const [chartTimeframe, setChartTimeframe] = useState<'all' | 'ytd' | '6m' | '3m' | '1m'>('all');
  
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
            id: `strategy-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            createdAt: Date.now(),
          })) as OffChainStrategy[];
          
          setStrategies(defaultList);
        } else {
          setStrategies(strategyList);
        }
      } catch (error) {
        console.error('Failed to initialize strategies:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeStrategies();
  }, []);
  
  // Run backtest when strategy or period changes
  useEffect(() => {
    if (strategies.length > 0 && !loading) {
      runBacktest();
    }
  }, [strategies, backtestPeriod]);
  
  // Run backtest for all strategies
  const runBacktest = async () => {
    if (runningBacktest) return;
    
    setRunningBacktest(true);
    try {
      const backtester = new StrategyBacktester();
      
      // Calculate date range based on selected period
      const endDate = new Date();
      let startDate: Date;
      
      switch (backtestPeriod) {
        case '1m':
          startDate = new Date(endDate);
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3m':
          startDate = new Date(endDate);
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6m':
          startDate = new Date(endDate);
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1y':
          startDate = new Date(endDate);
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }
      
      const results: BacktestResult[] = [];
      
      // Run backtest for each strategy
      for (const strategy of strategies) {
        console.log(`Running backtest for ${strategy.name} from ${startDate.toDateString()} to ${endDate.toDateString()}`);
        const result = await backtester.backtest(strategy, startDate, endDate);
        results.push(result);
      }
      
      setBacktestResults(results);
      
      // Select first strategy by default if none selected
      if (!selectedStrategyId && results.length > 0) {
        setSelectedStrategyId(results[0].strategyId);
      }
    } catch (error) {
      console.error('Error running backtest:', error);
    } finally {
      setRunningBacktest(false);
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
  
  // Get the selected backtest result
  const getSelectedResult = (): BacktestResult | undefined => {
    return backtestResults.find(result => result.strategyId === selectedStrategyId);
  };
  
  // Apply timeframe filter to chart data
  const applyTimeframeFilter = (data, dateField) => {
    if (chartTimeframe === 'all' || !data.length) return data;
    
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (chartTimeframe) {
      case 'ytd':
        cutoffDate = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
        break;
      case '6m':
        cutoffDate = new Date(now);
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '3m':
        cutoffDate = new Date(now);
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '1m':
        cutoffDate = new Date(now);
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    return data.filter(item => new Date(item[dateField]) >= cutoffDate);
  };
  
  // Get chart data for portfolio value
  const getPortfolioValueData = (result?: BacktestResult) => {
    if (!result) return [];
    
    const chartData = result.dailyReturns.map(day => ({
      date: day.date,
      value: day.value,
    }));
    
    return applyTimeframeFilter(chartData, 'date');
  };
  
  // Get chart data for daily returns
  const getDailyReturnsData = (result?: BacktestResult) => {
    if (!result) return [];
    
    const chartData = result.dailyReturns.map(day => ({
      date: day.date,
      return: day.return * 100, // Convert to percentage
    }));
    
    return applyTimeframeFilter(chartData, 'date');
  };
  
  // Get chart data for monthly returns
  const getMonthlyReturnsData = (result?: BacktestResult) => {
    if (!result) return [];
    
    return result.monthlyReturns.map(month => ({
      month: month.month,
      return: month.return * 100, // Convert to percentage
    }));
  };
  
  // Get distribution data for returns
  const getReturnDistributionData = (result?: BacktestResult) => {
    if (!result) return [];
    
    // Group daily returns into buckets for distribution chart
    const returns = result.dailyReturns.map(day => day.return * 100);
    const buckets = {
      "<-5%": 0,
      "-5% to -3%": 0,
      "-3% to -1%": 0,
      "-1% to 0%": 0,
      "0% to 1%": 0,
      "1% to 3%": 0,
      "3% to 5%": 0,
      ">5%": 0,
    };
    
    returns.forEach(ret => {
      if (ret < -5) buckets["<-5%"]++;
      else if (ret < -3) buckets["-5% to -3%"]++;
      else if (ret < -1) buckets["-3% to -1%"]++;
      else if (ret < 0) buckets["-1% to 0%"]++;
      else if (ret < 1) buckets["0% to 1%"]++;
      else if (ret < 3) buckets["1% to 3%"]++;
      else if (ret < 5) buckets["3% to 5%"]++;
      else buckets[">5%"]++;
    });
    
    return Object.entries(buckets).map(([range, count]) => ({
      range,
      count,
      frequency: (count / returns.length) * 100
    }));
  };
  
  // Currency format for Y-axis
  const formatCurrencyForAxis = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };
  
  // Date format for X-axis
  const formatDateForAxis = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth()+1}/${date.getDate()}`;
  };
  
  const selectedResult = getSelectedResult();
  const portfolioValueData = getPortfolioValueData(selectedResult);
  const dailyReturnsData = getDailyReturnsData(selectedResult);
  const monthlyReturnsData = getMonthlyReturnsData(selectedResult);
  const distributionData = getReturnDistributionData(selectedResult);

  return (
    <div className="min-h-screen bg-gray-900 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Strategy Backtesting</h1>
            <p className="text-gray-400 mt-1">Test strategy performance using historical market data</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="inline-flex bg-gray-800 rounded-lg p-1">
              {(['1m', '3m', '6m', '1y'] as const).map((period) => (
                <button
                  key={period}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    backtestPeriod === period 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setBacktestPeriod(period)}
                >
                  {period.toUpperCase()}
                </button>
              ))}
            </div>
            <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg !h-10" />
          </div>
        </div>

        {/* Loading indicator */}
        {(loading || runningBacktest) && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-400">
              {loading ? 'Loading strategies...' : 'Running backtest...'}
            </p>
          </div>
        )}

        {/* Strategy Selection */}
        {!loading && backtestResults.length > 0 && (
          <div className="mb-8">
            <div className="bg-gray-800 rounded-xl p-4">
              <h2 className="text-white text-xl font-semibold mb-4">Select Strategy to Analyze</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {backtestResults.map(result => (
                  <button
                    key={result.strategyId}
                    className={`p-4 rounded-lg transition-colors ${
                      selectedStrategyId === result.strategyId
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    onClick={() => setSelectedStrategyId(result.strategyId)}
                  >
                    <div className="font-semibold">{result.strategyName}</div>
                    <div className="flex justify-between mt-2">
                      <span>Return</span>
                      <span className={result.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatPercent(result.totalReturn)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sharpe</span>
                      <span>{result.sharpeRatio.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Backtest Results */}
        {selectedResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Performance Metrics */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-xl p-6 mb-8">
                <h2 className="text-white text-xl font-semibold mb-4">Performance Summary</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Strategy Type</span>
                    <span className="text-white font-medium">{selectedResult.strategyType}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Test Period</span>
                    <span className="text-white font-medium">
                      {selectedResult.startDate.toLocaleDateString()} - {selectedResult.endDate.toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Initial Value</span>
                    <span className="text-white font-medium">{formatCurrency(selectedResult.initialValue)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Final Value</span>
                    <span className="text-white font-medium">{formatCurrency(selectedResult.finalValue)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Return</span>
                    <span className={`font-medium ${selectedResult.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercent(selectedResult.totalReturn)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Annualized Return</span>
                    <span className={`font-medium ${selectedResult.annualizedReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercent(selectedResult.annualizedReturn)}
                    </span>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-700">
                    <h3 className="text-white font-medium mb-2">Risk Metrics</h3>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sharpe Ratio</span>
                        <span className="text-white">{selectedResult.sharpeRatio.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sortino Ratio</span>
                        <span className="text-white">{selectedResult.riskMetrics.sortinoRatio.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Calmar Ratio</span>
                        <span className="text-white">{selectedResult.riskMetrics.calmarRatio.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Volatility (Ann.)</span>
                        <span className="text-white">{formatPercent(selectedResult.volatility)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Max Drawdown</span>
                        <span className="text-white">{formatPercent(selectedResult.maxDrawdown)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Win Rate</span>
                        <span className="text-white">{formatPercent(selectedResult.winRate)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Beta to Market</span>
                        <span className="text-white">{selectedResult.riskMetrics.betaToMarket.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-700">
                    <h3 className="text-white font-medium mb-2">Exposure Stats</h3>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg Net Exposure</span>
                        <span className="text-white">{formatPercent(selectedResult.exposureStats.avgNetExposure)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Max Net Exposure</span>
                        <span className="text-white">{formatPercent(selectedResult.exposureStats.maxNetExposure)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg Hedge Ratio</span>
                        <span className="text-white">{formatPercent(selectedResult.exposureStats.avgHedgeRatio)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Charts */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-xl p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-white text-xl font-semibold">Portfolio Value</h2>
                  <TimeRangeSelector 
                    timeframe={chartTimeframe} 
                    onChange={setChartTimeframe}
                  />
                </div>
                
                <InteractiveAreaChart 
                  data={portfolioValueData}
                  dataKey="value"
                  name="Portfolio Value"
                  color="#3b82f6"
                  height={250}
                  valuePrefix="$"
                  yAxisFormatter={formatCurrencyForAxis}
                  xAxisFormatter={formatDateForAxis}
                  showBrush={true}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-800 rounded-xl p-6">
                  <h2 className="text-white text-xl font-semibold mb-4">Daily Returns</h2>
                  <CombinedBarLineChart 
                    data={dailyReturnsData}
                    barDataKey="return"
                    barName="Daily Return"
                    lineName="Trend"
                    height={200}
                    valueSuffix="%"
                    xAxisFormatter={formatDateForAxis}
                    yAxisFormatter={(value) => `${value.toFixed(1)}%`}
                  />
                </div>
                
                <div className="bg-gray-800 rounded-xl p-6">
                  <h2 className="text-white text-xl font-semibold mb-4">Monthly Returns</h2>
                  <InteractiveBarChart 
                    data={monthlyReturnsData}
                    dataKey="return"
                    xAxisKey="month"
                    name="Monthly Return"
                    height={200}
                    valueSuffix="%"
                    yAxisFormatter={(value) => `${value.toFixed(1)}%`}
                    colorByValue={true}
                    positiveColor="#a855f7"
                  />
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-white text-xl font-semibold mb-4">Return Distribution</h2>
                {distributionData.length > 0 ? (
                  <DistributionChart 
                    data={distributionData}
                    height={250}
                  />
                ) : (
                  <p className="text-center text-gray-400 py-10">
                    {runningBacktest 
                      ? "Generating distribution data..." 
                      : "Distribution data not available"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 