'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center">How Jetson Works</h1>
        <p className="text-xl text-gray-300 text-center max-w-3xl mx-auto mb-16">
          A comprehensive guide to how Jetson achieves AI-enhanced delta-neutral yields
        </p>

        {/* Basic Example Section */}
        <div className="bg-gray-800 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6 text-blue-400">Basic Flow Example</h2>
          <ol className="space-y-6">
            <li className="flex">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 mr-4 mt-1">
                <span className="text-white font-bold">1</span>
              </div>
              <div>
                <p className="text-gray-200">A whitelisted user provides ~$100 of <span className="font-semibold text-blue-300">USDC</span> and receives ~100 newly-minted <span className="font-semibold text-blue-300">USDS</span> atomically in return, less the gas & execution costs to implement the hedge.</p>
              </div>
            </li>
            <li className="flex">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 mr-4 mt-1">
                <span className="text-white font-bold">2</span>
              </div>
              <div>
                <p className="text-gray-200">Slippage & execution fees are included in the price when <span className="font-semibold">minting</span> & <span className="font-semibold">redeeming</span>. Jetson earns no profit from the minting or redeeming of <span className="font-semibold text-blue-300">USDS</span>.</p>
              </div>
            </li>
            <li className="flex">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 mr-4 mt-1">
                <span className="text-white font-bold">3</span>
              </div>
              <div>
                <p className="text-gray-200">The protocol opens corresponding short perpetual positions across multiple assets and exchanges, with allocations optimized by our AI system for maximum yield and risk management.</p>
              </div>
            </li>
            <li className="flex">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 mr-4 mt-1">
                <span className="text-white font-bold">4</span>
              </div>
              <div>
                <p className="text-gray-200">The backing assets are transferred directly to Reflect Protocol's "Off Exchange Settlement" solution. Backing assets remain on-chain and custodied by off-exchange service providers to minimize counterparty risk.</p>
              </div>
            </li>
            <li className="flex">
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 mr-4 mt-1">
                <span className="text-white font-bold">5</span>
              </div>
              <div>
                <p className="text-gray-200">Jetson delegates, but never transfers custody of, backing assets to derivatives exchanges to margin the short perpetual hedging positions. Our AI system continuously monitors these positions to optimize funding rates.</p>
              </div>
            </li>
          </ol>
        </div>

        {/* Delta Neutrality Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Delta Neutrality</h2>
          <div className="bg-gray-800 rounded-xl p-8 mb-8">
            <p className="text-lg text-gray-300 mb-6">
              USDS derives its relative peg stability from executing automated and programmatic delta-neutral hedges with respect to the underlying backing assets.
            </p>
            <p className="text-lg text-gray-300 mb-6">
              Hedging the price change risk of the backing asset in the same size minimizes fluctuations in the backing asset price as the change in value of the backing assets is generally offset 1:1 by the change in value of the hedge.
            </p>
            <p className="text-lg text-gray-300">
              Since the backing assets can be perfectly hedged with a short position of equivalent notional, USDS only requires 1:1 "collateralization."
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Practical Example</h3>
              <p className="text-gray-300 mb-4">
                If a user deposits $1,000 USDC to mint USDS:
              </p>
              <ol className="space-y-3 text-gray-300">
                <li>1. Jetson holds $1,000 USDC as collateral</li>
                <li>2. The protocol opens a $1,000 short position on SOL perpetual futures</li>
                <li>3. If SOL price increases by 10%, our short position loses $100</li>
                <li>4. If SOL price decreases by 10%, our short position gains $100</li>
                <li>5. The net portfolio value remains stable at $1,000 regardless of SOL price movements</li>
                <li>6. The strategy collects funding rates when they're positive (shorts pay longs)</li>
              </ol>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Advantages Over Other Stablecoins</h3>
              <ul className="space-y-3 text-gray-300">
                <li>• No over-collateralization required (unlike DAI)</li>
                <li>• Not dependent on centralized stablecoin issuers</li>
                <li>• Scalable with market liquidity</li>
                <li>• Generates sustainable yield</li>
                <li>• Minimizes market risk exposure</li>
                <li>• AI-enhanced allocation optimizes returns</li>
              </ul>
            </div>
          </div>
        </div>

        {/* AI-Enhancement Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6">The AI Advantage</h2>
          <div className="bg-blue-900/30 rounded-xl p-8 mb-8 border border-blue-700">
            <h3 className="text-2xl font-bold mb-4 text-blue-400">How Our AI Works</h3>
            <p className="text-lg text-gray-300 mb-6">
              Unlike traditional delta-neutral platforms that rely on static strategies, Jetson employs advanced AI models to dynamically predict market conditions and optimize capital allocation.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 mr-4 mt-1">
                  <span className="text-white font-semibold">1</span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-blue-300 mb-2">Funding Rate Prediction</h4>
                  <p className="text-gray-300">
                    Our proprietary AI models analyze terabytes of historical and real-time market data to predict funding rate trends across multiple exchanges. This allows us to position capital in advance of funding rate changes, capturing significantly higher yields than static strategies.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 mr-4 mt-1">
                  <span className="text-white font-semibold">2</span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-blue-300 mb-2">Dynamic Capital Allocation</h4>
                  <p className="text-gray-300">
                    Based on AI predictions, the system automatically rebalances positions across different assets and exchanges to maximize yield while maintaining delta neutrality. The allocation optimization algorithm considers risk parameters, confidence scores, and predicted returns.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 mr-4 mt-1">
                  <span className="text-white font-semibold">3</span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-blue-300 mb-2">Risk Management</h4>
                  <p className="text-gray-300">
                    The AI continuously monitors market volatility and adjusts leverage and position sizes accordingly. During periods of high volatility, the system automatically reduces risk exposure and increases insurance fund allocations.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 mr-4 mt-1">
                  <span className="text-white font-semibold">4</span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-blue-300 mb-2">Continuous Learning</h4>
                  <p className="text-gray-300">
                    Our models are continuously trained on new market data, adapting to changing market regimes and improving prediction accuracy over time. This creates a compounding advantage as the system becomes increasingly effective.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Technical Implementation</h3>
              <p className="text-gray-300 mb-4">
                Our AI system combines multiple sophisticated components:
              </p>
              <ul className="space-y-3 text-gray-300">
                <li>• Large language models for pattern recognition</li>
                <li>• Time-series prediction algorithms</li>
                <li>• Statistical models as fallbacks</li>
                <li>• Risk-adjusted optimization algorithms</li>
                <li>• Real-time data processing pipelines</li>
                <li>• Multi-exchange data aggregation</li>
              </ul>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Performance Metrics</h3>
              <ul className="space-y-3 text-gray-300">
                <li>• 70%+ funding rate direction prediction accuracy</li>
                <li>• 20-30% annualized yields (vs. 8-12% for competitors)</li>
                <li>• Sharpe ratio &gt; 2.0</li>
                <li>• Max drawdown &lt; 5%</li>
                <li>• 99% strategy execution success rate</li>
                <li>• Near-perfect delta neutrality (±2% exposure)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Off Exchange Custody Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Off Exchange Custody</h2>
          <div className="bg-gray-800 rounded-xl p-8">
            <p className="text-lg text-gray-300 mb-6">
              Assets backing USDS remain in "Off-Exchange Settlement" institutional grade solutions at all times. The only time collateral flows between custody and exchange is to settle funding or realized P&L.
            </p>
            <p className="text-lg text-gray-300 mb-6">
              This enables Jetson to delegate/undelegate backing assets to centralized exchanges without being exposed to exchange-specific idiosyncratic risk.
            </p>
            <div className="bg-gray-700 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-blue-300 mb-2">Security Features</h4>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li>Multi-signature wallet requirements for all operations</li>
                <li>Time-locked withdrawals for large amounts</li>
                <li>Dedicated insurance fund to protect against extreme market events</li>
                <li>Regular third-party audits of all smart contracts and custody solutions</li>
                <li>Real-time monitoring of positions and backing assets</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Protocol Rewards Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Protocol Rewards</h2>
          <div className="bg-gray-800 rounded-xl p-8">
            <p className="text-lg text-gray-300 mb-6">
              sUSDS is the reward-accruing version of USDS. In order to receive rewards, users must stake their USDS to receive sUSDS.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-gray-700 rounded-lg p-5">
                <h3 className="text-xl font-bold mb-3 text-blue-400">Historical Performance</h3>
                <p className="text-gray-300 mb-2">Recent annualized rates:</p>
                <ul className="space-y-2 text-gray-300">
                  <li>• SOL funding rates averaged 14.2%</li>
                  <li>• ETH funding rates averaged 10.8%</li>
                  <li>• BTC funding rates averaged 9.5%</li>
                  <li>• sUSDS APY averaged 20-30%</li>
                </ul>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-5">
                <h3 className="text-xl font-bold mb-3 text-blue-400">Reward Sources</h3>
                <p className="text-gray-300 mb-2">Jetson earns protocol rewards from:</p>
                <ul className="space-y-2 text-gray-300">
                  <li>• Funding rates from short perpetual positions</li>
                  <li>• Optimized basis trading strategies</li>
                  <li>• Volatility harvesting during high-vol periods</li>
                  <li>• AI-enhanced entry/exit timing</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-900/30 rounded-xl p-6 border border-blue-700">
              <h3 className="text-xl font-bold mb-3 text-blue-400">AI-Enhanced Yields</h3>
              <p className="text-gray-300 mb-4">
                Our AI systems extract significantly higher yields than competitors through:
              </p>
              <ol className="space-y-3 text-gray-300">
                <li>1. <span className="font-semibold">Predictive Market Intelligence:</span> Analyzing terabytes of market data to predict funding rate trends and optimal entry/exit points</li>
                <li>2. <span className="font-semibold">Multi-Exchange Optimization:</span> Allocating capital across multiple exchanges to capture the highest yields and arbitrage opportunities</li>
                <li>3. <span className="font-semibold">Cross-Asset Correlation:</span> Understanding relationships between assets to maintain optimal hedge ratios</li>
                <li>4. <span className="font-semibold">Market Regime Detection:</span> Identifying different market conditions (ranging, trending, volatile) to adapt strategies accordingly</li>
              </ol>
            </div>
          </div>
        </div>
        
        {/* Risk Management Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Risk Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Funding Risk</h3>
              <p className="text-gray-300 mb-4">
                Funding rates can become negative, potentially creating costs rather than generating yield.
              </p>
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Mitigation</h4>
                <p className="text-gray-300">
                  Our AI predictors anticipate funding rate reversals, allowing the protocol to adjust positions before rates turn negative, or even switch to long positions where appropriate while maintaining overall delta neutrality.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Liquidation Risk</h3>
              <p className="text-gray-300 mb-4">
                Extreme market movements could lead to liquidation of hedging positions.
              </p>
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Mitigation</h4>
                <p className="text-gray-300">
                  Jetson maintains conservative leverage levels, uses cross-margin accounts, implements automatic deleveraging during high volatility, and maintains a dedicated insurance fund to prevent liquidations.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Custodial Risk</h3>
              <p className="text-gray-300 mb-4">
                Risks associated with asset custody and smart contract vulnerabilities.
              </p>
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Mitigation</h4>
                <p className="text-gray-300">
                  Off-exchange settlement solutions keep assets on-chain, multi-signature requirements for critical operations, regular security audits, and bug bounty programs.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Exchange Failure Risk</h3>
              <p className="text-gray-300 mb-4">
                Risk of a centralized exchange failure or insolvency.
              </p>
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Mitigation</h4>
                <p className="text-gray-300">
                  Jetson diversifies across multiple Tier-1 exchanges, limits exposure per exchange, and uses off-exchange settlement to minimize assets held directly on exchanges.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl p-10 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Earn Enhanced Yields?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Start earning AI-optimized returns with Jetson's delta-neutral strategies today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/swap" 
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-lg"
            >
              Mint USDS
            </Link>
            <Link 
              href="/strategy-backtest" 
              className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg text-lg"
            >
              View Strategy Performance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 