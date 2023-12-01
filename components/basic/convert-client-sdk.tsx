"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getUserInfo } from "@stellar/freighter-api";
import { initaliseTransactionBuilder, signTransactionWithWallet } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { NetworkDetails, RPC, TESTNET_DETAILS, getRPC } from "@/utils/network";
import { RPCTable } from "../other/rpc-table";
import { SorobanRpc, Networks, BASE_FEE } from 'stellar-sdk';
import { Reference } from "../shared/link";
import { Header3 } from "../shared/header-3";
const { Server } = SorobanRpc;

export interface ConvertClientSDKProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const ConvertClientSDK = ({ }: ConvertClientSDKProps) => {
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
        const server: SorobanRpc.Server = new Server(getRPC(networkDetails) || RPC.Testnet, {
            allowHttp: networkDetails.networkUrl.startsWith("http://")
        })

        const { status } = await server.getHealth();
        const { protocolVersion } = await server.getNetwork();
        consoleLogRef.current?.appendConsole(`# Status: ${status}`);
        consoleLogRef.current?.appendConsole(`# Protocol Version: ${protocolVersion}`);
    }

    const handleRpcLogs = async () => {
        consoleLogRefRPC.current?.appendConsole(`# Testnet: ${Networks.TESTNET}`);
        consoleLogRefRPC.current?.appendConsole(`# Mainnet (public): ${Networks.PUBLIC}`);
    }
    return (
        <div className="pb-32">
            <Title>Migration between `soroban-client` to `stellar-sdk`</Title>

            <Header2>Introduction</Header2>
            <p>

                This short section will detail the two JS library available when building with Soroban.
                <Code>soroban-client</Code> and <Code>stellar-sdk</Code>. For dapps currently utilizing
                <Code>soroban-client</Code> it would be beneficial to migrate to <Code>stellar-sdk</Code>
                as freatures in <Code>soroban-client</Code> library has been merged into this stellar-sdk,
                so you get all the features of both stellar and Soroban.
            </p>

            <p>
                As of current (with Futurenet still available), <Code>soroban-client</Code> is beneficial with the support
                to connect with Futurenet, so can use <Code>soroban-client</Code> if you want to connect to Futurenet.
            </p>

            <Header2>Code</Header2>
            <p>
                The migration are very simple, the main features are imported the same, but for other noticable `Class` and `Types` such as,
                <i>Note: This is not an exhaustive sample, rather things developers used often</i>
            </p>

            <Header3>Server</Header3>
            <CodeBlock code={serverCode} />

            <Header3>SorobanRpc</Header3>
            <CodeBlock code={apiCode} />

            <Header3>AssembleTransaction</Header3>
            <CodeBlock code={assembleTransactionCode} />
        </div>
    )
}

const serverCode = `
// Using soroban-client
// import { Server } from 'soroban-client';
// const server: Server = new Server("https://soroban-testnet.stellar.org/", {
//     allowHttp: true
// })

// Using stellar-sdk
import { SorobanRpc } from 'stellar-sdk';
const { Server } = SorobanRpc;
const server: SorobanRpc.Server = new Server("https://soroban-testnet.stellar.org/", {
    allowHttp: true
})
`.trim()

const apiCode = `
// Using soroban-client
// import { SorobanRpc } from 'soroban-client';
const status = SorobanRpc.GetTransactionStatus.SUCCESS;

// Using stellar-sdk
import { SorobanRpc } from 'stellar-sdk';
const status = SorobanRpc.Api.GetTransactionStatus.SUCCESS;
`.trim();

const assembleTransactionCode = `
// Using soroban-client
// import { assembleTransaction } from 'soroban-client';
const tx: Transaction = new Transaction();
const status = assembleTransaction(tx);

// Using stellar-sdk
import { SorobanRpc } from 'stellar-sdk';
const { assembleTransaction } = SorobanRpc;
const tx: Transaction = new Transaction();
const status = assembleTransaction(tx);
`.trim();