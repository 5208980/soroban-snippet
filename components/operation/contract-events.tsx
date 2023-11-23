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

export interface ContractEventsProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const ContractEvents = ({ }: ContractEventsProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
    const [publicKey, setPublicKey] = useState<string>("");
    const [contractAddress, setContractAddress] = useState<string>("");

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

            const contractAddress = await getContract(sdk.selectedNetwork.network);
            setContractAddress(contractAddress);
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

    const handleContractEvents = async () => {
        const ledger = await sdk.server.getLatestLedger();
        const mintTopic = xdr.ScVal.scvSymbol("core_metrics").toXDR('base64')
        const incrementTopic = xdr.ScVal.scvSymbol("read_key_byte").toXDR('base64')

        console.log(await sdk.server.getNetwork())
        console.log(ledger.sequence);
        console.log(mintTopic);
        const data: Server.GetEventsRequest = {
            startLedger: 1092200,
            filters: [
                {
                    type: "diagnostic",
                    contractIds: ["CANP33YCRUVX7B2XWUQIVZJ4RJJ7SI2IETNXKRGYB5VBQVKNXFJRBBG6"],
                    topics: [[mintTopic, incrementTopic]]
                },
            ],
            // cursor: "0004690989050499072-0000000000",
            // limit: 10,
        }
        console.log(data);
        const events: SorobanRpc.GetEventsResponse = await sdk.server.getEvents(data);

        // let requestBody = {
        //     "jsonrpc": "2.0",
        //     "id": 8675309,
        //     "method": "getEvents",
        //     "params": {
        //         "startLedger": "1092200",
        //         "filters": [
        //             {
        //                 "type": "contract",
        //                 "contractIds": [
        //                     "CANP33YCRUVX7B2XWUQIVZJ4RJJ7SI2IETNXKRGYB5VBQVKNXFJRBBG6"
        //                 ],
        //                 "topics": [
        //                     [
        //                         mintTopic
        //                     ]
        //                 ]
        //             }
        //         ],
        //     }
        // }
        // let res = await fetch('https://rpc-futurenet.stellar.org:443', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify(requestBody),
        // })
        // let events = await res.json()

        console.log(events);
    }

    const deployEventContract = async () => {
        // const response = await fetch(`/api/event`, { method: "POST", });
        // const wasm = await response.blob();
        // const wasmId = await sdk.contract.deployWasm(wasm, publicKey);
        const wasmId = "db21a5dd5882c0f76e25e28174d3f83f2d70f57f4837a3f26ca7bf812f7bfa11";

        // const contractId = await sdk.contract.deploy(wasmId, publicKey);
        // console.log(sdk.util.toContractAddress(contractId))

        // Futurenet: CANP33YCRUVX7B2XWUQIVZJ4RJJ7SI2IETNXKRGYB5VBQVKNXFJRBBG6
        const contractAddress = "CANP33YCRUVX7B2XWUQIVZJ4RJJ7SI2IETNXKRGYB5VBQVKNXFJRBBG6";
        const txBuilder = await initTxBuilder();
        const method = "increment";
        const tx = await prepareContractCall(
            txBuilder, sdk.server, contractAddress,
            method, []);

        const signed = await sign(tx.toXDR());

        let response = await submitTx(signed.tx, sdk.server, sdk.selectedNetwork);

        if (SorobanRpc.GetTransactionStatus.SUCCESS === response.status) {
            response = response as SorobanRpc.GetSuccessfulTransactionResponse;
            console.log(response.returnValue);
            consoleLogRef.current?.appendConsole(`Contract call successful.`);
            consoleLogRef.current?.appendConsole(`Return value: ${response.returnValue?.switch().name || "scvVoid"}`);
        } else {
            consoleLogRef.current?.appendConsole(`Something went wrong`);
        }
    }

    return (
        <div className="pb-32">
            <Title>Contract Events</Title>

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>

            <Button onClick={() => excute(deployEventContract)}>
                Deploy Contract
            </Button>
            <ConsoleLog ref={consoleLogRef} />
            <CodeBlock code={sampleContractEvents} />
            <Button onClick={() => excute(handleContractEvents)}>
                Call mint
            </Button>
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const sampleContractEvents = `
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
