"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { BASE_FEE, SorobanRpc, Transaction, TransactionBuilder, xdr } from "stellar-sdk";
import { initaliseTransactionBuilder, signTransactionWithWallet, submitTxAndGetWasmId, uploadContractWasmOp } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { NetworkDetails } from "@/utils/network";
const { Server } = SorobanRpc;

export interface SubmitTransactionProcessProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const SubmitTransactionProcess = ({ }: SubmitTransactionProcessProps) => {
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
    }, [])

    const initTxBuilder = async () => {
        return await initaliseTransactionBuilder(
            publicKey, BASE_FEE, sdk.server,
            sdk.selectedNetwork.networkPassphrase);
    }

    const sign = async (tx: string) => {
        // Soroban Snippet uses Freighter to sign transaction
        consoleLogRef.current?.appendConsole("Signing transaction with wallet ...");
        return await signTransactionWithWallet(tx, publicKey, sdk.selectedNetwork);
    }
    //#endregion

    const submitTx = async (
        txXDR: string,
        server: SorobanRpc.Server,
        network: NetworkDetails,
    ): Promise<SorobanRpc.Api.GetTransactionResponse> => {
        try {
            // Deserialize the XDR transaction and set the network passphrase.
            const tx = TransactionBuilder.fromXDR(
                txXDR, network.networkPassphrase);

            // Send the transaction to the blockchain network.
            let str = await server.sendTransaction(tx);

            // Check if there is an error in the transaction submission.
            if (str.errorResult) {
                consoleLogRef?.current.appendConsole(str.errorResult.result());
                throw new Error("Error submitting transaction");
            }

            // Wait for the transaction to be confirmed.
            let gtr = await server.getTransaction(str.hash);
            let count = 0;
            while (true) {
                count += 1;
                consoleLogRef?.current.appendConsole(`Waiting for transaction to be confirmed ${count}`);
                gtr = await server.getTransaction(str.hash);

                // Exit the loop when the transaction is no longer in the NOT_FOUND status.
                if (gtr.status != SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
                    consoleLogRef?.current.appendConsole(`Submission Complete! ${gtr.status}`);
                    break;
                }

                // Wait for 1 second before checking again.
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            // Return the final transaction result after confirmation.
            return gtr;
        } catch (e: any) {
            // Handle and rethrow any exceptions that occur during submission or confirmation.
            throw new Error(`Transaction Submission Error: ${e.message}`);
        }
    };

    const handleSampleSubmit = async () => {
        const resp = await fetch(`/api/token`, { method: 'POST', });
        const wasm = await resp.blob();
        const wasmBuffer = Buffer.from(await wasm.arrayBuffer());
        const txBuilder: TransactionBuilder = await initTxBuilder();

        // Here is the main part of the code
        const tx: Transaction = await uploadContractWasmOp(
            wasmBuffer,
            txBuilder,
            sdk.server,
        );

        // Soroban Snippet uses Freighter to sign transaction
        const signedTx = await sign(tx.toXDR());

        consoleLogRef?.current.appendConsole(`Submitting to Network ...`);
        const response: SorobanRpc.Api.GetTransactionResponse = await submitTx(
            signedTx.tx, sdk.server, sdk.selectedNetwork);

        consoleLogRef?.current.appendConsole(`Retrieving WASM ID from resultMetaXdr ...`);
        if (response.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS && response.resultMetaXdr) {
            const buff = Buffer.from(response.resultMetaXdr.toXDR("base64"), "base64");
            const txMeta = xdr.TransactionMeta.fromXDR(buff);
            const wasmId = txMeta.v3().sorobanMeta()?.returnValue().bytes().toString("hex") || "";  // WasmID
            consoleLogRef?.current.appendConsole(`WASM ID: ${wasmId}`);
        }
    }

    return (
        <div className="pb-32">
            <Title>Submitting transaction to Soroban</Title>

            <Header2>Introduction</Header2>
            <div>
                This section will guide developers through the steps of retrieving a response
                after submitting a transaction to the network. We&apos;ll provide a brief overview of
                the potential types of responses that a transaction to the network can yield.
                Furthermore, we&apos;ll delve into the specifics of how to handle and respond to a
                transaction&apos;s outcome in a decentralized application (dApp). This involves
                extracting valuable information such as the return value, Wasm ID, contract ID,
                and more. Many online examples follow a consistent pattern/implementation for this
                process. Thanks to Soroban&apos;s efficiency, this procedure is swift and cost-effective,
                making it straightforward to implement.
            </div>

            <Header2>Looking at the response</Header2>
            <p>
                From the <Code>stellar-sdk</Code> package, it seems that the response will return
                a <Code>GetTransactionResponse</Code> object that contains information about
                the transaction. All status type will contain,
                Two main properties are <Code>status</Code> and <Code>returnValue?</Code>.
            </p>
            <UList>
                <li>
                    <Header3>latestLedger: <Code>string</Code></Header3>
                    <p>
                        This attribute represents the identifier of the latest ledger related to the transaction.
                        In Stellar, a ledger is a record of all the changes to the Stellar state, and the identifier could be the ledger sequence number.
                    </p>
                </li>
            </UList>
            <CodeBlock code={`export type GetTransactionResponse = GetSuccessfulTransactionResponse | GetFailedTransactionResponse | GetMissingTransactionResponse;`} />
            <p>
                In most case we want a transaction to be successfull, so we will be looking at the
                <Code>GetSuccessfulTransactionResponse</Code> object.
            </p>
            <CodeBlock language={"bash"} code={getSuccessfulTransactionResponseCode} />

            <p>
                The important attributes here will be
            </p>
            <UList>
                <li>
                    <Header3>resultXdr: <Code>xdr.TransactionResult</Code></Header3>
                    <p>
                        This attribute represents the result of the transaction execution.
                        It is a TransactionResult object that contains the result code and result XDR.
                        This is important as it will contain the result of the transaction such as
                        being able to obtain WASM hashes and Contract Address.
                    </p>
                </li>
                <li>
                    <Header3>resultMetaXdr: <Code>xdr.TransactionMeta</Code></Header3>
                    <p>
                        This attribute represents the metadata of the transaction execution. These are
                        events from the conract and can be useful any contract events made by the transaction.</p>
                </li>
                <li>
                    <Header3>returnValue?: <Code>xdr.ScVal</Code></Header3>
                    <p>
                        This optional attribute represents the return value of the transaction execution.
                        It is a ScVal object that contains the return value of the transaction and is useful
                        when wanting the return value of a method invocation.
                    </p>
                </li>
            </UList>

            <Header2>Submit Transaction</Header2>
            <p>
                This is what a typical submission of a transaction will look like.
            </p>
            <UList>
                <li>
                    <Header3>Error</Header3>
                    <CodeBlock code={codeErrorResponse} />
                </li>
                <li>
                    <Header3>WASM</Header3>
                    <CodeBlock code={codeWasmResponse} />
                </li>
                <li>
                    <Header3>Contract</Header3>
                    <CodeBlock code={codeContractResponse} />

                </li>
                <li>
                    <Header3>Function Return Value</Header3>
                    <CodeBlock code={codeMethodResponse} />

                </li>
            </UList>

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <p>
                The provided code implements a function named <Code>submitTx</Code> that facilitates
                the submission of transactions to the Soroban blockchain. Following the successful
                submission, the function enters a loop to wait for the transaction to be confirmed.
                We can change to how and whenever we want to call periodically. In this example,
                we will be check every 1 second until the status is no longer in the NOT_FOUND state,
                signifying confirmation.

                Upon successful confirmation, the function returns the final transaction result encapsulated
                in a SorobanRpc.GetTransactionResponse object. In case of any errors, it&apos;ll throw and provide
                the message to the developer.
            </p>

            <Header2>Responses</Header2>
            <p>
                Here are some of the way to handle the response.
            </p>
            <Header3>Getting WASM ID (as shown in Usage)</Header3>
            <CodeBlock code={sampleUploadContractWasmOp} />
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleSampleSubmit)}>
                    Submit mint
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRef} />
        </div >
    )
}

const getSuccessfulTransactionResponseCode = `
export interface GetSuccessfulTransactionResponse extends GetAnyTransactionResponse {
    status: GetTransactionStatus.SUCCESS;
    ledger: number;
    createdAt: number;
    applicationOrder: number;
    feeBump: boolean;
    envelopeXdr: xdr.TransactionEnvelope;
    resultXdr: xdr.TransactionResult;
    resultMetaXdr: xdr.TransactionMeta;
    returnValue?: xdr.ScVal;
}`.trim()

const code = `
export const submitTx = async (
    txXDR: string,
    server: Server,
    network: NetworkDetails,
): Promise<SorobanRpc.GetTransactionResponse> => {
    try {
        // Deserialize the XDR transaction and set the network passphrase.
        const tx = TransactionBuilder.fromXDR(
            txXDR,
            network.networkPassphrase
        );

        // Send the transaction to the blockchain network.
        let str = await server.sendTransaction(tx);

        // Check if there is an error in the transaction submission.
        if (str.errorResult) {
            console.error(str.errorResult.result());
            throw new Error("Error submitting transaction");
        }

        // Wait for the transaction to be confirmed.
        let gtr = await server.getTransaction(str.hash);
        while (true) {
            console.log("Waiting for transaction to be confirmed");
            gtr = await server.getTransaction(str.hash);

            // Exit the loop when the transaction is no longer in the NOT_FOUND status.
            if (gtr.status != SorobanRpc.GetTransactionStatus.NOT_FOUND) {
                break;
            }

            // Wait for 1 second before checking again.
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Return the final transaction result after confirmation.
        return gtr;
    } catch (e: any) {
        // Handle and rethrow any exceptions that occur during submission or confirmation.
        throw new Error(\`Transaction Submission Error: \${ e.message }\`);
    }
};
`.trim();

const sampleUploadContractWasmOp = `
import { Operation, Server, SorobanRpc, TimeoutInfinite, Transaction, TransactionBuilder, xdr } from "stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

const wasmBuffer = fs.readFileSync("soroban_token_contract.wasm");
const txBuilder: TransactionBuilder = await initaliseTransactionBuilder();
const server: Server = getServer("testnet");

// Here is the main part of the code
const tx: Transaction = await uploadContractWasmOp(
    wasmBuffer,
    txBuilder,
    server,
);

// Soroban Snippet uses Freighter to sign transaction
const signedTx = await signTransaction(tx.toXDR());

const response: SorobanRpc.GetTransactionResponse = await submitTx(signedTx);

if (response.status == SorobanRpc.GetTransactionStatus.SUCCESS && response.resultMetaXdr) {
    const buff = Buffer.from(response.resultMetaXdr.toXDR("base64"), "base64");
    const txMeta = xdr.TransactionMeta.fromXDR(buff);
    const wasmId = txMeta.v3().sorobanMeta()?.returnValue().bytes().toString("hex") || "";  // WasmID
}
`.trim();

const codeErrorResponse = `
if (response.status === SorobanRpc.GetTransactionStatus.FAILED) {
    throw new Error("Transaction Failed");
}
`.trim()

const codeWasmResponse = `
if (response.status === SorobanRpc.GetTransactionStatus.SUCCESS && response.resultMetaXdr) {
    const buff = Buffer.from(response.resultMetaXdr.toXDR("base64"), "base64");
    const txMeta = xdr.TransactionMeta.fromXDR(buff);
    const wasmId = txMeta.v3().sorobanMeta()?.returnValue().bytes().toString("hex") || "";  // WasmID
}
`.trim()

const codeContractResponse = `
if (gtr.status === SorobanRpc.GetTransactionStatus.SUCCESS && gtr.resultMetaXdr) {
    const buff = Buffer.from(gtr.resultMetaXdr.toXDR("base64"), "base64");
    const txMeta = xdr.TransactionMeta.fromXDR(buff);
    const contractHash = txMeta.v3().sorobanMeta()?.returnValue().address().contractId().toString("hex") || "";   // ContractHash
}
`.trim()

const codeMethodResponse = `
if (gtr.status === SorobanRpc.GetTransactionStatus.SUCCESS) {
    response = response as SorobanRpc.GetSuccessfulTransactionResponse;
    const ret: xdr.ScVal = response.returnValue;
} 
`.trim()
