"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { Account, Address, BASE_FEE, Contract, Keypair, Memo, Networks, Operation, SorobanRpc, TimeoutInfinite, TransactionBuilder, authorizeInvocation, xdr } from "soroban-client";
import { initaliseTransactionBuilder, signTransactionWithWallet, submitTxAndGetWasmId, uploadContractWasmOp } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { getContract } from "@/utils/util";
import { Adamina } from "next/font/google";

export interface AuthorizeInvocationProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const AuthorizeInvocation = ({ }: AuthorizeInvocationProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
    const [publicKey, setPublicKey] = useState<string>("");

    const excute = async (fn: Function) => {
        try {
            consoleLogRef.current?.clearConsole();
            await fn();
        } catch (error) {
            consoleLogRef.current?.appendConsole(error);
            console.log(error);
        }
        finally {
            consoleLogRef.current?.appendConsole("============ Done ============");
        }
    }

    useEffect(() => {
        (async () => {
            const { publicKey } = await getUserInfo();
            setPublicKey(publicKey);
        })();
    }, []);

    const initTxBuilder = async () => {
        return await initaliseTransactionBuilder(
            publicKey, BASE_FEE, sdk.server,
            sdk.selectedNetwork.networkPassphrase);
    }

    const sign = async (tx: string) => {
        return await signTransactionWithWallet(tx, publicKey, sdk.selectedNetwork);
    }
    //#endregion

    const handleAuthorization = async () => {
        const account1 = "GC5S4C6LMT6BCCARUCK5MOMAS4H7OABFSZG2SPYOGUN2KIHN5HNNMCGL";
        const account2 = "GDJWYMKAHRUXYL7Y6FBSAJXWLYHI644K4KEORZBJ6SI2QZ2LPIZEB7XB";

        const source = await sdk.server.getAccount(account1);
        const currentLedger = await sdk.server.getLatestLedger();

        // Set the signature valid ledger number
        const validUntilLedger = currentLedger.sequence + 10000;

        // Build the InvokeHostFunctionOp
        const contractAddress: string = await getContract(sdk.selectedNetwork.network);
        const contract = new Contract(contractAddress);
        // const invokeHostFuncOp = contract.call(
        //     "mint",
        //     new Address(account1).toScVal(),
        //     sdk.nativeToScVal(10000, "i128")
        // );
        const invokeHostFuncOp = contract.call(
            "set_admin",
            new Address(account1).toScVal(),
        );

        // Build the transaction that needs the source and signer2
        const txBuilder = await initTxBuilder();

        const tx = txBuilder
            .addOperation(invokeHostFuncOp)
            .setTimeout(TimeoutInfinite)
            .build();
        // Prepare the transaction, with 1.0.0-beta.2 this is a TransactionBuilder object
        let simTx: SorobanRpc.SimulateTransactionResponse = await sdk.server.simulateTransaction(tx);

        if (SorobanRpc.isSimulationError(simTx)) {
            throw new Error(simTx.error)
        }

        console.log(`Now we're authorizing and signing...`);
        // We should have two entries here, one for the source of the transaction,
        // and one for the second address require_auth() in the SC. @george
        simTx = simTx as SorobanRpc.SimulateTransactionSuccessResponse;
        const entries = simTx.result?.auth || [];
        console.log(entries)
        // assert(entries.length === 2); // sanity check

        // find the entry that needs an extra sig
        const needsSig = entries.findIndex((entry: any) =>
            entry.credentials().switch() !==
            xdr.SorobanCredentialsType.sorobanCredentialsSourceAccount());
        // assert(needsSig === 0 || needsSig === 1); // sanity check

        const noSig = Number(!needsSig); // cheat a bit to get the "other" entry
        console.log(noSig);

        // Clone the original tx
        let builder = TransactionBuilder.cloneFrom(tx);
        return
        // // Let's build the auth entry for signer2
        // const authEntrySigner2 = authorizeInvocation(
        //     account2,
        //     // Networks.FUTURENET,
        //     validUntilLedger,
        //     entries[needsSig].rootInvocation()
        // );

        // // this is a hack until we add a TransactionBuilder.clearOperations()
        // builder.operations = [];
        // const built = builder.addOperation(
        //     Operation.invokeHostFunction({
        //         func: xdr.HostFunction.hostFunctionTypeInvokeContract(
        //             new xdr.InvokeContractArgs({
        //                 contractAddress: contract.address().toScAddress(),
        //                 //functionName: SorobanClient.xdr.ScVal.scvSymbol("dbl_sign_test"),
        //                 functionName: "dbl_sign_test",
        //                 args: [
        //                     new Address(account1.publicKey()).toScVal(),
        //                     new Address(account2.publicKey()).toScVal()
        //                 ]
        //             })
        //         ),
        //         auth: [
        //             entries[noSig],
        //             authEntrySigner2
        //         ],
        //     }))
        //     .setTimeout(30)
        //     .build();

        // // Assemble the transaction for signing by the source
        // const readyTx = await sdk.server.prepareTransaction(built, Networks.FUTURENET);
    }

    return (
        <div className="pb-32">
            <Title>Auth Invocation</Title>

            <Header2>Introduction</Header2>
            <div>
                This section will cover how to obtain the gas estimation for a
                Soroban smart contract invocation or any Stellar operation.
            </div>

            <Header2>Code</Header2>
            <p>
                This function is useful for obtaining an estimate of the transaction fee
                before executing a smart contract method on the Soroban blockchain. You
                can call <Code>stimulateTransaction</Code> which will trial contract invocation
                and return a response that contain information related to cost. You can see more in detail:
                https://soroban.stellar.org/docs/fundamentals-and-concepts/fees-and-metering
            </p>
            <CodeBlock code={code} />

            <Header2>On the web</Header2>
            <UList>
                <li>
                    <h3>Create HostFunction Object:</h3>
                    <p>
                        The function initiates by creating a <Code>HostFunction</Code> object (<Code>hf</Code>) using the
                        <Code>xdr.HostFunction.hostFunctionTypeUploadContractWasm</Code> method. This object encapsulates the
                        details of the upload contract Wasm operation.
                    </p>
                </li>
                <li>
                    <h3>Create Operation Object:</h3>
                    <p>
                        An operation object (<Code>op</Code>) is then created using the <Code>Operation.invokeHostFunction</Code>
                        method. The <Code>func</Code> parameter is set to the previously created <Code>hf</Code>, and the
                        <Code>auth</Code> parameter is an empty array since no additional authorization is required for this specific
                        operation.
                    </p>
                </li>
                <li>
                    <h3>Build Transaction:</h3>
                    <p>
                        Utilizing the provided <Code>txBuilder</Code>, the function adds the created operation (<Code>op</Code>) to the
                        transaction, sets an infinite timeout using <Code>.setTimeout(TimeoutInfinite)</Code>, and builds the
                        transaction.
                    </p>
                </li>
                <li>
                    <h3>Prepare Transaction:</h3>
                    <p>
                        The function then uses the <Code>server.prepareTransaction</Code> method to prepare the transaction for
                        submission. The result is cast to a <Code>Transaction</Code> object.
                    </p>
                </li>
                <li>
                    <h3>Return Prepared Transaction:</h3>
                    <p>
                        The prepared <Code>Transaction</Code> object is returned as the result of the function&apos;s execution.
                    </p>
                </li>
            </UList>

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <p>
                The provided code snippet is an example of estimating the gas
                cost for invoking a specific method, &quot;mint&quot;, on a Soroban smart
                Token written in Rust. The contract is identified by its address,
                and the method takes two parameters: an address and an int128 value.
                The code then simulates the transaction on the Soroban server and
                calculate a fee based on the estimation equation. This functionality
                is useful for developers to assess the gas cost  before executing
                a method on a Soroban smart contract.
            </p>
            <CodeBlock code={sampleGasEstimate} />
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleAuthorization)}>
                    Estimate Gas mint(address, int128)
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const cliCode = `
soroban contract install \\
    --network testnet \\
    --source alice \\
    --wasm target/wasm32-unknown-unknown/release/incrementor.wasm
`.trim()

const code = `
export const getEstimatedFee = async (
    contractAddress: string,
    txBuilder: TransactionBuilder,
    server: Server,
    memo: string,
    method: string,
    params: xdr.ScVal[],
) => {
    const contract = new Contract(contractAddress);

    const tx = txBuilder
        .addOperation(contract.call(method, ...params))
        .setTimeout(TimeoutInfinite);

    if (memo.length > 0) {
        tx.addMemo(Memo.text(memo));
    }

    const raw = tx.build();

    let response = await server.simulateTransaction(raw);

    if (SorobanRpc.isSimulationError(response)) {
        throw new Error(\`Simulation Error: \${response.error}\`);
    }

    // response = response as SorobanRpc.SimulateTransactionSuccessResponse;
    const classicFeeNum = parseInt(raw.fee, 10) || 0;
    const minResourceFeeNum = parseInt(response.minResourceFee, 10) || 0;
    const fee = (classicFeeNum + minResourceFeeNum).toString();

    return fee;
};
`.trim();

const sampleGasEstimate = `
// Load in contract (Soroban Token)
const contract = new Contract("CAEKJZUWNRUGTDINKFPYF5DVD5NIDJVROGL4A7P6KE6ZSH7SWIRGKZBM");
const txBuilder: TransactionBuilder = await initTxBuilder();

// Calling mint("GBHAOSNA7PJOGKWPAQ2VYAY4Y2VMA5LKOPQVCFRXJNJG5YXV4ELEX2GZ", 1000)
// Which is minting 1000 of the token to the address
const method: string = "mint";
const params: xdr.ScVal[] = [
    sdk.nativeToScVal("GBHAOSNA7PJOGKWPAQ2VYAY4Y2VMA5LKOPQVCFRXJNJG5YXV4ELEX2GZ", "address"),
    sdk.nativeToScVal(1000, "i128"),
];

// Will to calling \`balance(address)\` method
const tx = txBuilder
    .addOperation(contract.call(method, ...params))
    .setTimeout(TimeoutInfinite);

// If you want to add memo
const memo = "Testing gas estimation"
if (memo.length > 0) {
    tx.addMemo(Memo.text(memo));
}
const raw = tx.build();

consoleLogRef.current?.appendConsole("# Stimulating balance('GBHAOSNA7PJOGKWPAQ2VYAY4Y2VMA5LKOPQVCFRXJNJG5YXV4ELEX2GZ') ...");
let response: SorobanRpc.SimulateTransactionResponse = await sdk
    .server
    .simulateTransaction(raw);

const classicFeeNum = parseInt(raw.fee, 10) || 0;
const minResourceFeeNum = parseInt(response.minResourceFee, 10) || 0;
const fee = (classicFeeNum + minResourceFeeNum).toString(); // Calculate gas estimation
`.trim();

