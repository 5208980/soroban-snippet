"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { BASE_FEE, Contract, Memo, Networks, Server, SorobanRpc, TimeoutInfinite, TransactionBuilder, xdr } from "soroban-client";
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
import { NetworkDetails, RPC, TESTNET_DETAILS, getRPC } from "@/utils/network";
import { RPCTable } from "../other/rpc-table";
import { NetworkButtonProps } from "../main/network-button";

export interface ConnectToSorobanProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const ConnectToSoroban = ({ }: ConnectToSorobanProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
    const consoleLogRefRPC = useRef({} as any);
    const [disabledBtn, setDisabledBtn] = useState<boolean>(false);
    const [publicKey, setPublicKey] = useState<string>("");

    const excute = async (fn: Function, logger?: any) => {
        const loggerRef = logger || consoleLogRef;
        try {
            setDisabledBtn(true);
            loggerRef.current?.clearConsole();
            await fn();
        } catch (error) {
            loggerRef.current?.appendConsole(error);
            console.log(error);
        }
        finally {
            setDisabledBtn(false);
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

    const [networkDetails, setNetworkDetails] = useState<NetworkDetails>(TESTNET_DETAILS);
    const handleConnection = async () => {
        consoleLogRef.current?.appendConsole(`# Connecting to Soroban ${networkDetails.network.toLowerCase()} ...`);
        const server = new Server(getRPC(networkDetails) || RPC.Futurenet, {
            allowHttp: networkDetails.networkUrl.startsWith("http://") })

        const { status } = await server.getHealth();
        const { protocolVersion } = await server.getNetwork();
        consoleLogRef.current?.appendConsole(`# Status: ${status}`);
        consoleLogRef.current?.appendConsole(`# Protocol Version: ${protocolVersion}`);
    }

    const handleRpcLogs = async () => {
        consoleLogRefRPC.current?.appendConsole(`# Futurenet: ${Networks.FUTURENET}`);
        consoleLogRefRPC.current?.appendConsole(`# Testnet: ${Networks.TESTNET}`);
        consoleLogRefRPC.current?.appendConsole(`# Mainnet (public): ${Networks.PUBLIC}`);
        consoleLogRefRPC.current?.appendConsole(`# Sandbox: ${Networks.SANDBOX}`);
        consoleLogRefRPC.current?.appendConsole(`# Standalone: ${Networks.STANDALONE}`);
    }
    return (
        <div className="pb-32">
            <Title>Connecting to Soroban</Title>

            <Header2>Introduction</Header2>
            <div>
                In this section, we&apos;ll guide you through setting up and connecting 
                to the Stellar network. For comprehensive information, explore the 
                RPC list documentation available at Soroban Reference - RPC List. 
                Let&apos;s dive into the seamless connectivity to unlock the full potential 
                of Soroban! However, before we do, let&apos;s take a look at the network details here:
                https://soroban.stellar.org/docs/reference/rpc-list
            </div>

            <Header2>Code</Header2>
            <p>
                The table below shows the network details required to connect to Stellar 
                networks. You can manual create <Code>enum</Code> to represent each information
                like in the following Usage section. Alternatively, you can import the RPC 
                details from <Code>soroban-client</Code>
            </p>
            <RPCTable />

            <CodeBlock code={rpcCode} />
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleRpcLogs, consoleLogRefRPC)}>
                    Log RPC details
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRefRPC} />

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <p>
                The provided code snippet will allow you to connect to the Stellar
                Testnet. You can also connect to the Mainnet or Futurenet by changing
                the RPC network details.
            </p>
            <CodeBlock code={sampleConnection} />
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleConnection)}>
                    {`Connect to ${networkDetails.network}`}
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const rpcCode = `
import { Networks } from soroban-client

console.log(Networks.FUTURENET);
console.log(Networks.TESTNET);
console.log(Networks.MAINNET);
`.trim()

const sampleConnection = `
enum RPC {
    Mainnet = "https://rpc-mainnet.stellar.org/",   // Note Mainnet is not supported
    Testnet = "https://soroban-testnet.stellar.org/",
    Futurenet = "https://rpc-futurenet.stellar.org/"
}

enum NetworkURL {
    Mainnet = "https://horizon-mainnet.stellar.org",   // Note Mainnet is not supported
    Testnet = "https://soroban-testnet.stellar.org:443",
    Futurenet = "https://rpc-futurenet.stellar.org:443"
}

// This is the main part of the code
const server = new Server(RPC.Testnet, {
    allowHttp: NetworkURL.Testnet.startsWith("http://") })

const { status } = await server.getHealth();            // Check if Soroban is up
const { protocolVersion } = await server.getNetwork();  // Get Soroban protocol version
`.trim();

