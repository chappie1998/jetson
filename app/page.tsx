'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-68px)] bg-gray-900 text-white">
      {/* Hero Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
            AI-Powered Yield Optimization
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Jetson is a next-generation yield platform that supercharges your USDC returns 
            with AI-enhanced delta-neutral strategies, outperforming traditional yield solutions.
          </p>
          <div className="mt-10 flex flex-col md:flex-row items-center justify-center gap-6">
            <Link 
              href="/swap" 
              className="rounded-lg px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-lg w-full md:w-auto text-center"
            >
              Swap Tokens
            </Link>
            <Link 
              href="/delta-neutral" 
              className="rounded-lg px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium text-lg w-full md:w-auto text-center"
            >
              View Yield Strategies
            </Link>
            <Link 
              href="/how-it-works" 
              className="rounded-lg px-6 py-3 border border-blue-500 text-blue-500 hover:bg-blue-500/10 font-medium text-lg w-full md:w-auto text-center"
            >
              How It Works
            </Link>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">20-30%</div>
            <p className="text-gray-400">AI-Enhanced Annual Yield</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">$2.5M+</div>
            <p className="text-gray-400">Total Value Locked</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">3X</div>
            <p className="text-gray-400">Outperforming Competitors</p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">How Jetson Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="text-blue-500 text-3xl font-bold mb-4">01</div>
            <h3 className="text-xl font-semibold mb-3">Swap USDC for USDS</h3>
            <p className="text-gray-400">
              Exchange your USDC for our synthetic USDS tokens at a 1:1 ratio.
              Your capital enters our AI-powered yield generation engine.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="text-blue-500 text-3xl font-bold mb-4">02</div>
            <h3 className="text-xl font-semibold mb-3">AI Strategy Optimization</h3>
            <p className="text-gray-400">
              Our proprietary AI models continuously analyze market conditions to 
              dynamically allocate capital across optimized delta-neutral strategies.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="text-blue-500 text-3xl font-bold mb-4">03</div>
            <h3 className="text-xl font-semibold mb-3">Enhanced Returns</h3>
            <p className="text-gray-400">
              USDS holders earn industry-leading yields through AI-optimized funding rate arbitrage,
              perpetual futures strategies, and predictive market positioning.
            </p>
          </div>
        </div>
      </section>

      {/* Advantage Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto bg-gray-800/30 rounded-3xl">
        <h2 className="text-3xl font-bold text-center mb-6">The Jetson Advantage</h2>
        <p className="text-center text-gray-300 max-w-3xl mx-auto mb-12">
          While platforms like Ethena offer basic delta-neutral strategies with 8-10% yields,
          Jetson leverages advanced AI and machine learning to deliver significantly higher returns.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-blue-500">
            <h3 className="text-xl font-semibold mb-3">Predictive Market Intelligence</h3>
            <p className="text-gray-400">
              Our AI system analyzes terabytes of market data to predict funding rate trends and
              optimal entry/exit points, maximizing yield while maintaining delta neutrality.
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-purple-500">
            <h3 className="text-xl font-semibold mb-3">Multi-Chain Optimization</h3>
            <p className="text-gray-400">
              Unlike single-chain solutions, Jetson automatically allocates capital across
              multiple blockchains to capture the highest yields and arbitrage opportunities.
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-indigo-500">
            <h3 className="text-xl font-semibold mb-3">Real-time Strategy Adaptation</h3>
            <p className="text-gray-400">
              Our strategies continuously adapt to market conditions, optimizing for 
              maximum returns while dynamically adjusting risk parameters.
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-green-500">
            <h3 className="text-xl font-semibold mb-3">Backtested Performance</h3>
            <p className="text-gray-400">
              Our strategies have been rigorously backtested across multiple market cycles,
              demonstrating consistent outperformance over traditional yield platforms.
            </p>
          </div>
        </div>
        <div className="text-center mt-6">
          <Link 
            href="/how-it-works" 
            className="inline-block rounded-lg px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium"
          >
            Learn More About Our Technology
          </Link>
        </div>
      </section>

      {/* Strategy Types */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Our AI-Enhanced Strategies</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-blue-500">
            <h3 className="text-xl font-semibold mb-3">Perpetual Funding Rate Arbitrage</h3>
            <p className="text-gray-400 mb-4">
              Our AI predicts optimal funding rate cycles across exchanges, leveraging
              delta-neutral positions to capture funding without directional exposure.
            </p>
            <div className="text-blue-400 font-semibold">15-25% Annual Yield</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-purple-500">
            <h3 className="text-xl font-semibold mb-3">Dynamic Basis Trading</h3>
            <p className="text-gray-400 mb-4">
              Exploit futures basis spreads with AI-timed entries and exits,
              maximizing returns while maintaining perfect hedge ratios.
            </p>
            <div className="text-blue-400 font-semibold">18-30% Annual Yield</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-indigo-500">
            <h3 className="text-xl font-semibold mb-3">Volatility Harvesting</h3>
            <p className="text-gray-400 mb-4">
              Our AI identifies optimal volatility conditions to deploy specialized
              options-based strategies that capture premium while remaining delta-neutral.
            </p>
            <div className="text-blue-400 font-semibold">20-40% Annual Yield</div>
          </div>
        </div>
        <div className="text-center mt-10">
          <Link 
            href="/strategy-backtest" 
            className="inline-block rounded-lg px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Explore Strategy Performance
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-800 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="mb-6">
              <span className="text-white font-bold text-2xl">Jetson</span>
            </div>
            <p className="text-gray-400 max-w-lg mx-auto mb-8">
              The next evolution in DeFi yield generation, delivering AI-enhanced returns
              through sophisticated delta-neutral strategies and predictive market intelligence.
            </p>
            <div className="flex justify-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-white">
                Twitter
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                Discord
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                GitHub
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                Documentation
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-500">
            <p>© 2025 Jetson. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 