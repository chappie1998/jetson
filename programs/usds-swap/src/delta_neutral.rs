use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use super::*;

// Delta neutral strategy states
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum StrategyState {
    Active,
    Paused,
    Terminated
}

// Strategy types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum StrategyType {
    LiquidStaking,
    Lending,
    LiquidityProvision
}

// Strategy account that holds the configuration for a particular delta neutral strategy
#[account]
pub struct Strategy {
    pub authority: Pubkey,             // Authority who can update the strategy
    pub strategy_type: StrategyType,   // Type of strategy
    pub state: StrategyState,          // Current state of the strategy
    pub allocation_percentage: u8,     // Percentage of treasury allocated to this strategy (0-100)
    pub target_apy: u64,               // Target APY in basis points (e.g., 500 = 5%)
    pub current_apy: u64,              // Current APY in basis points
    pub treasury: Pubkey,              // Treasury PDA associated with this strategy
    pub treasury_token_account: Pubkey, // Treasury token account
    pub strategy_token_accounts: [Pubkey; 5], // Up to 5 token accounts used by this strategy
    pub strategy_data: [u8; 1024],     // Strategy-specific data
    pub last_rebalance_ts: i64,        // Timestamp of last rebalance
    pub risk_score: u8,                // Risk score from 1-100
    pub created_at: i64,               // Timestamp when the strategy was created
    pub bump: u8,                      // Bump seed for the strategy PDA
}

impl Strategy {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        1 +  // strategy_type
        1 +  // state
        1 +  // allocation_percentage
        8 +  // target_apy
        8 +  // current_apy
        32 + // treasury
        32 + // treasury_token_account
        (32 * 5) + // strategy_token_accounts
        1024 + // strategy_data
        8 +    // last_rebalance_ts
        1 +    // risk_score
        8 +    // created_at
        1;     // bump
}

// Rebalance event to track strategy rebalancing
#[event]
pub struct RebalanceEvent {
    pub strategy: Pubkey,
    pub old_allocation: u8,
    pub new_allocation: u8,
    pub timestamp: i64,
    pub performed_by: Pubkey,
}

// Yield report event
#[event]
pub struct YieldReportEvent {
    pub strategy: Pubkey,
    pub previous_apy: u64,
    pub current_apy: u64,
    pub timestamp: i64,
}

// Treasury statistics account
#[account]
pub struct TreasuryStats {
    pub total_usdc_deposited: u64,
    pub total_usdc_withdrawn: u64,
    pub total_yield_generated: u64,
    pub current_portfolio_value: u64,
    pub strategies_count: u8,
    pub active_strategies_count: u8,
    pub last_updated_ts: i64,
    pub treasury: Pubkey,
    pub treasury_authority: Pubkey,
    pub bump: u8,
}

impl TreasuryStats {
    pub const LEN: usize = 8 + // discriminator
        8 +  // total_usdc_deposited
        8 +  // total_usdc_withdrawn
        8 +  // total_yield_generated
        8 +  // current_portfolio_value
        1 +  // strategies_count
        1 +  // active_strategies_count
        8 +  // last_updated_ts
        32 + // treasury
        32 + // treasury_authority
        1;   // bump
}

// Strategy instruction handlers will be implemented in the main program module 