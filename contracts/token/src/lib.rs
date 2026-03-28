#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Allowance(Address, Address),
    Balance(Address),
    Name,
    Symbol,
    Decimals,
}

fn read_balance(e: &Env, id: Address) -> i128 {
    e.storage().instance().get(&DataKey::Balance(id)).unwrap_or(0)
}

fn write_balance(e: &Env, id: Address, amount: i128) {
    e.storage().instance().set(&DataKey::Balance(id), &amount);
}

fn read_allowance(e: &Env, from: Address, spender: Address) -> i128 {
    e.storage().instance().get(&DataKey::Allowance(from, spender)).unwrap_or(0)
}

fn write_allowance(e: &Env, from: Address, spender: Address, amount: i128) {
    e.storage().instance().set(&DataKey::Allowance(from, spender), &amount);
}

#[contract]
pub struct PredictionToken;

#[contractimpl]
impl PredictionToken {
    pub fn initialize(e: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if e.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::Decimals, &decimal);
        e.storage().instance().set(&DataKey::Name, &name);
        e.storage().instance().set(&DataKey::Symbol, &symbol);
    }

    pub fn mint(e: Env, to: Address, amount: i128) {
        if amount < 0 {
            panic!("negative amount");
        }
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut balance = read_balance(&e, to.clone());
        balance += amount;
        write_balance(&e, to, balance);
    }

    pub fn burn(e: Env, from: Address, amount: i128) {
        if amount < 0 {
            panic!("negative amount");
        }
        // Either the admin is burning on behalf of contract logic (like Market settling)
        // or the user itself. We allow the user themselves to burn.
        from.require_auth();

        let mut balance = read_balance(&e, from.clone());
        if balance < amount {
            panic!("insufficient balance");
        }
        balance -= amount;
        write_balance(&e, from, balance);
    }

    pub fn admin_burn(e: Env, from: Address, amount: i128) {
        // Specifically for Market AMM removing LP pairs or YES/NO pairs without auth of 'from' if it's the market
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut balance = read_balance(&e, from.clone());
        if balance < amount {
            panic!("insufficient balance");
        }
        balance -= amount;
        write_balance(&e, from, balance);
    }


    pub fn balance(e: Env, id: Address) -> i128 {
        read_balance(&e, id)
    }

    pub fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if amount < 0 {
            panic!("negative amount");
        }
        let mut from_balance = read_balance(&e, from.clone());
        if from_balance < amount {
            panic!("insufficient balance");
        }
        from_balance -= amount;
        write_balance(&e, from, from_balance);

        let mut to_balance = read_balance(&e, to.clone());
        to_balance += amount;
        write_balance(&e, to, to_balance);
    }

    pub fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        if amount < 0 {
            panic!("negative amount");
        }
        let mut allowance = read_allowance(&e, from.clone(), spender.clone());
        if allowance < amount {
            panic!("insufficient allowance");
        }
        allowance -= amount;
        write_allowance(&e, from.clone(), spender, allowance);

        let mut from_balance = read_balance(&e, from.clone());
        if from_balance < amount {
            panic!("insufficient balance");
        }
        from_balance -= amount;
        write_balance(&e, from, from_balance);

        let mut to_balance = read_balance(&e, to.clone());
        to_balance += amount;
        write_balance(&e, to, to_balance);
    }

    pub fn approve(e: Env, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        write_allowance(&e, from, spender, amount);
    }

    pub fn decimals(e: Env) -> u32 {
        e.storage().instance().get(&DataKey::Decimals).unwrap()
    }

    pub fn name(e: Env) -> String {
        e.storage().instance().get(&DataKey::Name).unwrap()
    }

    pub fn symbol(e: Env) -> String {
        e.storage().instance().get(&DataKey::Symbol).unwrap()
    }
}
