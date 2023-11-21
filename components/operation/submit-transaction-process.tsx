"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { BASE_FEE, Server, SorobanRpc, TransactionBuilder } from "soroban-client";
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

export interface SubmitTransactionProcessProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const SubmitTransactionProcess = ({ }: SubmitTransactionProcessProps) => {
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

    const submitTx = async (
        txXDR: string,
        server: Server,
        network: NetworkDetails,
    ): Promise<SorobanRpc.GetTransactionResponse> => {
        try {
            // Deserialize the XDR transaction and set the network passphrase.
            const tx = TransactionBuilder.fromXDR(
                txXDR, network.networkPassphrase);

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
            throw new Error(`Transaction Submission Error: ${e.message}`);
        }
    };

    const handleSampleSubmit = async (): Promise<string> => {
        consoleLogRef.current?.appendConsole("# Creating and Signing Transaction ...");

        return "";
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
            <Header2>Prerequistes</Header2>
            <p>This assume you have a compiled <Code>.wasm</Code> file that has been generated
                from a Rust and <Code>Make</Code></p>

            <Header2>Looking at the response</Header2>
            <p>
                From the <Code>soroban-client</Code> package, it seems that the response will return
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

            <Header2>Usage</Header2>
            <p>
                This is what a typical submission of a transaction will look like.
            </p>
            <CodeBlock code={code} />
            
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

