"use client";

import { useSorosanSDK } from "@sorosan-sdk/react";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Code } from "@/components/shared/code";
import { Title } from "@/components/shared/title";
import { BASE_FEE, SorobanRpc, xdr } from "stellar-sdk";
import { initaliseTransactionBuilder, prepareContractCall, signTransactionWithWallet, submitTx } from "@/utils/soroban";
import { getUserInfo } from "@stellar/freighter-api";
import { useEffect, useRef, useState } from "react";
import { Button } from "../shared/button";
import { ConsoleLog } from "../shared/console-log";
import { getContract, getIncrementContract } from "@/utils/util";
import { Reference } from "../shared/link";

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
        // const mintTopic = xdr.ScVal.scvSymbol("COUNTER").toXDR('base64')
        // const incrementTopic = xdr.ScVal.scvSymbol("increment").toXDR('base64')

        // const data: SorobanRpc.Server.GetEventsRequest = {
        //     startLedger: ledger.sequence - 100,
        //     filters: [],
        // }
        // const { events }: SorobanRpc.Api.GetEventsResponse = await sdk.server.getEvents(data);

        let requestBody = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getEvents",
            "params": {
                "startLedger": (ledger.sequence - 1000).toString(),
                "filters": [],
            }
        }
        let res = await fetch(sdk.server.serverURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        })
        let events = await res.json()

        console.log(events)
        if (events && events.result && events.result.events) {
            const eventsData = events.result as SorobanRpc.Api.GetEventsResponse;    // EventResponse[]
            const contractEvents = eventsData.events.filter((event) => event.type === "contract") || [];

            // console.log(eventsData.events)
            if (eventsData.events.length === 0) {
                consoleLogRef.current?.appendConsole(`Try calling the increment function to see contract events`);
                return;
            }

            consoleLogRef.current?.appendConsole(`Found ${events.result.events.length} events`);
            consoleLogRef.current?.appendConsole(`Displaying first 5 events only`);
            consoleLogRef.current?.appendConsole(`\n`); eventsData.events.slice(0, 5).forEach((event) => {
                consoleLogRef.current?.appendConsole(`Event ${event.id} [${event.type.toUpperCase()}]:`);
                consoleLogRef.current?.appendConsole(`Ledger: \t ${event.ledger} (closed at ${event.ledgerClosedAt})`);
                consoleLogRef.current?.appendConsole(`Contract: \t 0x${event.contractId}`);
                consoleLogRef.current?.appendConsole(`Topics:`);
                event.topic.forEach((xdrTopic: any) => {
                    const topic = xdr.ScVal.fromXDR(xdrTopic, 'base64');
                    consoleLogRef.current?.appendConsole(`\t \t  ${topic.switch().name}(${topic.value()?.toString()})`);
                });

                const value = event.value as any
                const val = xdr.ScVal.fromXDR(value.xdr as any, 'base64');
                console.log(val.value()?.toString())
                consoleLogRef.current?.appendConsole(`Value: \t  ${val.switch().name}(${val.value()?.toString()})`);
            })

        } else {
            consoleLogRef.current?.appendConsole(`Try calling increment method to trigger an event ?`);
        }
    }

    const deployEventContract = async () => {
        //#region Deploy increment contract if needed
        // const wasmId = "db21a5dd5882c0f76e25e28174d3f83f2d70f57f4837a3f26ca7bf812f7bfa11";
        // const r = await fetch(`/api/event`, { method: "POST", });
        // const wasm = await r.blob();
        // const wasmId = await sdk.contract.deployWasm(wasm, publicKey);
        // console.log(wasmId)
        // const contractId = await sdk.contract.deploy(wasmId, publicKey);
        // const contractAddress = sdk.util.toContractAddress(contractId)
        // console.log(contractAddress)
        //#endregion

        const contractAddress = await getIncrementContract(sdk.selectedNetwork.network);
        const txBuilder = await initTxBuilder();
        const method = "increment";
        const tx = await prepareContractCall(
            txBuilder, sdk.server, contractAddress,
            method, []);

        const signed = await sign(tx.toXDR());
        let response = await submitTx(signed.tx, sdk.server, sdk.selectedNetwork);

        if (SorobanRpc.Api.GetTransactionStatus.SUCCESS === response.status) {
            response = response as SorobanRpc.Api.GetSuccessfulTransactionResponse;
            console.log(response.returnValue);
            consoleLogRef.current?.appendConsole(`Contract call successful.`);
            consoleLogRef.current?.appendConsole(`Return value: ${response.returnValue?.switch().name || "scvVoid"}`);
        } else {
            consoleLogRef.current?.appendConsole(`Something went wrong`);
        }
    }

    return (
        <div className="pb-32">
            <Title>Emitting and Retrieving Events</Title>

            <Header2>Emitting Event</Header2>
            <p>
                The following code snippet is from the <Code>event</Code> contract found
                <Reference href="https://github.com/stellar/soroban-examples/blob/main/events/src/lib.rs#L12"
                    target="_blank">here</Reference>.
            </p>
            <p>
                It is simply a function that increment the contract state counter and emit an event
                with the count.
            </p>
            <CodeBlock code={incrementMethodCode} />

            <Header2>Using <Code>stellar-sdk</Code></Header2>
            <CodeBlock code={apiClient} />

            <Header2>Using RPC API</Header2>
            <CodeBlock code={apiCode} />

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <p>
                Note this is using the RPC fetch as the SDK <Code>server.getEvents()</Code> isn&quot;t
                work as of now.
            </p>

            <CodeBlock code={sampleEventQuery} />
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleContractEvents)}>
                    Get Events
                </Button>
                <Button onClick={() => excute(deployEventContract)}>
                    Trigger Increment Event
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const incrementMethodCode = `
pub fn increment(env: Env) -> u32 {
    // Get the current count.
    let mut count: u32 = env.storage().instance().get(&COUNTER).unwrap_or(0); // If no value set, assume 0.

    // Increment the count.
    count += 1;

    // Save the count.
    env.storage().instance().set(&COUNTER, &count);

    // Publish an event about the increment occuring.
    // The event has two topics:
    //   - The "COUNTER" symbol.
    //   - The "increment" symbol.
    // The event data is the count.
    env.events()
        .publish((COUNTER, symbol_short!("increment")), count);

    // Return the count to the caller.
    count
}
`.trim()

const apiClient = `
import { SorobanRpc, Server, xdr } from "stellar-sdk";

// This connects to the testnet, but you can change it to appriopriate network
const server: Server = new Server("https://soroban-testnet.stellar.org/", { 
                            allowHttp: true, });

// Needed as a startLedger param for getEvents (-100 is to Buffer the ledger time)
const ledger: number = await sdk.server.getLatestLedger() - 100;

const data: Server.GetEventsRequest = {
        startLedger: ledger,
        filters: [],
    }
const events: SorobanRpc.GetEventsResponse = await sdk.server.getEvents(data);

`.trim();

const apiCode = `
import { BASE_FEE, SorobanRpc, xdr } from "stellar-sdk";
const { Server } = SorobanRpc;

// This connects to the testnet, but you can change it to appriopriate network
const server: SorobanRpc.Server = new Server("https://soroban-testnet.stellar.org/", { 
                            allowHttp: true, });

// Needed as a startLedger param for getEvents (-100 is to Buffer the ledger time)
const ledger: number = await sdk.server.getLatestLedger() - 100;

let requestBody = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getEvents",
    "params": {
        "startLedger": ledger.toString(),
        "filters": [],
    }
}
let res = await fetch(sdk.server.serverURL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
})

let events = await res.json() as SorobanRpc.GetEventsResponse
`.trim();

const sampleEventQuery = `
const events = // From one of the above methods ...

if (events && events.result && events.result.events) {
    console.log(\`Found \${ events.result.events.length } events\`);
    console.log(\`Displaying contract events only\`);

    const eventsData = events.result as SorobanRpc.GetEventsResponse;
    const contractEvents = eventsData.events.filter((event) => event.type === "contract")

    contractEvents.forEach((event) => {
        console.log(event);
        console.log(\`Event \${ event.id } [\${ event.type.toUpperCase() }]: \`);
        console.log(\`Ledger: \t \${ event.ledger } (closed at \${ event.ledgerClosedAt })\`);
        console.log(\`Contract: \t 0x\${ event.contractId } \`);
        console.log(\`Topics: \`);
        event.topic.forEach((xdrTopic: any) => {
            const topic = xdr.ScVal.fromXDR(xdrTopic, 'base64');
            console.log(\`\t \t  \${ topic.switch().name } (\${ topic.value()?.toString() })\`);
        });

        const value = event.value as any
        const val = xdr.ScVal.fromXDR(value.xdr as any, 'base64');
        console.log(\`Value: \t  \${ val.switch().name } (\${ val.value()?.toString() })\`);
    })
`.trim();