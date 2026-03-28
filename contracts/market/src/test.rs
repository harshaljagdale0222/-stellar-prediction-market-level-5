#![cfg(test)]

use crate::{PredictionMarket, PredictionMarketClient, MarketOutcome};
use soroban_sdk::{testutils::{Address as _}, Address, Env, String};
use soroban_prediction_token::{PredictionToken, PredictionTokenClient};

#[test]
fn test_market_flow() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let oracle = Address::generate(&e);
    let lp_user = Address::generate(&e);
    let trader = Address::generate(&e);

    let collateral_id = e.register_contract(None, PredictionToken);
    let yes_id_reg = e.register_contract(None, PredictionToken);
    let no_id_reg = e.register_contract(None, PredictionToken);
    let lp_id_reg = e.register_contract(None, PredictionToken);

    let market_id = e.register_contract(None, PredictionMarket);
    let market_client = PredictionMarketClient::new(&e, &market_id);

    let collateral = PredictionTokenClient::new(&e, &collateral_id);
    let yes = PredictionTokenClient::new(&e, &yes_id_reg);
    let no = PredictionTokenClient::new(&e, &no_id_reg);
    let lp = PredictionTokenClient::new(&e, &lp_id_reg);

    collateral.initialize(&admin, &6, &String::from_str(&e, "Collat"), &String::from_str(&e, "USDC"));
    yes.initialize(&market_id, &6, &String::from_str(&e, "YES"), &String::from_str(&e, "YES"));
    no.initialize(&market_id, &6, &String::from_str(&e, "NO"), &String::from_str(&e, "NO"));
    lp.initialize(&market_id, &6, &String::from_str(&e, "LP"), &String::from_str(&e, "LP"));

    collateral.mint(&lp_user, &100_000);
    collateral.mint(&trader, &100_000);

    market_client.init(&admin, &oracle, &collateral_id, &yes_id_reg, &no_id_reg, &lp_id_reg);

    market_client.add_liquidity(&lp_user, &10_000);
    assert_eq!(yes.balance(&market_id), 10_000);
    assert_eq!(no.balance(&market_id), 10_000);
    assert_eq!(lp.balance(&lp_user), 10_000);

    market_client.buy_yes(&trader, &1000, &0);
    let trader_yes = yes.balance(&trader);
    assert!(trader_yes > 1800); // 1000 minted + ~900 swapped from pool

    market_client.resolve(&MarketOutcome::Yes);

    market_client.claim_winnings(&trader);
    let trader_collat = collateral.balance(&trader);
    
    assert_eq!(trader_collat, 99_000 + trader_yes); // 100k - 1k + trader_yes
}
