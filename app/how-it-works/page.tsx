'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function HowItWorksPage() {
  const [selectedSection, setSelectedSection] = useState('overview');

  const renderContent = () => {
    switch(selectedSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-blue-400">Platform Overview</h2>
            <p>
              Jetson is an AI-powered delta-neutral yield platform built on Solana that generates industry-leading returns
              through sophisticated market-neutral strategies. By combining cutting-edge artificial intelligence with
              battle-tested DeFi primitives, Jetson delivers consistent 20-30% yields while maintaining risk controls.
            </p>
            <p>
              Unlike traditional yield platforms that rely on simple arbitrage or lending, Jetson leverages proprietary
              AI models to predict market inefficiencies and optimize capital allocation across multiple strategies
              simultaneously.
            </p>
            <div className="bg-gray-800 rounded-xl p-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">Core Components</h3>
              <ul className="space-y-3">
                <li className="flex">
                  <div className="text-blue-400 mr-4">01</div>
                  <div>
                    <span className="font-medium">USDS Token</span> — Our synthetic dollar stablecoin backed by USDC
                  </div>
                </li>
                <li className="flex">
                  <div className="text-blue-400 mr-4">02</div>
                  <div>
                    <span className="font-medium">AI Prediction Engine</span> — Neural networks that forecast market conditions
                  </div>
                </li>
                <li className="flex">
                  <div className="text-blue-400 mr-4">03</div>
                  <div>
                    <span className="font-medium">Delta-Neutral Strategies</span> — Hedged positions across multiple markets
                  </div>
                </li>
                <li className="flex">
                  <div className="text-blue-400 mr-4">04</div>
                  <div>
                    <span className="font-medium">Risk Management System</span> — Insurance fund and exposure limits
                  </div>
                </li>
                <li className="flex">
                  <div className="text-blue-400 mr-4">05</div>
                  <div>
                    <span className="font-medium">SolaDN Protocol Integration</span> — Solana-based position management
                  </div>
                </li>
              </ul>
            </div>
          </div>
        );
        
      case 'ai':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-blue-400">The AI Advantage</h2>
            <p>
              At the core of Jetson's technology is a sophisticated AI system that analyzes vast amounts of market data to 
              identify opportunities and optimize strategy execution. This creates a sustainable edge that consistently
              outperforms traditional yield platforms.
            </p>
            
            <div className="bg-gray-800 rounded-xl p-6 mt-4">
              <h3 className="text-xl font-semibold mb-4">Funding Rate Prediction</h3>
              <p className="mb-4">
                Our primary AI model forecasts perpetual futures funding rates across major exchanges with remarkable accuracy.
                By analyzing terabytes of historical data, on-chain metrics, and market microstructure, the model can:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Predict funding rate trends 24-72 hours in advance</li>
                <li>Identify optimal entry and exit points for funding arbitrage</li>
                <li>Estimate confidence intervals for each prediction</li>
                <li>Adapt to shifting market regimes in real-time</li>
              </ul>
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium mb-2">Technical Details</h4>
                <p className="text-sm text-gray-300">
                  The FundingRatePredictor uses transformer-based neural networks trained on 5+ years of market data.
                  The system incorporates multiple data sources including exchange APIs, on-chain metrics, social sentiment,
                  and macroeconomic indicators to achieve 70-85% directional accuracy.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">Capital Allocation Optimization</h3>
              <p className="mb-4">
                The second critical AI component is our allocation optimizer. This system determines the optimal distribution
                of capital across multiple strategies and assets to maximize returns while adhering to strict risk parameters:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Dynamically weights allocations based on AI confidence scores</li>
                <li>Balances expected return against volatility and drawdown risk</li>
                <li>Maintains overall portfolio delta-neutrality within 2% tolerance</li>
                <li>Preserves sufficient liquidity for redemptions and rebalancing</li>
              </ul>
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium mb-2">Reinforcement Learning</h4>
                <p className="text-sm text-gray-300">
                  The allocation system utilizes reinforcement learning techniques where the model is rewarded for
                  risk-adjusted returns rather than absolute performance. This encourages conservative positioning
                  during uncertain conditions and aggressive deployment when high-confidence opportunities arise.
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'strategies':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-blue-400">Delta-Neutral Strategies</h2>
            <p>
              Jetson employs multiple delta-neutral strategies simultaneously, optimizing capital allocation based on
              market conditions and AI predictions. All strategies maintain market neutrality through careful hedging,
              ensuring protection against directional price movements.
            </p>
            
            <div className="bg-gray-800 rounded-xl p-6 mt-4">
              <h3 className="text-xl font-semibold mb-4">Perpetual Funding Rate Arbitrage</h3>
              <p className="mb-4">
                This flagship strategy captures the premium paid between long and short traders in perpetual futures markets.
                By taking opposing positions across different venues or assets, we generate consistent yield without directional risk.
              </p>
              <div className="p-4 bg-gray-700 rounded-lg mb-4">
                <h4 className="font-medium mb-1">Strategy Mechanics</h4>
                <p className="text-sm text-gray-300">
                  When funding rates for an asset (e.g., SOL) are positive, longs pay shorts a funding fee every 8 hours.
                  Jetson takes the short side of this trade on the perpetual market while simultaneously holding an equivalent
                  long position in spot or delta-neutral options, creating a market-neutral position that earns the funding rate.
                </p>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium mb-1">AI Enhancement</h4>
                <p className="text-sm text-gray-300">
                  Our AI predicts funding rate cycles and market regime shifts with 70-85% accuracy, allowing us to:
                  1) Enter positions before funding rate spikes occur
                  2) Increase allocation to assets with stable predicted funding
                  3) Exit positions before funding rates normalize
                  4) Optimize cross-exchange execution for maximum capital efficiency
                </p>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">Basis Trading</h3>
              <p className="mb-4">
                This strategy exploits the price difference between spot markets and futures contracts.
                By simultaneously buying spot and selling futures (or vice versa), we capture the convergence
                of prices as contracts approach expiration.
              </p>
              <div className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium mb-1">AI Enhancement</h4>
                <p className="text-sm text-gray-300">
                  Our AI identifies optimal basis trade opportunities by:
                  1) Predicting basis widening/narrowing periods based on market sentiment and liquidity
                  2) Calculating ideal position sizing based on predicted volatility
                  3) Optimizing entry/exit timing to maximize yield
                  4) Balancing capital allocation across multiple basis trades
                </p>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">Volatility Harvesting</h3>
              <p>
                This advanced strategy utilizes options to capitalize on market volatility without taking
                directional risk. Through precisely balanced position structures, we generate yield from option
                premium decay and volatility mean reversion.
              </p>
            </div>
          </div>
        );
        
      case 'reflect':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-blue-400">SolaDN Protocol Integration</h2>
            <p>
              Jetson leverages SolaDN Protocol's battle-tested Solana programs to execute delta-neutral strategies
              with high efficiency and minimal slippage. This integration combines SolaDN's robust execution layer
              with Jetson's proprietary AI to create a superior yield generation system.
            </p>
            
            <div className="bg-gray-800 rounded-xl p-6 mt-4">
              <h3 className="text-xl font-semibold mb-4">Architecture Overview</h3>
              <p className="mb-4">
                The integration utilizes several key components from SolaDN Protocol:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li><span className="font-medium">soladn-single-pool</span>: Manages the main liquidity pool and strategy execution</li>
                <li><span className="font-medium">soladn-tokenised-bonds</span>: Handles yield-generating instruments</li>
                <li><span className="font-medium">insurance-fund</span>: Provides protection against extreme market events</li>
                <li><span className="font-medium">ssm</span>: State management system for on-chain strategy data</li>
              </ul>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">AI-Enhanced Middleware</h3>
              <p className="mb-4">
                Jetson adds a proprietary AI middleware layer between user interfaces and SolaDN's Solana programs:
              </p>
              <div className="p-4 bg-gray-700 rounded-lg mb-4">
                <h4 className="font-medium mb-1">Integration Flow</h4>
                <ol className="list-decimal pl-6 space-y-1 text-sm text-gray-300">
                  <li>AI prediction models analyze market data and current funding rates</li>
                  <li>The AIEnhancedSolaDNManager optimizes position allocations based on predictions</li>
                  <li>Allocation optimizer determines ideal capital distribution across strategies</li>
                  <li>SolaDNPoolAdapter executes the optimized allocations via Solana transactions</li>
                  <li>Insurance fund reserves are dynamically adjusted based on market risk</li>
                  <li>Performance data is fed back to AI models to improve future predictions</li>
                </ol>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium mb-1">Technical Architecture</h4>
                <p className="text-sm text-gray-300">
                  The AIEnhancedSolaDNManager acts as the bridge between our prediction systems and SolaDN's
                  execution layer. It receives AI-generated predictions, calculates optimal position allocations,
                  and translates these into Solana transactions that interact with SolaDN's on-chain programs.
                  This architecture maintains the security benefits of SolaDN's audited code while enhancing it
                  with Jetson's predictive capabilities.
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'risk':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-blue-400">Risk Management</h2>
            <p>
              While Jetson's strategies aim for exceptional returns, we maintain a comprehensive risk management
              framework to ensure capital preservation and strategy resilience during adverse market conditions.
            </p>
            
            <div className="bg-gray-800 rounded-xl p-6 mt-4">
              <h3 className="text-xl font-semibold mb-4">Insurance Fund</h3>
              <p>
                5% of all deposited capital is allocated to an insurance fund that protects against extreme market events,
                smart contract vulnerabilities, and unexpected liquidations. This dedicated capital buffer ensures
                that even in worst-case scenarios, user funds maintain significant protection.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">Risk Parameters</h3>
              <ul className="space-y-3">
                <li className="flex">
                  <div className="text-blue-400 mr-4">•</div>
                  <div>
                    <span className="font-medium">Maximum Leverage:</span> 3x (conservative compared to 10-50x industry standard)
                  </div>
                </li>
                <li className="flex">
                  <div className="text-blue-400 mr-4">•</div>
                  <div>
                    <span className="font-medium">Minimum AI Confidence:</span> 65% required for position allocation
                  </div>
                </li>
                <li className="flex">
                  <div className="text-blue-400 mr-4">•</div>
                  <div>
                    <span className="font-medium">Max Allocation Per Asset:</span> 25% to ensure diversification
                  </div>
                </li>
                <li className="flex">
                  <div className="text-blue-400 mr-4">•</div>
                  <div>
                    <span className="font-medium">Rebalance Threshold:</span> 2% price change triggers position rebalancing
                  </div>
                </li>
                <li className="flex">
                  <div className="text-blue-400 mr-4">•</div>
                  <div>
                    <span className="font-medium">Net Delta Exposure Limit:</span> ±2% maximum portfolio exposure
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">Circuit Breakers</h3>
              <p className="mb-4">
                Automated safeguards prevent strategy execution during extreme market conditions:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Strategy execution pauses if market volatility exceeds 3 standard deviations</li>
                <li>Position sizes reduce automatically during low liquidity conditions</li>
                <li>Multi-signature authorization required for emergency protocol changes</li>
                <li>Insurance fund reserves increase during high volatility regimes</li>
              </ul>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">Backtesting & Scenario Analysis</h3>
              <p>
                All strategies undergo rigorous backtesting across multiple market regimes, including extreme events
                like the 2022 crypto collapse and 2020 COVID crash. Our AI models are trained to identify patterns
                preceding market dislocations and adjust positioning accordingly to preserve capital.
              </p>
            </div>
          </div>
        );
      
      default:
        return <div>Select a section to learn more</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600 mb-4">
            How Jetson Works
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            A deep dive into our AI-powered yield generation technology
          </p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar navigation */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 sticky top-6">
              <h2 className="text-xl font-semibold mb-6">Explore the Platform</h2>
              <nav className="space-y-2">
                {[
                  { id: 'overview', label: 'Platform Overview' },
                  { id: 'ai', label: 'AI Prediction Engine' },
                  { id: 'strategies', label: 'Delta-Neutral Strategies' },
                  { id: 'reflect', label: 'SolaDN Protocol Integration' },
                  { id: 'risk', label: 'Risk Management' },
                ].map((item) => (
                  <button
                    key={item.id}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedSection === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedSection(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              
              <div className="mt-8 pt-6 border-t border-gray-700">
                <Link
                  href="/soladn-pool"
                  className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg text-center"
                >
                  View Live Strategy
                </Link>
                
                <Link
                  href="/strategy-backtest"
                  className="block w-full mt-3 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg text-center"
                >
                  Try the Backtester
                </Link>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-xl p-8">
              {renderContent()}
            </div>
          </div>
        </div>
        
        <div className="mt-16 p-8 bg-gray-800 rounded-xl text-center">
          <h2 className="text-2xl font-bold mb-6">Ready to Experience AI-Enhanced Yields?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/swap"
              className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              Swap USDC for USDS
            </Link>
            <Link
              href="/delta-neutral"
              className="py-3 px-8 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg"
            >
              Explore Strategies
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 