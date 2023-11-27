"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { BASE_FEE, xdr } from "soroban-client";
import { initaliseTransactionBuilder, signTransactionWithWallet, submitTxAndGetWasmId, uploadContractWasmOp } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";

export interface InstallingWasmToSorobanProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const InstallingWasmToSoroban2 = ({ }: InstallingWasmToSorobanProps) => {
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
    
    const handleSampleUploadContractWasmOp = async (): Promise<string> => {
        consoleLogRef.current?.appendConsole("# Creating operation ...");
        const txBuilder = await initTxBuilder();
        const response = await fetch(`/api/token`, { method: 'POST', });
        const wasm = await response.blob();
        const wasmBuffer = Buffer.from(await wasm.arrayBuffer());

        // Here is the main part of the code
        const tx = await uploadContractWasmOp(
            wasmBuffer, txBuilder, sdk.server)

        consoleLogRef.current?.appendConsole(tx.toXDR());
        return tx.toXDR();
    }

    const decodeTxnSorobanXdr = (str: string) => xdr.TransactionEnvelope.fromXDR(str, 'base64').v1().tx()

    const handleInstallWASM = async () => {
        const xdr: string = await handleSampleUploadContractWasmOp();
        const tx: xdr.Transaction = decodeTxnSorobanXdr(xdr);
        console.log(tx);
    }

    return (
        <div className="pb-32">
            <Title>Compiling your Soroban smart contract online</Title>

            <Header2>Introduction</Header2>
            <div>
                This section will cover how to install soroban smart contract onto Soroban.
                This is important, as inorder to deploy an instance of a smart contract,
                you need to compile it first and then obtain a wasm hash that will be used
                to deploy the contract.
            </div>
            <CodeBlock language={"bash"} code={cliCode} />

            <Header2>Prerequistes</Header2>
            <p>This assume you have a compiled <Code>.wasm</Code> file that has been generated
                from a Rust and <Code>Make</Code></p>

            <Header2>Prerequistes</Header2>
            <p>
                The uploadContractWasmOp function is designed to facilitate the
                upload of a WebAssembly (Wasm) smart contract to a Soroban or Stellar blockchain.
                This function is asynchronous and returns a Promise that resolves
                to a Transaction object that can be used to sign and submit to Stellar
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
                The provided code utilizes the Soroban blockchain client library to
                interact with a Soroban blockchain. It begins by reading the content
                of a WebAssembly (Wasm) smart contract file, &quot;soroban_token_contract.wasm&quot;,
                using the fs.readFileSync method. Subsequently, it initializes a Soroban
                transaction builder (txBuilder) by calling an asynchronous function
                initialiseTransactionBuilder(). It then obtains a Soroban server instance
                for the testnet environment using the getServer function. Finally, the
                code invokes a custom asynchronous function uploadContractWasmOp to upload
                the Wasm smart contract to the blockchain. The function takes the Wasm buffer,
                the transaction builder, and the server as parameters, builds a transaction
                that includes the contract upload operation, and returns the prepared
                transaction for further processing.
            </p>

            <CodeBlock code={sampleUploadContractWasmOp} />
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleInstallWASM)}>
                    Generate Operation XDR
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
import { Operation, Server, TimeoutInfinite, Transaction, TransactionBuilder, xdr } from "soroban-client";

const uploadContractWasmOp = async (
    value: Buffer,
    txBuilder: TransactionBuilder,
    server: Server,
) => Promise<Transaction> {
    let hf: xdr.HostFunction = xdr.HostFunction.hostFunctionTypeUploadContractWasm(value);
    let op: any = Operation.invokeHostFunction({
        func: hf,
        auth: [],
    });

    let tx: Transaction = txBuilder
        .addOperation(op)
        .setTimeout(TimeoutInfinite)
        .build();

    const prepared = await server.prepareTransaction(tx) as Transaction;
    return prepared;
};
`.trim();

const sampleUploadContractWasmOp = `
import { Operation, Server, SorobanRpc, TimeoutInfinite, Transaction, TransactionBuilder, xdr } from "soroban-client";
import { signTransaction } from "@stellar/freighter-api";

const wasmBuffer = fs.readFileSync("soroban_token_contract.wasm");
const txBuilder: TransactionBuilder = await initaliseTransactionBuilder();
const server: Server = getServer("testnet");

// Here is the main part of the code
const txBuilder: Transaction = await uploadContractWasmOp(
    wasmBuffer,
    txBuilder,
    server,
);

// Soroban Snippet uses Freighter to sign transaction
const signedTx = await signTransaction(txBuilder.toXDR());

const response: SorobanRpc.GetTransactionResponse = await submitTx(signedTx);

if (response.status == SorobanRpc.GetTransactionStatus.SUCCESS && response.resultMetaXdr) {
    const buff = Buffer.from(response.resultMetaXdr.toXDR("base64"), "base64");
    const txMeta = xdr.TransactionMeta.fromXDR(buff);
    const wasmId txMeta.v3().sorobanMeta()?.returnValue().bytes().toString("hex") || "";  // WasmID
}
`.trim();

