'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function Navigation() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  return (
    <nav className="bg-gray-800 px-6 py-4 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <span className="text-white font-bold text-xl">Jetson</span>
            <span className="ml-2 bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded">BETA</span>
          </Link>
          
          <div className="hidden md:flex ml-10 space-x-6">
            <NavLink href="/swap" active={isActive('/swap')}>Swap</NavLink>
            <NavLink href="/delta-neutral" active={isActive('/delta-neutral')}>Yield Strategies</NavLink>
            <NavLink href="/how-it-works" active={isActive('/how-it-works')}>How It Works</NavLink>
            <NavLink href="/soladn-pool" active={isActive('/soladn-pool')}>SolaDN Pool</NavLink>
            <NavLink href="/funding-strategy" active={isActive('/funding-strategy')}>Funding Rate</NavLink>
            <NavLink href="/advanced-strategies" active={isActive('/advanced-strategies')}>Advanced Strategies</NavLink>
            <NavLink href="/strategy-backtest" active={isActive('/strategy-backtest')}>Backtest</NavLink>
          </div>
        </div>
        
        <div className="flex items-center">
          <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg !h-10" />
        </div>
      </div>
      
      {/* Mobile menu (shown only on small screens) */}
      <div className="md:hidden mt-4 flex space-x-4">
        <NavLink href="/swap" active={isActive('/swap')}>Swap</NavLink>
        <NavLink href="/delta-neutral" active={isActive('/delta-neutral')}>Yield</NavLink>
        <NavLink href="/how-it-works" active={isActive('/how-it-works')}>How It Works</NavLink>
        <NavLink href="/soladn-pool" active={isActive('/soladn-pool')}>SolaDN</NavLink>
        <NavLink href="/funding-strategy" active={isActive('/funding-strategy')}>Funding</NavLink>
        <NavLink href="/advanced-strategies" active={isActive('/advanced-strategies')}>Advanced</NavLink>
        <NavLink href="/strategy-backtest" active={isActive('/strategy-backtest')}>Backtest</NavLink>
      </div>
    </nav>
  );
}

interface NavLinkProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

function NavLink({ href, active, children }: NavLinkProps) {
  return (
    <Link href={href} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      active 
        ? 'bg-gray-900 text-white' 
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}>
      {children}
    </Link>
  );
} 