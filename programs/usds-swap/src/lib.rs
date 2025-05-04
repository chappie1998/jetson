use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

// Import the delta neutral strategy module
mod delta_neutral;
use delta_neutral::*;

declare_id!("AqFGP1Fs3nJ3Ue2Nc7RVZ1AUAad5AsEr4VBRJB2mEnk3");

#[program]
pub mod usds_swap {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.treasury_bump = ctx.bumps.treasury;
        config.mint_authority_bump = ctx.bumps.mint_authority;
        config.usds_mint = ctx.accounts.usds_mint.key();
        
        // Store the treasury token account address in the config
        config.treasury_token_account = ctx.accounts.treasury_token_account.key();

        Ok(())
    }

    pub fn swap_usdc_to_usds(ctx: Context<SwapUsdcToUsds>, amount: u64) -> Result<()> {
        // Transfer USDC from user to treasury token account
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Mint USDs to user
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.usds_mint.to_account_info(),
                    to: ctx.accounts.user_usds.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[&[b"mint-authority", &[ctx.accounts.config.mint_authority_bump]]],
            ),
            amount,
        )?;

        emit!(SwapEvent {
            user: ctx.accounts.user.key(),
            amount,
            swap_direction: SwapDirection::UsdcToUsds,
        });

        Ok(())
    }

    pub fn swap_usds_to_usdc(ctx: Context<SwapUsdsToUsdc>, amount: u64) -> Result<()> {
        // Burn USDs from user
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.usds_mint.to_account_info(),
                    from: ctx.accounts.user_usds.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Transfer USDC from treasury to user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.treasury_token_account.to_account_info(),
                    to: ctx.accounts.user_usdc.to_account_info(),
                    authority: ctx.accounts.treasury.to_account_info(),
                },
                &[&[b"treasury", &[ctx.accounts.config.treasury_bump]]],
            ),
            amount,
        )?;

        emit!(SwapEvent {
            user: ctx.accounts.user.key(),
            amount,
            swap_direction: SwapDirection::UsdsToUsdc,
        });

        Ok(())
    }

    // Delta Neutral Strategy Instructions

    // Initialize a new delta neutral strategy
    pub fn initialize_strategy(
        ctx: Context<InitializeStrategy>,
        strategy_type: StrategyType,
        allocation_percentage: u8,
        target_apy: u64,
        risk_score: u8,
        strategy_seed: String,
    ) -> Result<()> {
        // Validate inputs
        require!(allocation_percentage <= 100, DeltaNeutralError::InvalidAllocationPercentage);
        require!(risk_score <= 100, DeltaNeutralError::InvalidRiskScore);
        require!(target_apy > 0, DeltaNeutralError::InvalidTargetApy);
        
        let strategy = &mut ctx.accounts.strategy;
        let clock = Clock::get()?;
        
        // Initialize the strategy account
        strategy.authority = ctx.accounts.authority.key();
        strategy.strategy_type = strategy_type;
        strategy.state = StrategyState::Paused; // Start in paused state
        strategy.allocation_percentage = allocation_percentage;
        strategy.target_apy = target_apy;
        strategy.current_apy = 0;
        strategy.treasury = ctx.accounts.treasury.key();
        strategy.treasury_token_account = ctx.accounts.treasury_token_account.key();
        strategy.strategy_token_accounts = [Pubkey::default(); 5];
        strategy.strategy_data = [0; 1024];
        strategy.last_rebalance_ts = clock.unix_timestamp;
        strategy.risk_score = risk_score;
        strategy.created_at = clock.unix_timestamp;
        strategy.bump = *ctx.bumps.get("strategy").unwrap();

        // Initialize treasury stats if it's a new stats account
        if ctx.accounts.treasury_stats.total_usdc_deposited == 0 {
            ctx.accounts.treasury_stats.treasury = ctx.accounts.treasury.key();
            ctx.accounts.treasury_stats.treasury_authority = ctx.accounts.authority.key();
            ctx.accounts.treasury_stats.last_updated_ts = clock.unix_timestamp;
            ctx.accounts.treasury_stats.bump = *ctx.bumps.get("treasury_stats").unwrap();
        }
        
        // Update stats
        ctx.accounts.treasury_stats.strategies_count += 1;
        
        // Emit event
        emit!(StrategyInitializedEvent {
            strategy: ctx.accounts.strategy.key(),
            strategy_type,
            allocation_percentage,
            target_apy,
            risk_score,
            initialized_by: ctx.accounts.authority.key(),
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }

    // Activate a strategy to start generating yield
    pub fn activate_strategy(ctx: Context<UpdateStrategy>) -> Result<()> {
        let strategy = &mut ctx.accounts.strategy;
        let stats = &mut ctx.accounts.treasury_stats;
        let clock = Clock::get()?;
        
        // Check if strategy is already active
        require!(strategy.state != StrategyState::Active, DeltaNeutralError::StrategyAlreadyActive);
        
        // Update state
        let old_state = strategy.state;
        strategy.state = StrategyState::Active;
        strategy.last_rebalance_ts = clock.unix_timestamp;
        
        // Update stats
        stats.active_strategies_count += 1;
        stats.last_updated_ts = clock.unix_timestamp;
        
        // Emit event
        emit!(StrategyStateChangedEvent {
            strategy: ctx.accounts.strategy.key(),
            old_state,
            new_state: StrategyState::Active,
            timestamp: clock.unix_timestamp,
            performed_by: ctx.accounts.authority.key(),
        });
        
        Ok(())
    }

    // Pause a strategy temporarily 
    pub fn pause_strategy(ctx: Context<UpdateStrategy>) -> Result<()> {
        let strategy = &mut ctx.accounts.strategy;
        let stats = &mut ctx.accounts.treasury_stats;
        let clock = Clock::get()?;
        
        // Check if strategy is already paused or terminated
        require!(strategy.state == StrategyState::Active, DeltaNeutralError::StrategyNotActive);
        
        // Update state
        let old_state = strategy.state;
        strategy.state = StrategyState::Paused;
        
        // Update stats
        stats.active_strategies_count = stats.active_strategies_count.saturating_sub(1);
        stats.last_updated_ts = clock.unix_timestamp;
        
        // Emit event
        emit!(StrategyStateChangedEvent {
            strategy: ctx.accounts.strategy.key(),
            old_state,
            new_state: StrategyState::Paused,
            timestamp: clock.unix_timestamp,
            performed_by: ctx.accounts.authority.key(),
        });
        
        Ok(())
    }

    // Terminate a strategy permanently
    pub fn terminate_strategy(ctx: Context<UpdateStrategy>) -> Result<()> {
        let strategy = &mut ctx.accounts.strategy;
        let stats = &mut ctx.accounts.treasury_stats;
        let clock = Clock::get()?;
        
        // Update state
        let old_state = strategy.state;
        strategy.state = StrategyState::Terminated;
        
        // Update stats
        if old_state == StrategyState::Active {
            stats.active_strategies_count = stats.active_strategies_count.saturating_sub(1);
        }
        stats.last_updated_ts = clock.unix_timestamp;
        
        // Emit event
        emit!(StrategyStateChangedEvent {
            strategy: ctx.accounts.strategy.key(),
            old_state,
            new_state: StrategyState::Terminated,
            timestamp: clock.unix_timestamp,
            performed_by: ctx.accounts.authority.key(),
        });
        
        Ok(())
    }

    // Update strategy allocation percentage
    pub fn update_allocation(ctx: Context<UpdateStrategy>, new_allocation: u8) -> Result<()> {
        require!(new_allocation <= 100, DeltaNeutralError::InvalidAllocationPercentage);
        
        let strategy = &mut ctx.accounts.strategy;
        let stats = &mut ctx.accounts.treasury_stats;
        let clock = Clock::get()?;
        
        let old_allocation = strategy.allocation_percentage;
        strategy.allocation_percentage = new_allocation;
        stats.last_updated_ts = clock.unix_timestamp;
        
        // Emit event
        emit!(RebalanceEvent {
            strategy: ctx.accounts.strategy.key(),
            old_allocation,
            new_allocation,
            timestamp: clock.unix_timestamp,
            performed_by: ctx.accounts.authority.key(),
        });
        
        Ok(())
    }

    // Update strategy APY report
    pub fn update_apy(ctx: Context<UpdateStrategy>, new_apy: u64) -> Result<()> {
        let strategy = &mut ctx.accounts.strategy;
        let stats = &mut ctx.accounts.treasury_stats;
        let clock = Clock::get()?;
        
        let previous_apy = strategy.current_apy;
        strategy.current_apy = new_apy;
        stats.last_updated_ts = clock.unix_timestamp;
        
        // Emit event
        emit!(YieldReportEvent {
            strategy: ctx.accounts.strategy.key(),
            previous_apy,
            current_apy: new_apy,
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }

    // Report yield generation
    pub fn report_yield(
        ctx: Context<ReportYield>,
        yield_amount: u64,
        new_portfolio_value: u64
    ) -> Result<()> {
        let stats = &mut ctx.accounts.treasury_stats;
        let clock = Clock::get()?;
        
        stats.total_yield_generated = stats.total_yield_generated.saturating_add(yield_amount);
        stats.current_portfolio_value = new_portfolio_value;
        stats.last_updated_ts = clock.unix_timestamp;
        
        // Emit event
        emit!(YieldGeneratedEvent {
            treasury: ctx.accounts.treasury.key(),
            yield_amount,
            new_portfolio_value,
            timestamp: clock.unix_timestamp,
            reported_by: ctx.accounts.authority.key(),
        });
        
        Ok(())
    }
}

// Additional events for tracking strategy changes
#[event]
pub struct StrategyInitializedEvent {
    pub strategy: Pubkey,
    pub strategy_type: StrategyType,
    pub allocation_percentage: u8,
    pub target_apy: u64,
    pub risk_score: u8,
    pub initialized_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct StrategyStateChangedEvent {
    pub strategy: Pubkey,
    pub old_state: StrategyState,
    pub new_state: StrategyState,
    pub timestamp: i64,
    pub performed_by: Pubkey,
}

#[event]
pub struct YieldGeneratedEvent {
    pub treasury: Pubkey,
    pub yield_amount: u64,
    pub new_portfolio_value: u64,
    pub timestamp: i64,
    pub reported_by: Pubkey,
}

// Strategy account validation contexts
#[derive(Accounts)]
#[instruction(strategy_type: StrategyType, allocation_percentage: u8, target_apy: u64, risk_score: u8, strategy_seed: String)]
pub struct InitializeStrategy<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub config: Account<'info, Config>,
    
    #[account(
        seeds = [b"treasury"],
        bump = config.treasury_bump,
    )]
    /// CHECK: Treasury PDA for the delta neutral strategy
    pub treasury: UncheckedAccount<'info>,
    
    #[account(
        address = config.treasury_token_account
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = authority,
        space = Strategy::LEN,
        seeds = [b"strategy", treasury.key().as_ref(), strategy_seed.as_bytes()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,
    
    #[account(
        init_if_needed,
        payer = authority,
        space = TreasuryStats::LEN,
        seeds = [b"treasury-stats", treasury.key().as_ref()],
        bump
    )]
    pub treasury_stats: Account<'info, TreasuryStats>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateStrategy<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        constraint = strategy.authority == authority.key(),
    )]
    pub strategy: Account<'info, Strategy>,
    
    #[account(
        mut,
        seeds = [b"treasury-stats", strategy.treasury.as_ref()],
        bump = treasury_stats.bump,
    )]
    pub treasury_stats: Account<'info, TreasuryStats>,
}

#[derive(Accounts)]
pub struct ReportYield<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        seeds = [b"treasury"],
        bump,
    )]
    /// CHECK: Treasury PDA
    pub treasury: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"treasury-stats", treasury.key().as_ref()],
        bump = treasury_stats.bump,
    )]
    pub treasury_stats: Account<'info, TreasuryStats>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::LEN
    )]
    pub config: Account<'info, Config>,

    #[account(
        seeds = [b"treasury"],
        bump,
    )]
    /// CHECK: This is a PDA that will be the authority for the treasury token account
    pub treasury: UncheckedAccount<'info>,

    /// The token account that will hold USDC, owned by the treasury PDA
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"mint-authority"],
        bump,
    )]
    /// CHECK: This is a PDA that will have authority to mint USDs
    pub mint_authority: UncheckedAccount<'info>,

    pub usds_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SwapUsdcToUsds<'info> {
    pub user: Signer<'info>,

    pub config: Account<'info, Config>,

    #[account(
        mut,
        constraint = user_usdc.owner == user.key()
    )]
    pub user_usdc: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_usds.owner == user.key()
    )]
    pub user_usds: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"treasury"],
        bump = config.treasury_bump,
    )]
    /// CHECK: This is the PDA that serves as the treasury authority
    pub treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        // Require this to be the same token account stored during initialization
        address = config.treasury_token_account
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"mint-authority"],
        bump = config.mint_authority_bump,
    )]
    /// CHECK: This is a PDA that has authority to mint USDs
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        address = config.usds_mint
    )]
    pub usds_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SwapUsdsToUsdc<'info> {
    pub user: Signer<'info>,

    pub config: Account<'info, Config>,

    #[account(
        mut,
        constraint = user_usdc.owner == user.key()
    )]
    pub user_usdc: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_usds.owner == user.key()
    )]
    pub user_usds: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"treasury"],
        bump = config.treasury_bump,
    )]
    /// CHECK: This is the PDA that serves as the treasury authority
    pub treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        // Require this to be the same token account stored during initialization
        address = config.treasury_token_account
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = config.usds_mint
    )]
    pub usds_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Config {
    pub treasury_bump: u8,
    pub mint_authority_bump: u8,
    pub usds_mint: Pubkey,
    pub treasury_token_account: Pubkey,  // Added field to store the treasury token account
}

impl Config {
    pub const LEN: usize = 1 + 1 + 32 + 32;  // Added 32 bytes for the treasury_token_account
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SwapDirection {
    UsdcToUsds,
    UsdsToUsdc,
}

#[event]
pub struct SwapEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub swap_direction: SwapDirection,
}

// Custom error types for the delta neutral strategy
#[error_code]
pub enum DeltaNeutralError {
    #[msg("Invalid allocation percentage. Must be between 0 and 100.")]
    InvalidAllocationPercentage,
    
    #[msg("Invalid risk score. Must be between 0 and 100.")]
    InvalidRiskScore,
    
    #[msg("Invalid target APY. Must be greater than 0.")]
    InvalidTargetApy,
    
    #[msg("Strategy is already active.")]
    StrategyAlreadyActive,
    
    #[msg("Strategy is not active.")]
    StrategyNotActive,
    
    #[msg("Strategy is terminated and cannot be modified.")]
    StrategyTerminated,
    
    #[msg("Insufficient treasury balance for the operation.")]
    InsufficientTreasuryBalance,
}