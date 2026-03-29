#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, vec, Address, Env, IntoVal, Symbol, token::{Client as TokenClient},
};

#[derive(Clone, PartialEq, Eq)]
#[contracttype]
pub enum MarketOutcome {
    Unresolved,
    Yes,
    No,
    Invalid,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Oracle,
    CollateralToken,
    YesToken,
    NoToken,
    LpToken,
    Outcome,
    Resolved,
    TotalShares, // LP token total supply tracking if we use builtin token, but we deployed custom
}

#[contract]
pub struct PredictionMarket;

#[contractimpl]
impl PredictionMarket {
    pub fn init(
        e: Env,
        admin: Address,
        oracle: Address,
        collateral_token: Address,
        yes_token: Address,
        no_token: Address,
        lp_token: Address,
    ) {
        if e.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::Oracle, &oracle);
        e.storage().instance().set(&DataKey::CollateralToken, &collateral_token);
        e.storage().instance().set(&DataKey::YesToken, &yes_token);
        e.storage().instance().set(&DataKey::NoToken, &no_token);
        e.storage().instance().set(&DataKey::LpToken, &lp_token);
        e.storage().instance().set(&DataKey::Outcome, &MarketOutcome::Unresolved);
        e.storage().instance().set(&DataKey::Resolved, &false);
    }

    /// Add liquidity by providing collateral.
    /// The market mints an equal amount of YES and NO tokens into its own pool,
    /// and issues LP tokens to the provider.
    pub fn add_liquidity(e: Env, from: Address, collateral_amount: i128) {
        from.require_auth();
        if collateral_amount <= 0 { panic!("amount must be positive"); }
        if Self::is_resolved(&e) { panic!("market already resolved"); }

        let collateral = TokenClient::new(&e, &Self::get_collateral(&e));
        let yes = TokenClient::new(&e, &Self::get_yes(&e));
        let no = TokenClient::new(&e, &Self::get_no(&e));
        let lp = TokenClient::new(&e, &Self::get_lp(&e));

        // Transfer collateral from user to market
        collateral.transfer(&from, &e.current_contract_address(), &collateral_amount);

        // Mint YES and NO to market pool
        // Note: The market must be the admin of the YES and NO tokens
        // We use invoke_contract to call the custom `mint` function instead of standard `TokenClient`
        // as standard `TokenClient` doesn't strictly define `mint` interface for custom logic
        e.invoke_contract::<()>(&Self::get_yes(&e), &Symbol::new(&e, "mint"), vec![&e, e.current_contract_address().into_val(&e), collateral_amount.into_val(&e)]);
        e.invoke_contract::<()>(&Self::get_no(&e), &Symbol::new(&e, "mint"), vec![&e, e.current_contract_address().into_val(&e), collateral_amount.into_val(&e)]);

        // Calculate LP shares to mint
        let total_lp: i128 = e.invoke_contract(&Self::get_lp(&e), &Symbol::new(&e, "balance"), vec![&e, e.current_contract_address().into_val(&e)]); // Wait, total supply is sum of all balances.
        // It's better to manually track TotalShares
        let total_shares: i128 = e.storage().instance().get(&DataKey::TotalShares).unwrap_or(0);
        
        // Wait, how to track pool balances? The market's token balance is the pool balance.
        let pool_yes = yes.balance(&e.current_contract_address());
        let pool_no = no.balance(&e.current_contract_address());
        
        let shares_to_mint = if total_shares == 0 {
            collateral_amount
        } else {
            // (collateral_amount * total_shares) / total_pool_collateral_before_this_addition
            // Since pool_yes and pool_no were equal at start, the "collateral value" is essentially the original deposit amount
            // Actually, `pool_yes - collateral_amount` is the old balance.
            let old_yes = pool_yes - collateral_amount;
            // Let's use old_yes as the proxy for total liquidity for simplicity, or geometric mean:
            // Since we need integer math, taking geometric mean of old_yes and old_no requires sqrt.
            // But we know total_shares tracks it.
            if old_yes == 0 {
                collateral_amount
            } else {
                (collateral_amount * total_shares) / old_yes
            }
        };

        e.invoke_contract::<()>(&Self::get_lp(&e), &Symbol::new(&e, "mint"), vec![&e, from.into_val(&e), shares_to_mint.into_val(&e)]);
        e.storage().instance().set(&DataKey::TotalShares, &(total_shares + shares_to_mint));
    }

    /// User wants to pay `collateral_amount` to get YES tokens.
    /// This translates to:
    /// 1. Take `collateral_amount` from User.
    /// 2. Mint `collateral_amount` YES and NO tokens.
    /// 3. Add `collateral_amount` NO tokens to pool, take `YES` out.
    /// 4. Send `YES` (from pool) + `collateral_amount` YES (minted) to User.
    pub fn buy_yes(e: Env, from: Address, collateral_amount: i128, min_yes_out: i128) {
        from.require_auth();
        if collateral_amount <= 0 { panic!("amount must be positive"); }
        if Self::is_resolved(&e) { panic!("market already resolved"); }

        let collateral = TokenClient::new(&e, &Self::get_collateral(&e));
        let yes = TokenClient::new(&e, &Self::get_yes(&e));
        let no = TokenClient::new(&e, &Self::get_no(&e));

        collateral.transfer(&from, &e.current_contract_address(), &collateral_amount);

        // Mint to Market temporarily
        e.invoke_contract::<()>(&Self::get_yes(&e), &Symbol::new(&e, "mint"), vec![&e, e.current_contract_address().into_val(&e), collateral_amount.into_val(&e)]);
        e.invoke_contract::<()>(&Self::get_no(&e), &Symbol::new(&e, "mint"), vec![&e, e.current_contract_address().into_val(&e), collateral_amount.into_val(&e)]);

        // Pool balances before adding the NO
        let r_yes = yes.balance(&e.current_contract_address()) - collateral_amount;
        let r_no = no.balance(&e.current_contract_address()) - collateral_amount;

        // Add fee to the swap. 1% fee.
        let amount_in_with_fee = (collateral_amount * 99) / 100;

        // CPMM: (r_yes - out_yes) * (r_no + amount_in_with_fee) = r_yes * r_no
        // out_yes = r_yes - (r_yes * r_no) / (r_no + amount_in_with_fee)
        // Note: integer division truncates, so the pool gets slightly more (favorable rounding)
        let numerator = r_yes * r_no;
        let denominator = r_no + amount_in_with_fee;
        let p_out_yes = r_yes - (numerator / denominator);

        let total_yes_to_user = collateral_amount + p_out_yes;
        if total_yes_to_user < min_yes_out {
            panic!("slippage exceeded");
        }

    // Send YES to user
    yes.transfer(&e.current_contract_address(), &from, &total_yes_to_user);
    
    // NO tokens stay in the market (the pool absorbed them)
}

/// User wants to pay `collateral_amount` to get NO tokens.
/// This translates to:
/// 1. Take `collateral_amount` from User.
/// 2. Mint `collateral_amount` YES and NO tokens.
/// 3. Add `collateral_amount` YES tokens to pool, take `NO` out.
/// 4. Send `NO` (from pool) + `collateral_amount` NO (minted) to User.
pub fn buy_no(e: Env, from: Address, collateral_amount: i128, min_no_out: i128) {
    from.require_auth();
    if collateral_amount <= 0 { panic!("amount must be positive"); }
    if Self::is_resolved(&e) { panic!("market already resolved"); }

    let collateral = TokenClient::new(&e, &Self::get_collateral(&e));
    let yes = TokenClient::new(&e, &Self::get_yes(&e));
    let no = TokenClient::new(&e, &Self::get_no(&e));

    collateral.transfer(&from, &e.current_contract_address(), &collateral_amount);

    e.invoke_contract::<()>(&Self::get_yes(&e), &Symbol::new(&e, "mint"), vec![&e, e.current_contract_address().into_val(&e), collateral_amount.into_val(&e)]);
    e.invoke_contract::<()>(&Self::get_no(&e), &Symbol::new(&e, "mint"), vec![&e, e.current_contract_address().into_val(&e), collateral_amount.into_val(&e)]);

    // Pool balances before adding the YES
    let r_yes = yes.balance(&e.current_contract_address()) - collateral_amount;
    let r_no = no.balance(&e.current_contract_address()) - collateral_amount;

    // Add fee to the swap. 1% fee.
    let amount_in_with_fee = (collateral_amount * 99) / 100;

    // CPMM: (r_yes + amount_in_with_fee) * (r_no - out_no) = r_yes * r_no
    // out_no = r_no - (r_yes * r_no) / (r_yes + amount_in_with_fee)
    let numerator = r_yes * r_no;
    let denominator = r_yes + amount_in_with_fee;
    let p_out_no = r_no - (numerator / denominator);

    let total_no_to_user = collateral_amount + p_out_no;
    if total_no_to_user < min_no_out {
        panic!("slippage exceeded");
    }

    // Send NO to user
    no.transfer(&e.current_contract_address(), &from, &total_no_to_user);
}

    /// User wants `collateral_out` amount of collateral, by burning their YES tokens.
    /// This translates to:
    /// 1. User needs `collateral_out` NO tokens from the pool to pair with their YES tokens.
    /// 2. User swaps `x` YES for `collateral_out` NO in the pool.
    /// 3. User pairs the `collateral_out` NO with `collateral_out` YES to burn, getting collateral back.
    /// User pays: `x + collateral_out` YES total.
    pub fn sell_yes(e: Env, from: Address, collateral_out: i128, max_yes_in: i128) {
        from.require_auth();
        if collateral_out <= 0 { panic!("amount must be positive"); }
        if Self::is_resolved(&e) { panic!("market already resolved"); }

        let collateral = TokenClient::new(&e, &Self::get_collateral(&e));
        let yes = TokenClient::new(&e, &Self::get_yes(&e));
        let no = TokenClient::new(&e, &Self::get_no(&e));

        let r_yes = yes.balance(&e.current_contract_address());
        let r_no = no.balance(&e.current_contract_address());

        if collateral_out >= r_no {
            panic!("insufficient pool liquidity");
        }

        // Swap YES for NO: user needs `collateral_out` NO tokens.
        // We know (r_yes + x_fee) * (r_no - collateral_out) = r_yes * r_no
        // x_fee = (r_yes * r_no) / (r_no - collateral_out) - r_yes
        // x_fee is the amount in BEFORE fees. Since fee is 1%, x = (x_fee * 100) / 99.
        let numerator = r_yes * r_no;
        let denominator = r_no - collateral_out;
        
        // Because of integer division, (numerator / denominator) might be truncated, meaning x_fee is too small.
        // For safety, we round up: (numerator + denominator - 1) / denominator
        let division_ceil = (numerator + denominator - 1) / denominator;
        let mut x_fee = division_ceil - r_yes;
        if x_fee < 0 { x_fee = 0; }
        
        let x = (x_fee * 100 + 98) / 99; // ceil((x_fee * 100) / 99)

        let total_yes_in = x + collateral_out;
        if total_yes_in > max_yes_in {
            panic!("slippage exceeded");
        }

        // Move YES from user to market pool
        yes.transfer(&from, &e.current_contract_address(), &total_yes_in);

        // Internally matching `collateral_out` YES and `collateral_out` NO.
        // We burn them using the admin_burn method, since the market holds the NO, and YES was just sent there.
        e.invoke_contract::<()>(&Self::get_yes(&e), &Symbol::new(&e, "admin_burn"), vec![&e, e.current_contract_address().into_val(&e), collateral_out.into_val(&e)]);
        // NO tokens were already in the pool, we "subtract" them from the pool by burning them.
        e.invoke_contract::<()>(&Self::get_no(&e), &Symbol::new(&e, "admin_burn"), vec![&e, e.current_contract_address().into_val(&e), collateral_out.into_val(&e)]);

        // Send collateral to user
        collateral.transfer(&e.current_contract_address(), &from, &collateral_out);
    }

    /// Claim winnings if the market is resolved. All winning tokens can be redeemed 1:1 for Collateral.
    pub fn claim_winnings(e: Env, from: Address) {
        from.require_auth();
        let is_resolved: bool = e.storage().instance().get(&DataKey::Resolved).unwrap();
        if !is_resolved {
            panic!("market not resolved yet");
        }

        let outcome: MarketOutcome = e.storage().instance().get(&DataKey::Outcome).unwrap();
        let collateral = TokenClient::new(&e, &Self::get_collateral(&e));
        
        let yes = TokenClient::new(&e, &Self::get_yes(&e));
        let no = TokenClient::new(&e, &Self::get_no(&e));

        let user_yes = yes.balance(&from);
        let user_no = no.balance(&from);

        let mut payout = 0;

        if outcome == MarketOutcome::Yes {
            payout = user_yes;
            if user_yes > 0 {
                e.invoke_contract::<()>(&Self::get_yes(&e), &Symbol::new(&e, "burn"), vec![&e, from.into_val(&e), user_yes.into_val(&e)]);
            }
        } else if outcome == MarketOutcome::No {
            payout = user_no;
            if user_no > 0 {
                e.invoke_contract::<()>(&Self::get_no(&e), &Symbol::new(&e, "burn"), vec![&e, from.into_val(&e), user_no.into_val(&e)]);
            }
        } else if outcome == MarketOutcome::Invalid {
            if user_yes > 0 {
                e.invoke_contract::<()>(&Self::get_yes(&e), &Symbol::new(&e, "burn"), vec![&e, from.into_val(&e), user_yes.into_val(&e)]);
            }
            if user_no > 0 {
                e.invoke_contract::<()>(&Self::get_no(&e), &Symbol::new(&e, "burn"), vec![&e, from.into_val(&e), user_no.into_val(&e)]);
            }
            payout = (user_yes + user_no) / 2;
        }

        if payout > 0 {
            collateral.transfer(&e.current_contract_address(), &from, &payout);
        }
    }

    /// Resolves the market. Only callable by the oracle.
    pub fn resolve(e: Env, outcome: MarketOutcome) {
        let oracle: Address = e.storage().instance().get(&DataKey::Oracle).unwrap();
        oracle.require_auth();
        
        if Self::is_resolved(&e) { panic!("already resolved"); }

        e.storage().instance().set(&DataKey::Outcome, &outcome);
        e.storage().instance().set(&DataKey::Resolved, &true);
    }

    // Helper Functions
    fn is_resolved(e: &Env) -> bool { e.storage().instance().get(&DataKey::Resolved).unwrap_or(false) }
    fn get_collateral(e: &Env) -> Address { e.storage().instance().get(&DataKey::CollateralToken).unwrap() }
    fn get_yes(e: &Env) -> Address { e.storage().instance().get(&DataKey::YesToken).unwrap() }
    fn get_no(e: &Env) -> Address { e.storage().instance().get(&DataKey::NoToken).unwrap() }
    fn get_lp(e: &Env) -> Address { e.storage().instance().get(&DataKey::LpToken).unwrap() }
}

mod test;
