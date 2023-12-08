"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { createContractOp, initaliseTransactionBuilder, signTransactionWithWallet, submitTxAndGetContractId, submitTxAndGetWasmId, uploadContractWasmOp } from "@/utils/soroban";
import { Account, BASE_FEE, Transaction } from "stellar-sdk";

export interface BumpingContractProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const BumpingContract = ({ }: BumpingContractProps) => {
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

    const bumpInstance = async () => {

    }

    return (
        <div className="pb-32">
            <Title>Bumping Contract (Coming Soon)</Title>

            <CodeBlock code={sampleBumpInstance} />
            <CodeBlock code={sampleBumpdata} />
            <CodeBlock code={sampleBumpcode} />

            {/* <Button onClick={() => excute(bumpInstance)}>
                Deploy Token Contract
            </Button> */}
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const sampleBumpInstance = `
sampleBumpInstance
`.trim();

const sampleBumpdata = `
sampleBumpData
`.trim();

const sampleBumpcode = `
sampleBumpcode
`.trim();