#![no_std]

use soroban_sdk::{
    bytes, contract, contractimpl, contracttype, vec, Address, BytesN, Env, IntoVal, String, Symbol,
};

#[contracttype]
pub enum DataKey {
    Admin,
    TokenWasmHash,
    MarketWasmHash,
    MarketCount,
    MarketMap(u32),
}

#[contract]
pub struct PredictionFactory;

#[contractimpl]
impl PredictionFactory {
    pub fn init(
        e: Env,
        admin: Address,
        market_wasm_hash: BytesN<32>,
        token_wasm_hash: BytesN<32>,
    ) {
        if e.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::MarketWasmHash, &market_wasm_hash);
        e.storage().instance().set(&DataKey::TokenWasmHash, &token_wasm_hash);
        e.storage().instance().set(&DataKey::MarketCount, &0u32);
    }

    pub fn create_market(
        e: Env,
        caller: Address,
        oracle: Address,
        collateral_token: Address,
    ) -> Address {
        caller.require_auth();

        let market_wasm_hash: BytesN<32> = e.storage().instance().get(&DataKey::MarketWasmHash).unwrap();
        let token_wasm_hash: BytesN<32> = e.storage().instance().get(&DataKey::TokenWasmHash).unwrap();

        let market_count: u32 = e.storage().instance().get(&DataKey::MarketCount).unwrap_or(0);
        
        let count_offset = market_count * 10;
        let mut buf = [0u8; 32];
        
        // Pseudo-salts for deployments
        buf[0] = (count_offset + 1) as u8;
        let salt_yes = BytesN::from_array(&e, &buf);
        buf[0] = (count_offset + 2) as u8;
        let salt_no = BytesN::from_array(&e, &buf);
        buf[0] = (count_offset + 3) as u8;
        let salt_lp = BytesN::from_array(&e, &buf);
        buf[0] = (count_offset + 4) as u8;
        let salt_mkt = BytesN::from_array(&e, &buf);

        let yes_addr = e.deployer().with_current_contract(salt_yes).deploy(token_wasm_hash.clone());
        let no_addr = e.deployer().with_current_contract(salt_no).deploy(token_wasm_hash.clone());
        let lp_addr = e.deployer().with_current_contract(salt_lp).deploy(token_wasm_hash.clone());
        let market_addr = e.deployer().with_current_contract(salt_mkt).deploy(market_wasm_hash);

        e.invoke_contract::<()>(&yes_addr, &Symbol::new(&e, "initialize"), vec![&e, market_addr.into_val(&e), 6u32.into_val(&e), String::from_str(&e, "YES Token").into_val(&e), String::from_str(&e, "YES").into_val(&e)]);
        e.invoke_contract::<()>(&no_addr, &Symbol::new(&e, "initialize"), vec![&e, market_addr.into_val(&e), 6u32.into_val(&e), String::from_str(&e, "NO Token").into_val(&e), String::from_str(&e, "NO").into_val(&e)]);
        e.invoke_contract::<()>(&lp_addr, &Symbol::new(&e, "initialize"), vec![&e, market_addr.into_val(&e), 6u32.into_val(&e), String::from_str(&e, "LP Token").into_val(&e), String::from_str(&e, "LP").into_val(&e)]);

        // Init market
        e.invoke_contract::<()>(&market_addr, &Symbol::new(&e, "init"), vec![
            &e,
            caller.into_val(&e), // Admin
            oracle.into_val(&e),
            collateral_token.into_val(&e),
            yes_addr.into_val(&e),
            no_addr.into_val(&e),
            lp_addr.into_val(&e),
        ]);

        e.storage().instance().set(&DataKey::MarketCount, &(market_count + 1));
        e.storage().instance().set(&DataKey::MarketMap(market_count), &market_addr);

        market_addr
    }
}
