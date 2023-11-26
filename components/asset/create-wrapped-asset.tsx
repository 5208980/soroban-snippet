"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getUserInfo } from "@stellar/freighter-api";
import { Asset, BASE_FEE, Keypair, SorobanRpc, StrKey, TransactionBuilder, xdr } from "soroban-client";
import { assetPayment, changeTrust, createWrapTokenOp, getAssetContractId, hexToByte, initaliseTransactionBuilder, signTransactionWithWallet, submitTx, submitTxAndGetContractId, tipAccount } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "@/components/shared/console-log";
import { Title } from "@/components/shared/title";
import { Input } from "@/components/shared/input";

export interface CreateWrappedAssetProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const CreateWrappedAsset = ({ }: CreateWrappedAssetProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
    const [publicKey, setPublicKey] = useState<string>("");
    const [dummyAccount, setDummyAccount] = useState<Keypair | null>(null);

    const loadDummyAccount = async () => {
        const sk = localStorage.getItem("SOROBANSNIPPETDUMMYACCOUNT");

        if (!sk) {
            const kp = Keypair.random();
            localStorage.setItem("SOROBANSNIPPETDUMMYACCOUNT", kp.secret());
            const response = await tipAccount(kp.publicKey(), "https://friendbot.stellar.org");
            setDummyAccount(kp);
        } else {
            const kp = Keypair.fromSecret(sk);
            const response = await tipAccount(kp.publicKey(), "https://friendbot.stellar.org");
            setDummyAccount(Keypair.fromSecret(sk));
        }
    }

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
            loadDummyAccount();     // don't need to await this
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
    const createAsset = async (
        assetCode: string,
        limit: string = "10000000"
    ): Promise<Asset | undefined> => {
        if (dummyAccount === null) {
            consoleLogRef.current?.appendConsole(`Error issuer`);
            return;
        }

        const asset = new Asset(assetCode, dummyAccount.publicKey());
        consoleLogRef.current?.appendConsole(`Creating asset: ${asset.getCode()}-${asset.getIssuer()}`);

        try {
            // Create asset trustline
            consoleLogRef.current?.appendConsole(`Creating Trustline ...`);
            const trusted: boolean = await createAssetTrustline(asset, limit, dummyAccount);

            if (!trusted) {
                return;
            }

            // Fund the asset
            consoleLogRef.current?.appendConsole(`Funding Trustline ...`);
            const fundedAsset = await fundAsset(asset, limit);

            if (fundedAsset) {
                return fundedAsset;
            }
        } catch (error) {
            console.error("Asset creation failed:", error);
        }

        return;
    }

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

    const [assetCode, setAssetCode] = useState<string>("SORO");
    const [limit, setLimit] = useState<string>("10000000");
    const [asset, setAsset] = useState<Asset | null>(null);
    const handleGetContract = async () => {
        if (!dummyAccount) {
            consoleLogRef.current?.appendConsole(`Error creating issuer`);
            return;
        }

        const asset: Asset = await createAsset(assetCode, limit) || Asset.native();

        if (asset.isNative()) {
            consoleLogRef.current?.appendConsole(`# Error creating asset`);
            return;
        }

        setAsset(asset);
        consoleLogRef.current?.appendConsole(`Asset Created: ${asset.getCode()}-${asset.getIssuer()}`);
    }

    const wrapAsset = async () => {
        if (!dummyAccount) {
            consoleLogRef.current?.appendConsole(`Error creating issuer`);
            return;
        }

        if (!asset) {
            consoleLogRef.current?.appendConsole(`Please Create asset first`);
            return;
        }

        consoleLogRef.current?.appendConsole(`Asset Created: ${asset.getCode()}-${asset.getIssuer()}`);

        const contractId: string = getAssetContractId(asset, sdk.selectedNetwork.networkPassphrase);
        const contractAddress: string = sdk.util.toContractAddress(contractId);
        consoleLogRef.current?.appendConsole(`Predicted Asset Hash: ${contractId}`);
        consoleLogRef.current?.appendConsole(`Predicted Asset Contract: ${contractAddress}`);

        try {
            consoleLogRef.current?.appendConsole(`Wrapping Asset ...`);
            const txBuilder: TransactionBuilder = await initTxBuilder();
            const tx = await createWrapTokenOp(
                txBuilder,
                sdk.server,
                asset,
                contractAddress
            );

            const signedTx = await sign(tx.toXDR());

            const contractREsult = await submitTxAndGetContractId(
                signedTx, sdk.server, sdk.selectedNetwork);

            const contract_id = StrKey.encodeContract(hexToByte(contractREsult));

            consoleLogRef.current?.appendConsole(`Wrapped Asset Hash: ${contractREsult}`);
            consoleLogRef.current?.appendConsole(`Wrapped Asset Contract: ${contract_id}`);

        } catch (e: any) {
            consoleLogRef.current?.appendConsole(e);
            if (e.toString().includes("ExistingValue")) {
                consoleLogRef.current?.appendConsole(`Asset already wrapped`);
            }
        }
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
                If you have not check out how to create a Stellar Asset, please check out
                <a href="/asset/create-stellar-asset"> Creating Stellar Asset</a> first.
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
                <Input type="text" onChange={(e) => setAssetCode(e.target.value)}
                    value={assetCode}
                    placeholder="Asset Code" />
                <Input type="text" disabled={true}
                    value={(dummyAccount && dummyAccount.publicKey()) || ""} />
            </div>
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleGetContract)}>
                    Create Stellar Asset
                </Button>

                <Button disabled={!asset} onClick={() => excute(wrapAsset)}>
                    {!asset ? "Create Asset First" : "Wrap Asset"}
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
import { Asset, BASE_FEE, Keypair, SorobanRpc, StrKey, TransactionBuilder, xdr } from "soroban-client";

export const createWrapTokenOp = async (
    txBuilder: TransactionBuilder,
    server: Server,
    asset: Asset,
    contractId: string,
) => {
    const addr = new Address(contractId);

    const ledgerKey = new xdr.LedgerKeyContractData({
        contract: addr.toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
        // bodyType: xdr.ContractEntryBodyType.dataEntry()
    });

    xdr.LedgerKey.contractData(ledgerKey);

    const contractIdPreimageFromAddress = xdr.ContractIdPreimage
        .contractIdPreimageFromAsset(asset.toXDRObject());
    const contractArgs = new xdr.CreateContractArgs({
        contractIdPreimage: contractIdPreimageFromAddress,
        executable: xdr.ContractExecutable.contractExecutableToken(),
    });

    const hf = xdr.HostFunction.hostFunctionTypeCreateContract(contractArgs);
    let op: any = Operation.invokeHostFunction({
        func: hf,
        auth: [],
    });

    let tx: Transaction = txBuilder
        .addOperation(op)
        .setTimeout(TimeoutInfinite)
        .build();

    tx = await server.prepareTransaction(tx) as Transaction;
    return tx;
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

