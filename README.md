# USDS Swap

A simple token swap application for exchanging between USDC and USDS tokens on Solana.

## Overview

This project consists of:

1. A Solana program (smart contract) built with Anchor framework
2. A Next.js web interface for interacting with the contract
3. Advanced off-chain delta-neutral strategies for yield generation

The program provides functionality to:
- Initialize the program with the necessary configuration
- Swap USDC to USDS (1:1)
- Swap USDS to USDC (1:1)
- Generate yield through off-chain delta-neutral strategies

## Advanced Delta-Neutral Strategy Implementation

The platform features a comprehensive off-chain strategy management system that implements delta-neutral yield strategies:

- **Basis Trading**: Exploiting price differences between CEX and DEX venues
- **Funding Rate Harvesting**: Capturing funding payments from perpetual futures markets
- **Multi-Protocol Strategy**: Diversified approach across multiple platforms

Key improvements over similar platforms like Ethena:

1. **Advanced Risk Management**: Real-time monitoring of exposure, leverage, and collateralization
2. **Multi-Source Price Oracle**: Using median prices from multiple sources for reliability
3. **Dynamic Portfolio Rebalancing**: Adjusting positions based on market conditions and strategy parameters
4. **Performance Analytics**: Tracking metrics like Sharpe ratio, volatility, and drawdowns
5. **Strategy Diversification**: Spreading capital across multiple strategies to reduce risk

## Configuration

The application uses a central configuration file (`app/config.ts`) to manage important constants:

- Program IDs (USDS Swap, Token Program)
- Token mint addresses (USDC, USDS)
- PDA seeds for accounts
- Connection endpoint and other constants

You'll need to update these values according to your deployment environment (devnet, mainnet, etc).

## Development Setup

### Prerequisites

- Node.js (v14 or newer)
- Rust and Cargo
- Solana CLI tools
- Anchor framework

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/usds-swap.git
cd usds-swap
```

2. Install dependencies:
```bash
npm install
```

3. Build the program:
```bash
anchor build
```

4. Run the local development server for the web interface:
```bash
npm run dev
```

### Testing

Run tests for the Solana program:
```bash
anchor test
```

## Usage

1. Connect your Solana wallet (Phantom, Solflare, etc.)
2. Initialize the program if it hasn't been initialized yet
3. Enter the amount you want to swap
4. Choose the direction (USDC to USDS or USDS to USDC)
5. Complete the transaction
6. Access the Delta-Neutral and Advanced Strategies pages to manage yield strategies

## Project Structure

- `programs/usds-swap/` - Solana program written in Rust
- `app/` - Next.js frontend application
  - `components/` - React components for UI
  - `config.ts` - Application configuration
  - `hooks/` - Custom React hooks
  - `utils/` - Utility functions for Solana operations
  - `delta-neutral/` - Basic delta-neutral strategy UI
  - `advanced-strategies/` - Enhanced strategy management interface
- `tests/` - Program tests

## License

ISC

## Acknowledgments

- Solana Foundation
- Anchor Framework 

# USDs Swap Contract Commands

## Setup and Initialization

```bash
cd app
# Initialize the USDs token and mint authority
ts-node mint.ts

# Initialize the contract
ts-node initialize.ts
```

## Swap Operations

```bash
# Check balances of USDC, USDs, and treasury
ts-node swap.ts balances

# Swap USDC to USDs (1 USDC = 1000000 units with 6 decimals)
ts-node swap swap-usdc-to-usds 1000000

# Swap USDs to USDC (0.5 USDs = 500000 units with 6 decimals)
ts-node swap swap-usds-to-usdc 500000
```

## Notes

- Always use the same wallet for all operations
- The USDs token has 6 decimals (like USDC), so 1 USDs = 1000000 units
- You must have USDC in your wallet before swapping USDC to USDs
- On devnet, you may need to use the USDC management script to get test USDC