"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getUserInfo } from "@stellar/freighter-api";
import { BASE_FEE, Keypair, StrKey, xdr } from "stellar-sdk";
import { initaliseTransactionBuilder, signTransactionWithWallet, uploadContractWasmOp } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { NetworkDetails } from "@/utils/network";
import { Input } from "../shared/input";

export interface ValidationStellarInformationProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const ValidationStellarInformation = ({ }: ValidationStellarInformationProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
    const consoleLogRefSK = useRef({} as any);
    const consoleLogRefContract = useRef({} as any);
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

    const [pk, setPK] = useState<string>("");
    const handlePublicKeyValidation = async () => {
        const validity: Boolean = StrKey.isValidEd25519PublicKey(pk)
        consoleLogRef.current?.appendConsole(`Is ${pk} a valid public key? ${validity}`);

        const muxed: any = xdr.MuxedAccount.keyTypeEd25519(Buffer.from(pk, "base64"));
        console.log(muxed)
    }

    const [sk, setSK] = useState<string>("");
    const handleSecretKeyValidation = async () => {
        const validity: Boolean = StrKey.isValidEd25519SecretSeed(sk)
        consoleLogRefSK.current?.appendConsole(`Is ${sk} a valid secret key? ${validity}`);
    }

    const [contract, setContract] = useState<string>("");
    const handleContractValidity = async () => {
        const k = Keypair.random();
        console.log(k.secret());
        // const validity: Boolean = StrKey.isValidContract(pk)
        const validity: Boolean = contract.length === 56 && contract.startsWith("C");
        consoleLogRefContract.current?.appendConsole(`Is ${pk} a valid contract? ${validity}`);
    }

    return (
        <div className="pb-32">
            <Title>Validating Stellar/Soroban Information</Title>

            <Header2>Introduction</Header2>
            <p>
                In this section, we will go over simply validation methods that are
                able in the Soroban SDK. These include being able to validate public keys,
                secret keys and contracts ids. These methods will help ensure that the inputs
                to these information are authenticity and valid in what ever is need to be use
                in your dapp. For example, ensuring that passing a valid public key an <Code>Address</Code>
                or to a <Code>xdr.ScVal</Code> object.
            </p>

            <Header2>Validating Public Key</Header2>
            <CodeBlock code={`export type GetTransactionResponse = GetSuccessfulTransactionResponse | GetFailedTransactionResponse | GetMissingTransactionResponse;`} />

            <Input type="text" onChange={(e) => setPK(e.target.value)}
                value={pk} placeholder="Public Key" />
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handlePublicKeyValidation)}>
                    Valiate Secret Key
                </Button>
                <Button override={true} onClick={() => setPK("GDJWYMKAHRUXYL7Y6FBSAJXWLYHI644K4KEORZBJ6SI2QZ2LPIZEB7XB")}>
                    Load Valid Public Key
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRef} />

            <Header2>Validating Secret Key</Header2>
            <CodeBlock code={isValidEd25519SecretSeedCode} />

            <Input type="text" onChange={(e) => setSK(e.target.value)}
                value={sk} placeholder="Secret" />
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleSecretKeyValidation, consoleLogRefSK)}>
                    Valiate Secret Key
                </Button>
                <Button override={true} onClick={() => setSK("SCDX77J2STRK5Y2K2TTB6C4XMKIWZ2QCIJBVJMMNW7HFGROV32USE5K7")}>
                    Load Valid Secret Key
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRefSK} />

            <Header2>Validating Contract</Header2>
            <CodeBlock code={isValidContractCode} />

            <Input type="text" onChange={(e) => setContract(e.target.value)}
                value={contract} placeholder="Contract" />
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleContractValidity, consoleLogRefContract)}>
                    Valiate Contract
                </Button>
                <Button override={true} onClick={() => setContract("CDES3YLWWIWGMWAT4IHYUB3B4MNQMPHE3UYBMWDLONUOEY3VRNISEQHK")}>
                    Load Valid Contract
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRefContract} />
        </div >
    )
}

const isValidEd25519PublicKeyCode = `
import { StrKey, xdr } from "stellar-sdk";

const input: string = "GDJWYMKAHRUXYL7Y6FBSAJXWLYHI644K4KEORZBJ6SI2QZ2LPIZEB7XB"
const isValid: Boolean = !StrKey.isValidEd25519PublicKey(input)

assert(isValid);    // Should be true
}`.trim()

const isValidEd25519SecretSeedCode = `
import { StrKey, xdr } from "stellar-sdk";

const input: string = "GDJWYMKAHRUXYL7Y6FBSAJXWLYHI644K4KEORZBJ6SI2QZ2LPIZEB7XB"
const isValid: Boolean = !StrKey.isValidEd25519SecretSeed(input)

assert(isValid);    // Should be true
}`.trim()

const isValidContractCode = `
import { StrKey, xdr } from "stellar-sdk";

const input: string = "GDJWYMKAHRUXYL7Y6FBSAJXWLYHI644K4KEORZBJ6SI2QZ2LPIZEB7XB"
const isValid: Boolean = !StrKey.isValidContract(input)

assert(isValid);    // Should be true
}`.trim()
