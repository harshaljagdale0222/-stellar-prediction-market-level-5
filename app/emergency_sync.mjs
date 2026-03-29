
import { Keypair, Networks, Operation, TransactionBuilder, Horizon, Contract, nativeToScVal, xdr, Address, StrKey } from '@stellar/stellar-sdk';
import fs from 'fs';

async function main() {
    console.log('--- Final Emergency Fix ---');
    // I am updating the markets.json to use the last-known-working contract ID from your history
    const marketsPath = './app/data/markets.json';
    const db = JSON.parse(fs.readFileSync(marketsPath, 'utf8'));
    
    // This is the active market ID discovered from your blockchain trace
    const activeMarketId = 'CB5ZKRVTZCSERHLYMLXZ6EWSVJ3DY7J6JVRMUKPNYDS2VGODLCLE4V37';
    
    db.forEach(m => {
        m.contractAddress = activeMarketId;
    });
    
    fs.writeFileSync(marketsPath, JSON.stringify(db, null, 2));
    console.log('IDs Synchronized.');
}
main();
