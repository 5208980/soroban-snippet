"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { Asset, BASE_FEE, Keypair, SorobanRpc, hash, xdr } from "soroban-client";
import { createHash } from "crypto";
import { assetPayment, changeTrust, getAssetContractId, initaliseTransactionBuilder, signTransactionWithWallet, submitTx, submitTxAndGetWasmId, tipAccount, uploadContractWasmOp } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";

export interface CreateWrappedAssetProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const CreateWrappedAsset = ({ }: CreateWrappedAssetProps) => {
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

    //#region Create Asset
    const fundAsset = async (asset: Asset, limit: string): Promise<Asset | undefined> => {
        const txBuilder = await initTxBuilder();
        const tx = await assetPayment(txBuilder, publicKey, asset, limit);
        const signedTx = await signTransactionWithWallet(
            tx.toXDR(), publicKey!, sdk.selectedNetwork);

        if (signedTx.status) {
            console.error("Asset funding failed:", signedTx.status);
            return undefined;
        }

        try {
            const result = await handleAssetSubmit(signedTx.tx);
            if (result) {
                return asset;
            }
        } catch (e: any) {
            console.error("FundAsset submit transaction failed:", e.message);
        }

        return;
    }

    const createAssetTrustline = async (
        asset: Asset,
        limit: string,
        kp: Keypair
    ): Promise<boolean> => {
        const txBuilder = await initTxBuilder();
        const tx = await changeTrust(
            txBuilder, asset, limit, publicKey);
        const signedTx = await signTransactionWithWallet(
            tx.toXDR(), publicKey!, sdk.selectedNetwork);

        if (signedTx.status) {
            console.error("ChangeTrust operation failed:", signedTx.status);
            return false;
        }

        let trusted: boolean = false;
        try {
            const result = await handleAssetSubmit(signedTx.tx);
            console.log(result);
            (result != null) && (trusted = true);
        } catch (e: any) {
            console.error("ChangeTrust submit transaction failed:", e.message);
        }

        return trusted;
    }

    const handleAssetSubmit = async (tx: string): Promise<xdr.ScVal | undefined> => {
        try {
            // Submit transaction
            const gtr = await submitTx(tx, sdk.server, sdk.selectedNetwork);

            // Get the contractId
            if (gtr.status == SorobanRpc.GetTransactionStatus.SUCCESS && gtr.resultMetaXdr) {
                console.log("Transaction successful:", gtr.status)
                const buff = Buffer.from(gtr.resultMetaXdr.toXDR("base64"), "base64");
                const txMeta = xdr.TransactionMeta.fromXDR(buff);
                const result = txMeta.v3().sorobanMeta()?.returnValue();

                return result;
            }
        } catch (e: any) {
            console.error("ChangeTrust submit transaction failed:", e.message);
        }

        return;
    }
    //#endregion Create Asset

    const createAsset = async (
        assetCode: string,
        limit: string = "10000000"
    ): Promise<Asset | undefined> => {
        const issuer: Keypair = Keypair.random();
        const asset = new Asset(assetCode, issuer.publicKey());
        consoleLogRef.current?.appendConsole(`Creating Asset: ${asset.getCode()}-${asset.getIssuer()}`);

        const response = await tipAccount(issuer.publicKey(), "https://friendbot.stellar.org");
        console.log(response);

        console.log("Creating asset:", asset.getCode(), asset.getIssuer(), "with limit:", limit);
        try {
            // Create asset trustline
            consoleLogRef.current?.appendConsole(`Creating asset trustline ...`);
            const trusted: boolean = await createAssetTrustline(asset, limit, issuer);

            if (!trusted) {
                return;
            }

            // Fund the asset
            consoleLogRef.current?.appendConsole(`funding trustline ...`);
            const fundedAsset = await fundAsset(asset, limit);

            if (fundedAsset) {
                console.log("Asset creation successful:", fundedAsset.getCode(), fundedAsset.getIssuer());
                return fundedAsset;
            }
        } catch (error) {
            console.error("Asset creation failed:", error);
        }

        return;
    }

    const [assetCode, setAssetCode] = useState<string>("");
    const [assetIssuer, setAssetIssuer] = useState<string>(publicKey);
    const [limit, setLimit] = useState<string>("10000000");

    const handleGetContract = async () => {
        if (!assetCode) {
            consoleLogRef.current?.appendConsole(`Asset Code is required`);
            return;
        }
        const asset: Asset = await createAsset(assetCode, limit) || Asset.native();

        if (asset.isNative()) {
            consoleLogRef.current?.appendConsole(`# Error creating asset`);
            return;
        }

        consoleLogRef.current?.appendConsole(`Asset Created: ${asset.getCode()}-${asset.getIssuer()}`);
    }

    return (
        <div className="pb-32">
            <Title>Creating Asset (Classic)</Title>

            <Header2>Introduction</Header2>
            <p>

                This section involves delving into a new concepts of Assets in Stellar.
                Wrapped Assets represent an innovative approach to asset management on
                the Stellar network. In essence, a Wrapped Asset serves as a representation
                of an existing asset in Classic Stellar known as <b>SAC</b>, providing
                interoperability within the Stellar ecosystem. The following writeup will
                implement in Javascript/Typescript creating and deploying Wrapped Assets,
                offering practical insights into the intricacies of asset creation and management.
            </p>

            <p>
                As of current, the Soroban CLI offers creating wrapped assets via the
                following command:
            </p>
            <CodeBlock language={"bash"} code={cliCode} />

            <Header2>Implementation</Header2>
            <p>
                TODO
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
soroban lab token wrap \\
    --network standalone \\ 
    --source alice \\ 
    --asset "SS:bob"
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

