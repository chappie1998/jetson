'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import { swapTokens } from '../utils/swap';
import { RPC_ENDPOINT, USDC_MINT, USDS_MINT } from '../config';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

export default function SwapPage() {
  const { publicKey, signTransaction, connected } = useWallet();
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [usdsBalance, setUsdsBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [swapDirection, setSwapDirection] = useState<'usdc-to-usds' | 'usds-to-usdc'>('usdc-to-usds');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [receiveAmount, setReceiveAmount] = useState<number>(1); // Estimated amount to receive

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // Calculate receive amount with a simulated price impact
  useEffect(() => {
    // Simple 1:1 conversion with a small fee/slippage
    const fee = amount * 0.003; // 0.3% fee
    setReceiveAmount(amount - fee);
  }, [amount, swapDirection]);

  const fetchBalances = useCallback(async () => {
    if (!publicKey) return;

    try {
      // Fetch USDC balance
      const usdcTokenAddress = await PublicKey.findProgramAddressSync(
        [
          publicKey.toBuffer(),
          new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
          USDC_MINT.toBuffer()
        ],
        new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
      )[0];

      try {
        const usdcAccount = await connection.getTokenAccountBalance(usdcTokenAddress);
        setUsdcBalance(parseFloat(usdcAccount.value.uiAmount?.toString() || '0'));
      } catch (e) {
        console.log('USDC account not found, likely not created yet');
        setUsdcBalance(0);
      }

      // Fetch USDS balance
      const usdsTokenAddress = await PublicKey.findProgramAddressSync(
        [
          publicKey.toBuffer(),
          new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
          USDS_MINT.toBuffer()
        ],
        new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
      )[0];

      try {
        const usdsAccount = await connection.getTokenAccountBalance(usdsTokenAddress);
        setUsdsBalance(parseFloat(usdsAccount.value.uiAmount?.toString() || '0'));
      } catch (e) {
        console.log('USDS account not found, likely not created yet');
        setUsdsBalance(0);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      setError('Failed to fetch balances');
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalances();
    }
  }, [connected, publicKey, fetchBalances]);

  const handleSwap = async () => {
    setError(null);
    setTxSignature(null);
    
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (!signTransaction) {
      setError('Wallet does not support transaction signing');
      return;
    }

    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Check if user has enough balance
    if (swapDirection === 'usdc-to-usds' && (usdcBalance || 0) < amount) {
      setError('Insufficient USDC balance');
      return;
    } else if (swapDirection === 'usds-to-usdc' && (usdsBalance || 0) < amount) {
      setError('Insufficient USDS balance');
      return;
    }

    setLoading(true);
    try {
      const signature = await swapTokens(
        connection,
        publicKey,
        amount,
        swapDirection,
        signTransaction
      );
      
      setTxSignature(signature);
      // Refresh balances
      await fetchBalances();
    } catch (error: any) {
      console.error('Swap error:', error);
      
      let errorMsg = 'Transaction failed';
      
      // Check if it's a SendTransactionError
      if (error.logs) {
        console.error('Transaction logs:', error.logs);
        errorMsg += ': ' + extractErrorFromLogs(error.logs);
      } else if (error.message) {
        errorMsg += ': ' + error.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const extractErrorFromLogs = (logs: string[]): string => {
    // Try to extract the error message from the logs
    for (const log of logs) {
      if (log.includes('Error Message:')) {
        return log.split('Error Message:')[1].trim();
      }
    }
    return 'Unknown error';
  };

  const toggleSwapDirection = () => {
    setSwapDirection(
      swapDirection === 'usdc-to-usds' ? 'usds-to-usdc' : 'usdc-to-usds'
    );
    setAmount(1); // Reset amount when switching direction
  };

  const getMaxAmount = () => {
    if (swapDirection === 'usdc-to-usds') {
      return usdcBalance || 0;
    } else {
      return usdsBalance || 0;
    }
  };

  const handleMaxClick = () => {
    setAmount(getMaxAmount());
  };

  return (
    <div className="min-h-screen bg-gray-900 py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">USDS Swap</h1>
          <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg !h-10" />
        </div>
        
        {/* Swap Card */}
        <div className="bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-700">
          <div className="text-center mb-4">
            <h2 className="text-white text-lg font-medium">Swap Tokens</h2>
          </div>
          
          {/* From Token Input */}
          <div className="bg-gray-700 rounded-xl p-4 mb-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">From</span>
              <span className="text-gray-400 text-sm">
                Balance: {swapDirection === 'usdc-to-usds' 
                  ? usdcBalance !== null ? usdcBalance.toFixed(6) : 'Loading...' 
                  : usdsBalance !== null ? usdsBalance.toFixed(6) : 'Loading...'}
              </span>
            </div>
            <div className="flex items-center">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="bg-transparent text-white text-xl w-full focus:outline-none"
                placeholder="0.0"
                min="0"
                step="0.000001"
              />
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleMaxClick}
                  className="text-blue-400 text-xs border border-blue-500 rounded-md px-2 py-1 hover:bg-blue-900/30"
                >
                  MAX
                </button>
                <div className="flex items-center bg-gray-600 rounded-lg px-3 py-2 text-white">
                  <span className="mr-2 text-xl">
                    {swapDirection === 'usdc-to-usds' ? '💵' : '💎'}
                  </span>
                  <span>{swapDirection === 'usdc-to-usds' ? 'USDC' : 'USDS'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Swap Direction Button */}
          <div className="flex justify-center -my-3 z-10 relative">
            <button
              onClick={toggleSwapDirection}
              className="bg-blue-600 p-2 rounded-full hover:bg-blue-700 transition-colors shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>
          
          {/* To Token Input */}
          <div className="bg-gray-700 rounded-xl p-4 mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">To (estimated)</span>
              <span className="text-gray-400 text-sm">
                Balance: {swapDirection === 'usdc-to-usds' 
                  ? usdsBalance !== null ? usdsBalance.toFixed(6) : 'Loading...' 
                  : usdcBalance !== null ? usdcBalance.toFixed(6) : 'Loading...'}
              </span>
            </div>
            <div className="flex items-center">
              <input
                type="number"
                value={receiveAmount}
                readOnly
                className="bg-transparent text-white text-xl w-full focus:outline-none"
                placeholder="0.0"
              />
              <div className="flex items-center bg-gray-600 rounded-lg px-3 py-2 text-white">
                <span className="mr-2 text-xl">
                  {swapDirection === 'usdc-to-usds' ? '💎' : '💵'}
                </span>
                <span>{swapDirection === 'usdc-to-usds' ? 'USDS' : 'USDC'}</span>
              </div>
            </div>
          </div>
          
          {/* Swap Details */}
          <div className="bg-gray-700/30 rounded-xl p-3 mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Price</span>
              <span className="text-white">1 {swapDirection === 'usdc-to-usds' ? 'USDC' : 'USDS'} ≈ 0.997 {swapDirection === 'usdc-to-usds' ? 'USDS' : 'USDC'}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-400">Slippage Tolerance</span>
              <span className="text-white">0.3%</span>
            </div>
          </div>
          
          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={loading || !connected || amount <= 0}
            className={`w-full py-4 rounded-xl text-lg font-semibold transition-colors ${
              loading || !connected || amount <= 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {!connected 
              ? 'Connect Wallet' 
              : loading 
                ? 'Swapping...' 
                : amount <= 0 
                  ? 'Enter Amount' 
                  : 'Swap'}
          </button>
        </div>
        
        {/* Notifications */}
        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-500 text-red-200 rounded-xl p-4">
            {error}
          </div>
        )}
        
        {txSignature && (
          <div className="mt-4 bg-green-900/50 border border-green-500 text-green-200 rounded-xl p-4">
            Transaction successful!{' '}
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-100"
            >
              View on explorer
            </a>
          </div>
        )}
      </div>
    </div>
  );
} 