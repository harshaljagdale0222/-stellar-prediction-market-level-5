
import { Keypair, Networks, Operation, TransactionBuilder, Horizon, Contract, nativeToScVal, xdr, Address, StrKey } from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runFix() {
    console.log('--- STARTING EMERGENCY MARKET CREATION ---');
    const server = new Horizon.Server('https://horizon-testnet.stellar.org');
    
    // Deployer account
    const deployer = Keypair.random();
    console.log('Temporary Deployer:', deployer.publicKey());
    await fetch(`https://friendbot.stellar.org?addr=${deployer.publicKey()}`);
    console.log('Funded.');

    const account = await server.loadAccount(deployer.publicKey());
    const factoryId = 'CB5ZKRVTZCSERHLYMLXZ6EWSVJ3DY7J6JVRMUKPNYDS2VGODLCLE4V37';
    const collateral = 'CDLZFC3SYXG7L6CJCXWSH67TGKDY7XREO6TBOF3Y7TSRKCP6AKCPSTCD';
    const oracle = deployer.publicKey();

    // 1. Create Market Transaction
    const createOp = Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(new xdr.InvokeContractArgs({
            contractAddress: Address.fromString(factoryId).toScAddress(),
            functionName: 'create_market',
            args: [
                new Address(deployer.publicKey()).toScVal(),
                new Address(oracle).toScVal(),
                new Address(collateral).toScVal()
            ]
        })),
        auth: []
    });

    const tx = new TransactionBuilder(account, { fee: '1000000', networkPassphrase: Networks.TESTNET })
        .addOperation(createOp)
        .setTimeout(60)
        .build();

    tx.sign(deployer);
    console.log('Submitting...');
    const result = await server.submitTransaction(tx);
    
    // 2. Extract Market ID
    const metaXdr = xdr.TransactionMeta.fromXDR(result.result_meta_xdr, 'base64');
    const marketIdSc = metaXdr.v3().sorobanMeta().returnValue().address().contractId();
    const marketId = StrKey.encodeContract(marketIdSc);
    console.log('SUCCESS! NEW MARKET ID:', marketId);

    // 3. Update markets.json
    const marketsPath = path.resolve(__dirname, './data/markets.json');
    const db = JSON.parse(fs.readFileSync(marketsPath, 'utf8'));
    db.forEach(m => m.contractAddress = marketId);
    fs.writeFileSync(marketsPath, JSON.stringify(db, null, 2));
    
    console.log('DB Updated. Synchronizing with GitHub...');
}

runFix().catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
});
