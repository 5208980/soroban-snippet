"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getUserInfo } from "@stellar/freighter-api";
import { BASE_FEE, Networks, hash } from "stellar-sdk";
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

export const InstallingWasmToSoroban = ({ }: InstallingWasmToSorobanProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
    const [publicKey, setPublicKey] = useState<string>("");

    const excute = async (fn: Function, logger?: any) => {
        const loggerRef = logger || consoleLogRef;
        try {
            loggerRef.current?.clearConsole();
            await fn();
        } catch (error) {
            loggerRef.current?.appendConsole(`${error}`);
            console.log(error);
        } finally {
            loggerRef.current?.appendConsole("============ Done ============");
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
        consoleLogRef.current?.appendConsole("Creating operation ...");
        const txBuilder = await initTxBuilder();
        const response = await fetch(`/api/token`, { method: 'POST', });
        const wasm = await response.blob();
        const wasmBuffer = Buffer.from(await wasm.arrayBuffer());
        const predefinedWasmHash: Buffer = hash(wasmBuffer);
        
        // Here is the main part of the code
        const tx = await uploadContractWasmOp(
            wasmBuffer, txBuilder, sdk.server)

        consoleLogRef.current?.appendConsole(tx.toXDR());
        return tx.toXDR();
    }

    const handleInstallWASM = async () => {
        const xdr: string = await handleSampleUploadContractWasmOp();
        consoleLogRef.current?.appendConsole("Signing transaction with wallet ...");
        const response = await sign(xdr);
        const wasmId = await submitTxAndGetWasmId(
            response, sdk.server, sdk.selectedNetwork);

        consoleLogRef.current?.appendConsole("WASM Hash on Soroban:");
        consoleLogRef.current?.appendConsole(wasmId);
    }

    return (
        <div className="pb-32">
            <Title>Installing Contract/WASM to Soroban</Title>

            <Header2>Introduction</Header2>
            <p>
                In this section, we&apos;ll walk you through the essential steps of making sure
                your smart contract is ready for deployment on Soroban. <b>Note:</b> This
                section is purely on installing a compiled smart contract onto Soroban. This
                is different to deploying a smart contract, which is covered here: ... Installing
                a contract means creating a contract hash that serves as the key identifier used
                to deploy the contract onto the Soroban blockchain.
            </p>

            <p>
                <Code>soroban-cli</Code> has the <Code>install</Code> commands that
                can be used to install a compiled contract to the network. However in Javascript,
                we need to use a hostFunction Operation known as <Code>hostFunctionTypeUploadContractWasm</Code>
            </p>
            <CodeBlock language={"bash"} code={cliCode} />

            <Header2>Prerequistes</Header2>
            <p>
                For this demo, Soroban Snippet will provide a <Code>.wasm</Code> of a soroban
                token contract found here: https://github.com/stellar/soroban-examples/tree/main/token.
                In a pratical dapp, you will need to compile your own smart contract and load the
                <Code>.wasm</Code> file as a buffer. Additionally, you will need to connect to <b>Freighter</b>
                a stellar wallet extension (like Metamask) to sign transactions.
            </p>

            <Header2>uploadContractWasmOp</Header2>
            <p>
                As mention the main operation for installing a smart contract onto Soroban is,
                <Code>hostFunctionTypeUploadContractWasm</Code> which is designed to facilitate the
                upload of a WebAssembly (WASM) smart contract to a Soroban or Stellar blockchain.
                This function is asynchronous and returns a Promise that resolves
                to a Transaction object that can be used to sign and submit to Stellar. The code
                below shows the implementation of this function.
            </p>
            <CodeBlock code={code} />

            <Header2></Header2>
            <UList>
                <li>
                    <Header3>Create HostFunction Object:</Header3>
                    <p>
                        The function initiates by creating a <Code>HostFunction</Code> object (<Code>hf</Code>) using the
                        <Code>xdr.HostFunction.hostFunctionTypeUploadContractWasm</Code> method. This object encapsulates the
                        details of the upload contract Wasm operation.
                    </p>
                </li>
                <li>
                    <Header3>Create Operation Object:</Header3>
                    <p>
                        An operation object (<Code>op</Code>) is then created using the <Code>Operation.invokeHostFunction</Code>
                        method. The <Code>func</Code> parameter is set to the previously created <Code>hf</Code>, and the
                        <Code>auth</Code> parameter is an empty array since no additional authorization is required for this specific
                        operation. You can found offical information here: https://soroban.stellar.org/docs/fundamentals-and-concepts/invoking-contracts-with-transactions#invokehostfunctionop
                    </p>
                </li>
                <li>
                    <Header3>Build Transaction:</Header3>
                    <p>
                        Utilizing the provided <Code>txBuilder</Code>, the function adds the created operation (<Code>op</Code>) to the
                        transaction, sets an infinite timeout using <Code>.setTimeout(TimeoutInfinite)</Code>, and builds the
                        transaction.
                    </p>
                </li>
                <li>
                    <Header3>Prepare Transaction:</Header3>
                    <p>
                        The function then uses the <Code>server.prepareTransaction</Code> method to prepare the transaction for
                        submission. The result is cast to a <Code>Transaction</Code> object.
                    </p>
                </li>
                <li>
                    <Header3>Return Prepared Transaction:</Header3>
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
                of a WebAssembly (Wasm) smart contract file, <i>&quot;soroban_token_contract.wasm&quot;</i>,
                using the <Code>fs.readFileSync</Code> method. Subsequently, it initializes a Soroban
                transaction builder (txBuilder) by calling an asynchronous function
                <Code>initialiseTransactionBuilder()</Code>. It then obtains a Soroban server instance
                for the testnet environment using the getServer function. Finally, the
                code invokes a custom asynchronous function <b>uploadContractWasmOp</b> to upload
                the Wasm smart contract to the blockchain. The function takes the Wasm buffer,
                the transaction builder, and the server as parameters, builds a transaction
                that includes the contract upload operation, and returns the prepared
                transaction for further processing.
            </p>

            <CodeBlock code={sampleUploadContractWasmOp} />
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleSampleUploadContractWasmOp)}>
                    Generate Operation XDR
                </Button>
                <Button onClick={() => excute(handleInstallWASM)}>
                    Install WASM to Soroban
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
import { Operation, Server, TimeoutInfinite, Transaction, TransactionBuilder, xdr } from "stellar-sdk";

const uploadContractWasmOp = async (
    wasm: Buffer,
    txBuilder: TransactionBuilder,
    server: Server,
) => Promise<Transaction> {
    // This is the main part of the code
    // This builds InvokeHostFunctionOp operation with HostFunction hostFunctionTypeUploadContractWasm
    let hf: xdr.HostFunction = xdr.HostFunction.hostFunctionTypeUploadContractWasm(wasm);
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

Networks
const sampleUploadContractWasmOp = `
import { Operation, Networks, Server, SorobanRpc, TimeoutInfinite, Transaction, TransactionBuilder, xdr } from "stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// This connects to the testnet, but you can change it to appriopriate network
const server: Server = new Server("https://soroban-testnet.stellar.org/", { 
                            allowHttp: true, });

// Initialise a TxBuilder to build hostFunctionTypeUploadContractWasm transaction
const publicKey: string = "GDFNGTA..."
const source: Account = await server.getAccount(publicKey);
const txBuilder: TransactionBuilder =     
return new TransactionBuilder(source, { 
    fee: BASE_FEE,
    Networks.TESTNET,
});

// Load in the .wasm file as Buffer
const wasmBuffer = fs.readFileSync("soroban_token_contract.wasm");

// Here is the main part of the code
const txBuilder: Transaction = await uploadContractWasmOp(
    wasmBuffer,
    txBuilder,
    server,
);

// Soroban Snippet uses Freighter to sign transaction
const signedTx = await signTransaction(txBuilder.toXDR());

// Submit transaction to Soroban
const response: SorobanRpc.GetTransactionResponse = await submitTx(signedTx);

// Get the WasmID from the resultMetaXdr
if (response.status == SorobanRpc.GetTransactionStatus.SUCCESS && response.resultMetaXdr) {
    const buff = Buffer.from(response.resultMetaXdr.toXDR("base64"), "base64");
    const txMeta = xdr.TransactionMeta.fromXDR(buff);
    const wasmId txMeta.v3().sorobanMeta()?.returnValue().bytes().toString("hex") || "";  // WasmID
}
`.trim();

