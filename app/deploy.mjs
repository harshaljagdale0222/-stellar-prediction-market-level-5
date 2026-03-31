
import { Keypair, Networks, Operation, TransactionBuilder, Horizon, Contract, nativeToScVal, xdr, Address, StrKey, rpc } from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function deploy() {
    console.log('--- Prediction Market Deployment (RELIABLE RPC) ---');
    const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org"); // Standard testnet
    const server = new Horizon.Server("https://horizon-testnet.stellar.org");
    
    // Use a pre-funded or deterministic key for the demo if possible
    // but random is safer for a fresh deploy on Windows
    const deployer = Keypair.random();
    console.log('Deploying with:', deployer.publicKey());

    // 1. Fund
    console.log('Funding via Friendbot (with retries)...');
    let funded = false;
    for (let i = 0; i < 5; i++) {
        try {
            console.log(`Attempt ${i + 1} of 5...`);
            const fund = await fetch(`https://friendbot.stellar.org?addr=${deployer.publicKey()}`);
            if (fund.ok) { 
                funded = true; 
                break; 
            }
        } catch (e) {
            console.warn(`Attempt ${i + 1} encountered network error.`);
        }
        await new Promise(r => setTimeout(r, 5000)); // wait 5 seconds before retrying
    }
    
    if (!funded) throw new Error('Funding failed after 5 attempts. The Testnet is too congested.');
    console.log('Successfully Funded! Proceeding to deploy...');

    let account = await server.loadAccount(deployer.publicKey());

    // 2. WASM
    const wasmPath = path.resolve(__dirname, '../target/wasm32-unknown-unknown/release/soroban_prediction_market.wasm');
    const wasm = fs.readFileSync(wasmPath);
    console.log('WASM Size:', wasm.length);

    // 3. Upload
    console.log('Uploading...');
    let txUpload = new TransactionBuilder(account, { fee: '100000', networkPassphrase: Networks.TESTNET })
        .addOperation(Operation.invokeHostFunction({
            func: xdr.HostFunction.hostFunctionTypeUploadContractWasm(wasm),
            auth: []
        }))
        .setTimeout(60)
        .build();

    console.log('Simulating upload...');
    const simRes = await rpcServer.simulateTransaction(txUpload);
    
    if (rpc.Api.isSimulationError(simRes)) {
        console.error('Simulation Failed Details:', simRes.error);
        throw new Error('Simulation failed during upload');
    }

    txUpload = rpc.assembleTransaction(txUpload, simRes).build();
    txUpload.sign(deployer);
    const resUpload = await server.submitTransaction(txUpload);
    const metaXdr = xdr.TransactionMeta.fromXDR(resUpload.result_meta_xdr, 'base64');
    const wasmHash = metaXdr.v3().sorobanMeta().returnValue().bytes();
    console.log('WASM Hash:', wasmHash.toString('hex'));

    // 4. Create
    console.log('Creating Contract...');
    account = await server.loadAccount(deployer.publicKey());
    let txCreate = new TransactionBuilder(account, { fee: '100000', networkPassphrase: Networks.TESTNET })
        .addOperation(Operation.invokeHostFunction({
            func: xdr.HostFunction.hostFunctionTypeCreateContract(new xdr.CreateContractArgs({
                contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(new xdr.ContractIdPreimageFromAddress({
                    address: Address.fromString(deployer.publicKey()).toScAddress(),
                    salt: Buffer.alloc(32)
                })),
                executable: xdr.ContractExecutable.contractExecutableWasm(wasmHash)
            })),
            auth: []
        }))
        .setTimeout(60)
        .build();

    const simRes2 = await rpcServer.simulateTransaction(txCreate);
    txCreate = rpc.assembleTransaction(txCreate, simRes2).build();
    txCreate.sign(deployer);
    const resCreate = await server.submitTransaction(txCreate);
    const createMetaXdr = xdr.TransactionMeta.fromXDR(resCreate.result_meta_xdr, 'base64');
    const contractId = StrKey.encodeContract(createMetaXdr.v3().sorobanMeta().returnValue().address().contractId());
    
    console.log('--- SUCCESS ---');
    console.log('Contract ID:', contractId);

    // 5. Update JSON
    const marketsPath = path.resolve(__dirname, './data/markets.json');
    const db = JSON.parse(fs.readFileSync(marketsPath, 'utf8'));
    db.forEach(m => m.contractAddress = contractId);
    fs.writeFileSync(marketsPath, JSON.stringify(db, null, 2));
    console.log('All markets calibrated to new contract.');
}

deploy().catch(err => {
    console.error('Deployment Failed:', err);
    process.exit(1);
});
