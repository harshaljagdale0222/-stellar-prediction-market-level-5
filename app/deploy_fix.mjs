
import { Keypair, Networks, Operation, TransactionBuilder, Horizon, Contract, nativeToScVal, xdr, Address, StrKey } from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function deploy() {
    console.log('--- Prediction Market Deployment ---');
    const server = new Horizon.Server('https://horizon-testnet.stellar.org');
    
    // Create a fresh deployer
    const deployer = Keypair.random();
    console.log('Deployer Public Key:', deployer.publicKey());
    console.log('Deployer Secret Key:', deployer.secret());

    // 1. Fund the account
    console.log('Funding account via Friendbot...');
    const fundRes = await fetch(`https://friendbot.stellar.org?addr=${deployer.publicKey()}`);
    if (!fundRes.ok) throw new Error('Funding failed');
    console.log('Account funded.');
    
    let account = await server.loadAccount(deployer.publicKey());

    // 2. Load WASM
    const wasmPath = path.resolve(__dirname, '../target/wasm32-unknown-unknown/release/soroban_prediction_market.wasm');
    const wasm = fs.readFileSync(wasmPath);
    console.log('WASM loaded, size:', wasm.length, 'bytes');

    // 3. Upload WASM
    console.log('Uploading WASM...');
    const uploadOp = Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeUploadContractWasm(wasm),
        auth: []
    });

    const txUpload = new TransactionBuilder(account, { fee: '1000000', networkPassphrase: Networks.TESTNET })
        .addOperation(uploadOp)
        .setTimeout(60)
        .build();

    txUpload.sign(deployer);
    const resUpload = await server.submitTransaction(txUpload);
    
    // Extract WASM Hash from result
    const resultXdr = xdr.TransactionResult.fromXDR(resUpload.result_xdr, 'base64');
    const metaXdr = xdr.TransactionMeta.fromXDR(resUpload.result_meta_xdr, 'base64');
    const wasmHash = metaXdr.v3().sorobanMeta().returnValue().bytes();
    const wasmHashHex = wasmHash.toString('hex');
    console.log('WASM Hash:', wasmHashHex);

    // 4. Create Contract Instance
    console.log('Creating Contract Instance...');
    account = await server.loadAccount(deployer.publicKey()); // Reload for sequence
    const createOp = Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeCreateContract(new xdr.CreateContractArgs({
            contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(new xdr.ContractIdPreimageFromAddress({
                address: Address.fromString(deployer.publicKey()).toScAddress(),
                salt: Buffer.alloc(32) // Use a zero salt for simplicity
            })),
            executable: xdr.ContractExecutable.contractExecutableWasm(wasmHash)
        })),
        auth: []
    });

    const txCreate = new TransactionBuilder(account, { fee: '1000000', networkPassphrase: Networks.TESTNET })
        .addOperation(createOp)
        .setTimeout(60)
        .build();

    txCreate.sign(deployer);
    const resCreate = await server.submitTransaction(txCreate);
    
    // Extract Contract ID
    const resCreateXdr = xdr.TransactionResult.fromXDR(resCreate.result_xdr, 'base64');
    const createMetaXdr = xdr.TransactionMeta.fromXDR(resCreate.result_meta_xdr, 'base64');
    const contractIdBytes = createMetaXdr.v3().sorobanMeta().returnValue().address().contractId();
    const contractId = StrKey.encodeContract(contractIdBytes);
    console.log('--- NEW CONTRACT DEPLOYED ---');
    console.log('Contract ID:', contractId);

    // 5. Update markets.json
    console.log('Updating markets.json...');
    const marketsPath = path.resolve(__dirname, './data/markets.json');
    const markets = JSON.parse(fs.readFileSync(marketsPath, 'utf8'));
    
    markets.forEach(m => {
        m.contractAddress = contractId;
    });

    fs.writeFileSync(marketsPath, JSON.stringify(markets, null, 2));
    console.log('DONE. All markets updated to new ID.');
}

deploy().catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
});
