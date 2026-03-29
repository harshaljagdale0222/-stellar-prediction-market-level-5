
import { Keypair, Networks, Operation, TransactionBuilder, Horizon, Contract, nativeToScVal, xdr, Address, StrKey } from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createMarket() {
    console.log('--- Creating fresh Market instance ---');
    const server = new Horizon.Server('https://horizon-testnet.stellar.org');
    
    // Using the same secret from my mental model (will be funded via Friendbot)
    const deployer = Keypair.random();
    console.log('Deployer:', deployer.publicKey());

    // 1. Fund
    await fetch(`https://friendbot.stellar.org?addr=${deployer.publicKey()}`);
    console.log('Funded.');
    
    let account = await server.loadAccount(deployer.publicKey());

    // 2. Factory Address & Token address (Testnet XLM)
    const factoryId = 'CB5ZKRVTZCSERHLYMLXZ6EWSVJ3DY7J6JVRMUKPNYDS2VGODLCLE4V37';
    const collateralToken = 'CDLZFC3SYXG7L6CJCXWSH67TGKDY7XREO6TBOF3Y7TSRKCP6AKCPSTCD';
    const oracle = deployer.publicKey();

    // 3. Invoke Factory.create_market
    const invokeOp = Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(new xdr.InvokeContractArgs({
            contractAddress: Address.fromString(factoryId).toScAddress(),
            functionName: 'create_market',
            args: [
                new Address(deployer.publicKey()).toScVal(), // caller
                new Address(oracle).toScVal(),             // oracle
                new Address(collateralToken).toScVal()     // collateral
            ]
        })),
        auth: []
    });

    const tx = new TransactionBuilder(account, { fee: '1000000', networkPassphrase: Networks.TESTNET })
        .addOperation(invokeOp)
        .setTimeout(60)
        .build();

    tx.sign(deployer);
    const result = await server.submitTransaction(tx);
    
    // 4. Get New Market ID from events or return value
    const metaXdr = xdr.TransactionMeta.fromXDR(result.result_meta_xdr, 'base64');
    const marketIdSc = metaXdr.v3().sorobanMeta().returnValue().address().contractId();
    const marketId = StrKey.encodeContract(marketIdSc);
    console.log('NEW MARKET ID:', marketId);

    // 5. Update data
    const marketsPath = path.resolve(__dirname, './data/markets.json');
    const db = JSON.parse(fs.readFileSync(marketsPath, 'utf8'));
    db.forEach(m => m.contractAddress = marketId);
    fs.writeFileSync(marketsPath, JSON.stringify(db, null, 2));
    console.log('Update Complete.');
}

createMarket().catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
});
