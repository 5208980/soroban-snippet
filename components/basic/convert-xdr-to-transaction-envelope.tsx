"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { BASE_FEE, xdr } from "stellar-sdk";
import { initaliseTransactionBuilder, signTransactionWithWallet, submitTxAndGetWasmId, uploadContractWasmOp } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { toObject } from "@/utils/util";
import { useRouter } from "next/navigation";

export interface ConvertXDRToTransactionEnvelopeProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const ConvertXDRToTransactionEnvelope = ({ }: ConvertXDRToTransactionEnvelopeProps) => {
    //#region Shared
    const router = useRouter();
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

    const [tx, setTx] = useState<string>("");
    const handleSampleUploadContractWasmOp = async (): Promise<string> => {
        consoleLogRef.current?.appendConsole("# Creating operation ...");
        const txBuilder = await initTxBuilder();
        const response = await fetch(`/api/token`, { method: 'POST', });
        const wasm = await response.blob();
        const wasmBuffer = Buffer.from(await wasm.arrayBuffer());

        // Here is the main part of the code
        consoleLogRef.current?.appendConsole("HERE");
        console.log(wasmBuffer)
        const tx = await uploadContractWasmOp(
            wasmBuffer, txBuilder, sdk.server)

        consoleLogRef.current?.appendConsole(tx.toXDR());
        setTx(tx.toXDR());
        return tx.toXDR();
    }

    const decodeTxnSorobanXdr = (str: string) => xdr.TransactionEnvelope.fromXDR(str, 'base64').v1().tx()

    const handleInstallWASM = async () => {
        const xdr: string = await handleSampleUploadContractWasmOp();
        const tx: xdr.Transaction = decodeTxnSorobanXdr(xdr);
        console.log(tx);
        consoleLogRef.current?.appendConsole("# See Console for more Transaction and its signature");
    }

    return (
        <div className="pb-32">
            <Title>Difference Transaction and Transaction Envelope</Title>

            <Header2>Introduction</Header2>
            <div>
                This section will cover how to install convert XDR string to TransactionEnvelope,
                that can be used submit to Soroban. The <Code>TransactionEnvelope</Code> class
                encapsulates a transaction ready for signing and submission on the Stellar
                network, encompassing additional metadata such as signers. It facilitates the
                preparation, signing, and conversion to and from XDR format, serving as a
                comprehensive handler for transactions in the network communication process.
                More information: https://developers.stellar.org/docs/fundamentals-and-concepts/stellar-data-structures/operations-and-transactions
            </div>
            <CodeBlock code={code} />

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <p>
                The provided code utilizes the Soroban XDR from a transaction
                and converts to a TransactionEnvelope. If valid, this will allow
                the user to the transaction <b>and</b> its signature(s).
            </p>
            <p>
                Note displaying the object will lag the browser, so it is recommended
                to use the console to view the logged object. :
            </p>

            <CodeBlock code={sampleUploadContractWasmOp} />
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleInstallWASM)}>
                    Generate Operation XDR
                </Button>
                {/* <Button disabled={tx === ""} onClick={() => router.push(`https://laboratory.stellar.org/#xdr-viewer?input=${tx}`)}>
                    View on Stellar Laboratory
                </Button> */}
            </div>
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const code = `
import { xdr } from "stellar-sdk";

const decodeTxnSorobanXdr = (str: string) => xdr.TransactionEnvelope.fromXDR(str, 'base64').v1().tx()
`.trim();

const sampleUploadContractWasmOp = `
import { xdr } from "stellar-sdk";

const decodeTxnSorobanXdr = (str: string) => xdr.TransactionEnvelope.fromXDR(str, 'base64').v1().tx()
const xdr: string = await handleSampleUploadContractWasmOp();
const tx: xdr.Transaction = decodeTxnSorobanXdr(xdr);

console.log(tx);
`.trim();

