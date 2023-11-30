"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getUserInfo } from "@stellar/freighter-api";
import { BASE_FEE, Contract, Memo, SorobanRpc, TimeoutInfinite, Transaction, TransactionBuilder, xdr, } from "stellar-sdk";
import { initaliseTransactionBuilder, prepareContractCall, signTransactionWithWallet } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { getContract } from "@/utils/util";

export interface GasEstimationProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const GasEstimation = ({ }: GasEstimationProps) => {
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
            "GC5S4C6LMT6BCCARUCK5MOMAS4H7OABFSZG2SPYOGUN2KIHN5HNNMCGL", BASE_FEE, sdk.server,
            sdk.selectedNetwork.networkPassphrase);
    }

    const sign = async (tx: string) => {
        return await signTransactionWithWallet(tx, publicKey, sdk.selectedNetwork);
    }
    //#endregion

    const handleGasEstimate = async () => {
        const contractAddress: string = await getContract(sdk.selectedNetwork.network);
        const method: string = "mint";
        const params: xdr.ScVal[] = [
            sdk.nativeToScVal("GBHAOSNA7PJOGKWPAQ2VYAY4Y2VMA5LKOPQVCFRXJNJG5YXV4ELEX2GZ", "address"),
            sdk.nativeToScVal(1000, "i128")
        ];
        const contract = new Contract(contractAddress);
        let txBuilder: TransactionBuilder = await initTxBuilder();

        txBuilder = txBuilder
            .addOperation(contract.call(method, ...params))
            .setTimeout(TimeoutInfinite);
        // If you want to add memo
        const memo = "Testing gas estimation"
        if (memo.length > 0) {
            txBuilder = txBuilder.addMemo(Memo.text(memo));
        }
        const tx: Transaction = txBuilder.build();
        // const tx = await prepareContractCall(txBuilder, sdk.server, contractAddress, method, params);
        console.log(tx);

        consoleLogRef.current?.appendConsole("# Stimulating mint('GBHAOSNA7PJOGKWPAQ2VYAY4Y2VMA5LKOPQVCFRXJNJG5YXV4ELEX2GZ', 1000) ...");

        const sim: SorobanRpc.Api.SimulateTransactionResponse = await sdk.server.simulateTransaction(tx)
        console.log(sim)

        // if (SorobanRpc.Api.isSimulationError(response)) {
        //     throw new Error(`Simulation Error: ${response.error}`);
        // }

        // console.log(response)
        // const classicFeeNum = parseInt(raw.fee, 10) || 0;
        // const minResourceFeeNum = parseInt(response.minResourceFee, 10) || 0;
        // const fee = (classicFeeNum + minResourceFeeNum).toString();

        // consoleLogRef.current?.appendConsole(`# Stimulated Minimum fee = ${minResourceFeeNum}`);
        // consoleLogRef.current?.appendConsole(`# Estimated fee = Stimulated Minimum fee + transaction fee = ${classicFeeNum} + ${minResourceFeeNum} = ${fee}`);
        // return fee;
    }

    return (
        <div className="pb-32">
            <Title>Getting Gas Estimation in Stellar</Title>

            <Header2>Introduction</Header2>
            <div>
                In this section, we&apos;ll delve into the a simple method of obtaining gas estimates,
                providing you with valuable insights for to a transaction before its is sent on chain.
                Whether you&apos;re navigating Soroban smart contract invocations or other Stellar
                operations. If you want in depth details on how fees or gas are measure, the offical
                documentation is here: https://soroban.stellar.org/docs/fundamentals-and-concepts/fees-and-metering
            </div>

            <Header2>Code</Header2>
            <p>
                In this demonstration, we&apos;ll create a simple equation that could be used to
                estimate transaction fees before executing a smart contract method on the
                Soroban blockchain. Simply make a call to <Code>stimulateTransaction</Code>
                (it&apos;s like a trial run for your contract invocation). What you get in
                return is a detailed response containing crucial information, in our case, the fee
                along with other transaction metadata.
            </p>
            <CodeBlock code={code} />
            Parameters:

            contractAddress: The address of the smart contract.
            txBuilder: An instance of TransactionBuilder used for constructing the transaction.
            server: An instance of Server representing the Soroban blockchain server.
            memo: A string representing the memo to be included in the transaction.
            method: A string specifying the method to be called on the smart contract.
            params: An array of xdr.ScVal representing the parameters for the smart contract method.
            Transaction Preparation:

            A new Contract instance is created using the provided contractAddress.
            A transaction is constructed using the provided txBuilder, and an operation is added to call the specified smart contract method with the provided parameters.
            The transaction timeout is set to TimeoutInfinite.
            Memo Handling:

            If a memo is provided (its length is greater than 0), it is added to the transaction using the addMemo method.
            Transaction Simulation:

            The raw transaction is built from the prepared transaction.
            The simulateTransaction method is called on the Soroban server (server) with the raw transaction.
            The response from the simulation is stored in the response variable.
            Simulation Error Handling:

            If the simulation results in an error, the function throws an error with a message containing the simulation error.
            Fee Calculation:

            If no simulation error occurs, the classic fee and minimum resource fee from the raw transaction and simulation response are parsed into numeric values.
            The total fee is calculated by summing the classic and minimum resource fees.
            The calculated fee is returned as a string.

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <p>
                The provided code snippet is an example of estimating the gas
                cost for invoking a specific method, &quot;mint&quot;, on a Soroban smart
                Token written in Rust. The contract is identified by its address,
                and the method takes two parameters: an <Code>address</Code> and an
                <Code>i128</Code> value. The code then simulates the transaction on
                the Soroban server and calculate a fee based on the estimation equation.
                This functionality is useful for developers to assess the gas cost  before executing
                a method on a Soroban smart contract.
            </p>
            <CodeBlock code={sampleGasEstimate} />
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleGasEstimate)}>
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
import { BASE_FEE, Contract, Memo, SorobanRpc, TimeoutInfinite, TransactionBuilder, xdr } from "stellar-sdk";

export const getEstimatedFee = async (
    contractAddress: string,
    txBuilder: TransactionBuilder,
    server: SorobanRpc.Server,
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

