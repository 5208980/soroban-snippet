"use client";

import { useSorosanSDK } from "@sorosan-sdk/react";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Title } from "@/components/shared/title";
import { Account, Address, BASE_FEE, Contract, Server, SorobanRpc, TimeoutInfinite, Transaction, TransactionBuilder, nativeToScVal, xdr } from "soroban-client";
import { initaliseTransactionBuilder, prepareContractCall, signTransactionWithWallet, submitTx } from "@/utils/soroban";
import { getUserInfo } from "@stellar/freighter-api";
import { useEffect, useRef, useState } from "react";
import { Button } from "../shared/button";
import { ConsoleLog } from "../shared/console-log";
import { getContract } from "@/utils/util";

export interface InvokeContractCallProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const InvokeContractCall = ({ }: InvokeContractCallProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
    const [publicKey, setPublicKey] = useState<string>("");

    const excute = async (fn: Function) => {
        try {
            consoleLogRef.current?.clearConsole();
            fn();
        } catch (error) {
            consoleLogRef.current?.appendConsole(error);
            console.log(error);
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
        consoleLogRef.current?.appendConsole("# Signing transaction with wallet ...");
        return await signTransactionWithWallet(tx, publicKey, sdk.selectedNetwork);
    }
    //#endregion

    const handleContractCall = async () => {

        const txBuilder: TransactionBuilder = await initTxBuilder();
        const contractAddress = await getContract(sdk.selectedNetwork.network);
        const method: string = "mint";

        const mintTo: xdr.ScVal = new Address("GBZV3NONYSUDVTEHATQO4BCJVFXJO3XQU5K32X3XREVZKSMMOZFO4ZXR").toScVal();
        const mintAmount: xdr.ScVal = nativeToScVal(1000, { type: "i128" });
        const args: xdr.ScVal[] = [mintTo, mintAmount];
        consoleLogRef.current?.appendConsole(`# Calling ${method}(GBZV3NONYSUDVTEHATQO4BCJVFXJO3XQU5K32X3XREVZKSMMOZFO4ZXR, 1000)`);

        const tx = await prepareContractCall(
            txBuilder, sdk.server, contractAddress,
            method, args);

        const signed = await sign(tx.toXDR());
        let response = await submitTx(signed.tx, sdk.server, sdk.selectedNetwork);

        if (SorobanRpc.GetTransactionStatus.SUCCESS === response.status) {
            response = response as SorobanRpc.GetSuccessfulTransactionResponse;
            console.log(response.returnValue);
            consoleLogRef.current?.appendConsole(`# Contract call successful.`);
            consoleLogRef.current?.appendConsole(`# Return value: ${response.returnValue?.switch().name || "scvVoid"}`);
        } else {
            consoleLogRef.current?.appendConsole(`# Something went wrong`);
        }
    }

    return (
        <div className="pb-32">
            <Title>Invoking Soroban Smart Contracts</Title>

            <Header2>Introduction</Header2>
            <p>
                In this section we'll learn how to call any Soroban smart contract using Javascript.
                Leveraging the capabilities of the <Code>Contract</Code> class, we'll delve into
                interactive methods that facilitate seamless communication with the smart contract.
                The upcoming code snippet will guide you through the invocation process,
                starting with a demonstration in the command-line interface (CLI) and transitioning
                seamlessly to the world of JavaScript.
            </p>

            <p>
                The following command is the <Code>soroban-cli</Code> command to
                invoke a contract methods. Luckily <Code>soroban-client</Code> makes
                it easy to call a contract method. It calling <Code>mint</Code> method of the
                the contract token <Code>CDES3YLWWIWGMWAT4IHYUB3B4MNQMPHE3UYBMWDLONUOEY3VRNISEQHK</Code>
            </p>
            <CodeBlock language={"bash"} code={cliInvoke} />

            <Header2>contract.call</Header2>
            <div>
                The following TypeScript code snippet showcases the invocation of a
                Soroban smart contract:
            </div>
            <CodeBlock code={code} />
            <UList>
                <li>
                    <Header3>Contract Initialization:</Header3>
                    <p>
                        The <Code>Contract</Code> class is used to interact with a Soroban smart contract.
                        The constructor takes in the contract ID, starting with C of the
                        smart contract as an argument rather than the contract hash.
                    </p>
                    <CodeBlock code={`const contract = new Contract(contractAddress);`} />
                </li>
                <li>
                    <Header3>Transaction Building:</Header3>
                    <p>
                        This part involves constructing a Stellar transaction for invocation.
                        Here we are using the <Code>contract.call(string, ...xdr.ScVal)</Code>
                        It is a operation hence we need to build a transaction up to be submitted
                        to Soroban. In cases where the method doesn't need any params,
                        you can simply call <Code>contract.call("methodName")</Code>.
                    </p>
                    <CodeBlock code={sampleTransaction} />
                </li>
                <li>
                    <Header3>Transaction Preparation:</Header3>
                    <p>
                        Here, we prepare the transaction by simulating it with the Soroban server.
                        This step is crucial as it determines the storage footprint and updates
                        the transaction accordingly. The <Code>await</Code> keyword ensures
                        that we wait for the preparation to complete before proceeding.
                    </p>
                    <CodeBlock code={`tx = await server.prepareTransaction(tx) as Transaction;`} />
                </li>
            </UList>

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <UList>
                <li><strong>Configure the Contract:</strong>
                    <ul>
                        <li>Replace <Code>contractAddress</Code> with the address of the Soroban smart contract you want to interact with.</li>
                    </ul>
                </li>
                <li><strong>Invoke a Method:</strong>
                    <ul>
                        <li>Set the <Code>method</Code> variable to the specific method of the smart contract you want to invoke.</li>
                        <li>Provide any required arguments in the <Code>args</Code> array.</li>
                    </ul>
                </li>
                <li><strong>Execute the Code:</strong>
                    <ul>
                        <li>Run the code to build, prepare, and submit the transaction.</li>
                    </ul>
                </li>
            </UList>
            <CodeBlock code={sampleContractInvoke} />
            <Button onClick={() => excute(handleContractCall)}>
                Call mint
            </Button>
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const cliInvoke = `
soroban contract invoke \\
    --id CDES3YLWWIWGMWAT4IHYUB3B4MNQMPHE3UYBMWDLONUOEY3VRNISEQHK \\
    --source alice \\
    --network testnet \\
    -- \\
    mint \\
    --to GBZV3NONYSUDVTEHATQO4BCJVFXJO3XQU5K32X3XREVZKSMMOZFO4ZXR \\
    --amount 1000
`.trim()

const sampleContractInvoke = `
// Simple function to initialise a TransactionBuilder
const initialiseTransactionBuilder = async (
    server: Server,
    fee: number = BASE_FEE,
    networkPassphrase: string = Networks.TESTNET,
) => {  
    const { publicKey } = await getUserInfo();
    const source: Account = await server.getAccount(publicKey);
    return new TransactionBuilder(source, {
        fee,
        networkPassphrase
    });
}

// This connects to the testnet, but you can change it to appriopriate network
const server: Server = new Server("https://soroban-testnet.stellar.org/", { 
                            allowHttp: true, });

// Initialise a TxBuilder to build contract.call transaction
const txBuilder: TransactionBuilder = await initialiseTransactionBuilder(server);

// Method name to invoke
const method: string = "mint";

// Construct the arguments for the contract call
const args: xdr.ScVal[] = [
    new Address("GBZV3NONYSUDVTEHATQO4BCJVFXJO3XQU5K32X3XREVZKSMMOZFO4ZXR").toScVal(),
    nativeToScVal(1000, { type: "i128" })
];

// Here is the main part of the code
const tx = await invokeContractCall(
    txBuilder, 
    server, 
    contractAddress, 
    method, 
    args)

// Soroban Snippet uses Freighter to sign transaction
const signed = await signTransactionWithWallet(tx.toXDR());
const response: SorobanRpc.GetTransactionResponse = await submitTx(signed);

if (SorobanRpc.GetTransactionStatus.SUCCESS === response.status) {
    response = response as SorobanRpc.GetSuccessfulTransactionResponse;
    console.log(response.returnValue);      // Get the return value of the contract call
}

// ... Handle other SorobanRpc.GetAnyTransactionResponse types
`.trim();

const code = `
import { Contract, Server, TimeoutInfinite, Transaction, TransactionBuilder, xdr } from "soroban-client";

const invokeContractCall = async (
    txBuilder: TransactionBuilder,
    server: Server,
    contractAddress: string,
    method: string,
    args: xdr.ScVal[]
) => {
    const contract = new Contract(contractAddress);

    // Here is the main part of the code
    const tx: Transaction = txBuilder
        .addOperation(contract.call(method, ...args))
        .setTimeout(TimeoutInfinite)
        .build();

    const prepared = await server.prepareTransaction(tx) as Transaction;
    return prepared;
}
`.trim()

const sampleTransaction = `
const tx: Transaction = txBuilder
    .addOperation(contract.call("mint", ...[
        new Address("GBZV3NONYSUDVTEHATQO4BCJVFXJO3XQU5K32X3XREVZKSMMOZFO4ZXR").toScVal(),
        nativeToScVal(1000, { type: "i128" }),
    ]))
    .setTimeout(TimeoutInfinite)
    .build();
`.trim()