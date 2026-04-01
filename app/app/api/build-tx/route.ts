import { NextResponse } from "next/server";
// Server environments CAN safely import this without breaking client chunks
import * as SDK from "@stellar/stellar-sdk";

export async function POST(req: Request) {
  try {
    const { destination } = await req.json();
    
    // Support both older (SorobanRpc) and newer (rpc) stellar-sdk versions to build the server
    const DeveloperRPC = SDK.rpc || (SDK as any).SorobanRpc;
    const server = new DeveloperRPC.Server("https://soroban-testnet.stellar.org");

    let account;
    try {
      // Try to get actual account for REAL blockchain submission
      account = await server.getAccount(destination);
    } catch (e) {
      // FALLBACK: If account is not funded (404), use a stub for 'Demo Mode' (Popup will still show!)
      console.log("Account not funded, using stub for demo popup.");
      account = new SDK.Account(destination, "0");
    }
    
    // A micro-tx to prove interaction and trigger the real Freighter signing popup
    let tx = new SDK.TransactionBuilder(account, { 
      fee: "1000", 
      networkPassphrase: SDK.Networks.TESTNET 
    })
    .addOperation(SDK.Operation.payment({
      destination: destination,
      asset: SDK.Asset.native(),
      amount: "0.0000001",
    }))
    .setTimeout(30)
    .build();

    return NextResponse.json({ xdr: tx.toXDR() });
  } catch (error: any) {
    console.error("TX Build Error:", error);
    return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
  }
}
