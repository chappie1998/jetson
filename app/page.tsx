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
            Maximize Your USDC Yield
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Jetson is a yield platform where users can swap USDC with synthetic 
            token USDS, leveraging delta neutral strategies to generate stable returns.
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
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">8-12%</div>
            <p className="text-gray-400">Average Annual Yield</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">$2.5M+</div>
            <p className="text-gray-400">Total Value Locked</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">99.9%</div>
            <p className="text-gray-400">Uptime Performance</p>
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
              Exchange your USDC stablecoins for synthetic USDS tokens at a 1:1 ratio. 
              Your USDC enters our yield-generating treasury.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="text-blue-500 text-3xl font-bold mb-4">02</div>
            <h3 className="text-xl font-semibold mb-3">Delta Neutral Strategies</h3>
            <p className="text-gray-400">
              Your USDC is allocated to multiple delta-neutral strategies that 
              minimize market exposure while maximizing yield.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="text-blue-500 text-3xl font-bold mb-4">03</div>
            <h3 className="text-xl font-semibold mb-3">Earn Yield</h3>
            <p className="text-gray-400">
              USDS holders earn yield through a combination of liquid staking, 
              lending markets, and hedged liquidity positions.
            </p>
          </div>
        </div>
      </section>

      {/* Strategy Types */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Our Delta Neutral Strategies</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-blue-500">
            <h3 className="text-xl font-semibold mb-3">Liquid Staking</h3>
            <p className="text-gray-400 mb-4">
              Stake crypto assets while hedging against price exposure using futures contracts. 
              This strategy captures staking rewards while neutralizing market risk.
            </p>
            <div className="text-blue-400 font-semibold">5-8% Annual Yield</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-purple-500">
            <h3 className="text-xl font-semibold mb-3">Lending Markets</h3>
            <p className="text-gray-400 mb-4">
              Deploy capital in lending protocols while hedging borrowed assets. 
              This leverages interest rate differentials for optimal yield.
            </p>
            <div className="text-blue-400 font-semibold">8-12% Annual Yield</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-indigo-500">
            <h3 className="text-xl font-semibold mb-3">Liquidity Provision</h3>
            <p className="text-gray-400 mb-4">
              Provide liquidity to DEXs while hedging against impermanent loss. 
              Earn trading fees and incentives with minimized downside.
            </p>
            <div className="text-blue-400 font-semibold">10-15% Annual Yield</div>
          </div>
        </div>
        <div className="text-center mt-10">
          <Link 
            href="/delta-neutral" 
            className="inline-block rounded-lg px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Explore Strategies
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
              A cutting-edge yield platform that lets you earn through delta-neutral 
              strategies while maintaining the stability of a stablecoin.
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
            <p>© 2023 Jetson. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 