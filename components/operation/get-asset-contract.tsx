"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { Asset, BASE_FEE, hash, xdr } from "soroban-client";
import { createHash } from "crypto";
import { getAssetContractId, initaliseTransactionBuilder, signTransactionWithWallet, submitTxAndGetWasmId, uploadContractWasmOp } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";

export interface GetAssetContractProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const GetAssetContract = ({ }: GetAssetContractProps) => {
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

    const handleGetContract = async () => {
        const asset = Asset.native();
        consoleLogRef.current?.appendConsole(`# Asset: ${asset.getCode()}-${asset.getIssuer()}`);

        const contractHash: string = await getAssetContractId(
            asset, sdk.selectedNetwork.networkPassphrase);
        const contractAddress: string = sdk.util.toContractAddress(contractHash);
        consoleLogRef.current?.appendConsole("# Wrapped contract:");
        consoleLogRef.current?.appendConsole(`# ${contractAddress}`);
    }

    return (
        <div className="pb-32">
            <Title>Obtaining Soroban contract from Wrapped Stellar Assets</Title>

            <Header2>Introduction</Header2>
            <div>
                This section covers how to obtain a Soroban contract from a Wrapped Stellar Asset.
            </div>
            <CodeBlock language={"bash"} code={cliCode} />

            <Header2>Prerequistes</Header2>
            <p>This assume you have a compiled <Code>.wasm</Code> file that has been generated
                from a Rust and <Code>Make</Code></p>

            <Header2>Prerequistes</Header2>
            <p>
                The uploadContractWasmOp function is designed to facilitate the
                upload of a WebAssembly (Wasm) smart contract to a Soroban or Stellar blockchain.
                This function is asynchronous and returns a Promise that resolves
                to a Transaction object that can be used to sign and submit to Stellar
            </p>
            <CodeBlock code={code} />

            <Header2>On the web</Header2>
            <UList>

                <li>
                    <h3>Create HostFunction Object:</h3>
                    <p>
                        The function initiates by creating a <Code>HostFunction</Code> object (<Code>hf</Code>) using the
                        <Code>xdr.HostFunction.hostFunctionTypeUploadContractWasm</Code> method. This object encapsulates the
                        details of the upload contract Wasm operation.
                    </p>
                </li>
                <li>
                    <h3>Create Operation Object:</h3>
                    <p>
                        An operation object (<Code>op</Code>) is then created using the <Code>Operation.invokeHostFunction</Code>
                        method. The <Code>func</Code> parameter is set to the previously created <Code>hf</Code>, and the
                        <Code>auth</Code> parameter is an empty array since no additional authorization is required for this specific
                        operation.
                    </p>
                </li>
                <li>
                    <h3>Build Transaction:</h3>
                    <p>
                        Utilizing the provided <Code>txBuilder</Code>, the function adds the created operation (<Code>op</Code>) to the
                        transaction, sets an infinite timeout using <Code>.setTimeout(TimeoutInfinite)</Code>, and builds the
                        transaction.
                    </p>
                </li>
                <li>
                    <h3>Prepare Transaction:</h3>
                    <p>
                        The function then uses the <Code>server.prepareTransaction</Code> method to prepare the transaction for
                        submission. The result is cast to a <Code>Transaction</Code> object.
                    </p>
                </li>
            </UList>

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <p>
                TODO
            </p>

            <CodeBlock code={sampleUploadContractWasmOp} />
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleGetContract)}>
                    Generate Operation XDR
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
import { Asset, BASE_FEE, hash, xdr } from "soroban-client";
import { createHash } from "crypto";

export const getAssetContractId = (
    asset: Asset,
    networkPassphrase: string
) => {
    // A hex-encoded SHA-256 hash of this transaction’s XDR-encoded form.
    const networkId = createHash('sha256').update(networkPassphrase).digest('hex');
    const networkIdBuffer = Buffer.from(networkId, 'hex');

    const contractIdPreimage = xdr.ContractIdPreimage
        .contractIdPreimageFromAsset(asset.toXDRObject());
    const hashIDPreimage = new xdr.HashIdPreimageContractId({
        networkId: networkIdBuffer,
        contractIdPreimage: contractIdPreimage
    });
    const preimage = xdr.HashIdPreimage
        .envelopeTypeContractId(hashIDPreimage);

    const contractId = hash(preimage.toXDR()).toString('hex');
    return contractId;
}
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

