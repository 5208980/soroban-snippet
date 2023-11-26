"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getUserInfo } from "@stellar/freighter-api";
import { Asset, BASE_FEE, hash, xdr } from "soroban-client";
import { createHash } from "crypto";
import { initaliseTransactionBuilder, signTransactionWithWallet } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "@/components/shared/console-log";
import { Title } from "@/components/shared/title";
import { Input } from "@/components/shared/input";

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

    const getAssetContractId = (
        asset: Asset,
        networkPassphrase: string
    ): string => {
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

    const [code, setCode] = useState<string>("SORO");
    const [issuer, setIssuer] = useState<string>("GBRYEAPXXG6T3MY6I7VBGLMEPBKZCAYFBETLBZ5B37AJVVBJV6NCDE76");
    const handleGetContract = async () => {
        if (!code || !issuer) {
            consoleLogRef.current?.appendConsole("Code and Issuer are required");
            return;
        }
        const asset = new Asset(code, issuer);
        const contractId: string = getAssetContractId(asset, sdk.selectedNetwork.networkPassphrase);
        consoleLogRef.current?.appendConsole(`Asset Contract ID: ${sdk.util.toContractAddress(contractId)}`);
        consoleLogRef.current?.appendConsole(`Asset Type: ${asset.getAssetType()}`);
    }

    const handleFromAsset = async () => {
        if (!code || !issuer) {
            consoleLogRef.current?.appendConsole("Code and Issuer are required");
            return;
        }
        const asset = new Asset(code, issuer);
        // consoleLogRef.current?.appendConsole(`Asset Contract ID: ${asset.contractId(sdk.selectedNetwork.networkPassphrase)}`);
        consoleLogRef.current?.appendConsole(`Asset Type: ${asset.getAssetType()}`);
    }

    return (
        <div className="pb-32">
            <Title>Obtaining Soroban contract from Wrapped Stellar Assets</Title>

            <Header2>Introduction</Header2>
            <div>
                This section covers how to obtain a Soroban contract from a Wrapped Stellar Asset.
                The first section will cover the implementation of how Stellar Assets are converted
                to Soroban contracts, and the second section shows an abstraction to the implementation
                available by the `Asset` class of the `soroban-client` library. Note when calling
                these methods, the contract are <b>hypothetical</b> and thus may not exist if not wrapped
                or created.
            </div>

            <Header2>ContractIdPreimage</Header2>
            <p>
                As mention we use the <Code>ContractIdPreimage</Code> to calculate the
                hypothetical contract ID of a given asset. That includes using the `networkPassphrase`
                as well as the `xdr.Asset` object. The resulting preimage is
                then hashed as the result is a contract hash, and is converted
                to a contract Id starting with <i>C</i>
            </p>
            <CodeBlock code={codePreimage} />

            <Header2>Using <Code>Asset.contractId()</Code></Header2>
            <p>
                As of learning about this, <Code>Asset</Code> class has a method
                called <Code>contractId()</Code> that returns the contract ID of the asset,
                with a very similar implementation to the one above. So using
                either method is fine.
            </p>
            <CodeBlock code={codeAsset} />

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <CodeBlock code={sampleUploadContractWasmOp} />

            <div className="flex space-x-2 my-4">
                <Input type="text" onChange={(e) => setCode(e.target.value)}
                    value={code} placeholder="Asset Code" />
                <Input type="text" onChange={(e) => setIssuer(e.target.value)}
                    value={issuer} placeholder="Asset Issuer" />
            </div>
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleGetContract)}>
                    Get Contract ID from getAssetContractId()
                </Button>
                <Button onClick={() => excute(handleFromAsset)}>
                    Get Contract ID from Asset.contractId()
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const codeAsset = `
import { Asset, xdr } from "soroban-client";

const asset = Asset.native();
const contractId: string = asset.contractId();
`.trim()

const codePreimage = `
import { Asset, hash, xdr } from "soroban-client";

const getAssetContractId = (
    asset: Asset,
    networkPassphrase: string
): string => {
    // A hex-encoded SHA-256 hash of this transaction's XDR-encoded form.
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
import { Asset, hash, Networks, xdr } from "soroban-client";

// Setup server to determine contract Id
const server: Server = new Server("https://soroban-testnet.stellar.org/", { 
                            allowHttp: true, });

const code = "SORO";
const issuer = "GBRYEAPXXG6T3MY6I7VBGLMEPBKZCAYFBETLBZ5B37AJVVBJV6NCDE76";
const asset = new Asset(code, issuer);
const contractId: string = getAssetContractId(asset, server.passphrase || Networks.TESTNET);

// OR
// const contractId: string = asset.contractId();

console.log(contractId);
`.trim();

