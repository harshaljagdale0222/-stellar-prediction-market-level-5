import { NextResponse } from "next/server";
// Server environments CAN safely import this without breaking client chunks
import * as SDK from "@stellar/stellar-sdk";

export async function POST(req: Request) {
  try {
    const { destination } = await req.json();
    
    // We create a locally stubbed Account with sequence "0".
    // This entirely bypasses the Soroban testnet 'Account not found' error for unfunded wallets!
    // The XDR will be completely valid for Freighter to prompt the signature popup.
    const account = new SDK.Account(destination, "0");
    
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
