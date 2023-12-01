"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getUserInfo } from "@stellar/freighter-api";
import { Asset, BASE_FEE, Keypair, SorobanRpc, xdr } from "stellar-sdk";
import { assetPayment, changeTrust, initaliseTransactionBuilder, signTransactionWithWallet, submitTx, tipAccount } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { Input } from "../shared/input";

export interface CreateStellarAssetProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const CreateStellarAsset = ({ }: CreateStellarAssetProps) => {
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

    //#region Helper Function
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
            txBuilder, asset, limit);
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
            if (gtr.status == SorobanRpc.Api.GetTransactionStatus.SUCCESS && gtr.resultMetaXdr) {
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
    //#endregion 

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

    const [assetCode, setAssetCode] = useState<string>("");
    const [limit, setLimit] = useState<string>("10000000");
    const handleGetContract = async () => {
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
                For more details about Asset refer to the offical documentation:
                https://developers.stellar.org/docs/fundamentals-and-concepts/stellar-data-structures/assets
            </p>

            <p>
                As of current, the Soroban CLI offers creating wrapped assets via the
                following command:
            </p>
            <CodeBlock language={"bash"} code={cliCode} />

            <p>
                Stellar Assets are uniquely identified by the combination of an asset code
                and the issuer&quot;s public key. While asset codes may be reused, the pairing
                with the issuer&quot;s address ensures the asset&quot;s uniqueness. For instance, an
                asset might be identified as
                <Code>USDC:GCYEIQEWOCTTSA72VPZ6LYIZIK4W4KNGJR72UADIXUXG45VDFRVCQTYE</Code>
            </p>

            <p>
                Creating a Stellar Asset involves the issuer transferring the
                asset to a destination address through a transaction that includes a
                payment operation. However, before receiving the asset, the destination
                address must submit a change trust operation to accept a specific asset
                not yet created. Following these steps results in the minting or creation
                of the asset, thereby increasing the total supply. Here&quot;s how the two
                operations look like:
            </p>
            <i>
                Note: The following descriptions was directly taken from the Stellar documentation:
                https://developers.stellar.org/docs/issuing-assets/how-to-issue-an-asset
            </i>

            <Header2>Create Trustline</Header2>
            <p>
                An account must establish a trustline with the issuing account to hold
                that account&quot;s asset. This is true for all assets except for Stellar&quot;s
                native token, XLM.
            </p>
            <CodeBlock code={codeTrustLine} />

            <Header2>Fund Asset</Header2>
            <p>
                Make a payment from issuing to distribution account, issuing the asset.
                The payment operation is what actually issues (or mints) the asset.
            </p>
            <CodeBlock code={codeFundAsset} />
            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <p>
                Combining the two operations above, requiring two signing from Freighter. Once they are
                successful, the asset is created and ready to be used.
            </p>
            <p>
                FOR LEARNING PURPOSE this is a dummy account so you can use it to test out the code
                do not use it in production or as primary account
            </p>
            <CodeBlock code={
                `
${sampleCreateAsset}

const asset: Asset = await createAsset(${assetCode}, ${dummyAccount?.publicKey()}, "10000");
`.trim()
            } />

            <div className="flex space-x-2 my-4">
                <Input type="text" onChange={(e) => setAssetCode(e.target.value)}
                    value={assetCode}
                    placeholder="Asset Code" />
                <Input type="text" disabled={true}
                    value={(dummyAccount && dummyAccount.publicKey()) || ""}  />
            </div>
            <div className="flex space-x-2 my-4">
                <Button disabled={!dummyAccount} onClick={() => excute(handleGetContract)}>
                    Create Stellar Asset
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

const codeTrustLine = `
import { Asset, Operation, Transaction, TransactionBuilder, xdr } from "stellar-sdk";

export const changeTrust = async (
    txBuilder: TransactionBuilder,
    asset: Asset,
    limit: string,
    distributorPubKey: string,
) => {
    const op = Operation.changeTrust({
        asset: asset,
        limit: limit,
        source: distributorPubKey,
    });
    let tx: Transaction = txBuilder
        .addOperation(op)
        .setTimeout(100)
        .build();

    return tx;
}
`.trim();

const codeFundAsset = `
import { Asset, Operation, Transaction, TransactionBuilder, xdr } from "stellar-sdk";

export const assetPayment = async (
    txBuilder: TransactionBuilder,
    destination: string,
    asset: Asset,
    amount: string = "1",
) => {
    const op = Operation.payment({
        destination,
        asset,
        amount,
    });
    let tx: Transaction = txBuilder
        .addOperation(op)
        .setTimeout(TimeoutInfinite)
        .build();

    return tx;
}
`.trim();


const sampleCreateAsset = `
import { Asset, Operation, Transaction, TransactionBuilder, xdr } from "stellar-sdk";

// See the method for createAssetTrustline: ${""}
// See the method for fundAsset: ${""}

// Here is the main part of the code
const createAsset = async (
    assetCode: string,
    issuerPublicKey: string,
    limit: string = "10000000"
): Promise<Asset | undefined> => {
    const asset = new Asset(assetCode, issuerPublicKey);

    try {
        // 1. Create asset trustline
        const trusted: boolean = await createAssetTrustline(asset, limit, dummyAccount);

        if (!trusted) {
            // Error with trustline
            return;
        }

        // 2. Fund the asset
        const fundedAsset: Asset = await fundAsset(asset, limit);

        if (fundedAsset) {
            return fundedAsset;
        }
    } catch (error) {
        console.error("Asset creation failed:", error);
    }

    return;
}
`.trim()