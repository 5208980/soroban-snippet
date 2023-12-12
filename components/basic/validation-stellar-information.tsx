"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getUserInfo } from "@stellar/freighter-api";
import { BASE_FEE, Keypair, StrKey, Transaction, TransactionBuilder, xdr } from "stellar-sdk";
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
    const consoleLogRefTransaction = useRef({} as any);
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
        consoleLogRefContract.current?.appendConsole(`Is ${contract} a valid contract? ${validity}`);
    }

    const isSorobanTransaction = (tx: Transaction): boolean => {
        if (tx.operations.length !== 1) {
            return false;
        }

        switch (tx.operations[0].type) {
            case 'invokeHostFunction':
            case 'extendFootprintTtl':
            case 'restoreFootprint':
                return true;

            default:
                return false;
        }
    }

    const [transactionXdr, setTransactionXdr] = useState<string>("");
    const handleTransactionXdrValidity = async () => {
        const tx: Transaction = TransactionBuilder.fromXDR(transactionXdr, sdk.selectedNetwork.networkPassphrase) as Transaction;
        const validity: Boolean = isSorobanTransaction(tx);
        consoleLogRefTransaction.current?.appendConsole(`Is ${sdk.util.mask(transactionXdr)} a valid contract? ${validity}`);
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
            <CodeBlock code={isValidEd25519PublicKeyCode} />

            <Input type="text" onChange={(e) => setPK(e.target.value)}
                value={pk} placeholder="Public Key" />
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handlePublicKeyValidation)}>
                    Validate Secret Key
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
                    Validate Secret Key
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
                    Validate Contract
                </Button>
                <Button override={true} onClick={() => setContract("CDES3YLWWIWGMWAT4IHYUB3B4MNQMPHE3UYBMWDLONUOEY3VRNISEQHK")}>
                    Load Valid Contract
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRefContract} />

            <Header2>Validating Transaction</Header2>
            <CodeBlock code={isValidTransactionCode} />
            <p>
                Validates if a transaction is a Soroban transaction. This is useful when you want to
                check if a transaction is a Soroban transaction before you do any further processing.
            </p>
            <CodeBlock code={isValidContractCode} />

            <Input type="text" onChange={(e) => setTransactionXdr(e.target.value)}
                value={transactionXdr} placeholder="Contract" />
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleTransactionXdrValidity, consoleLogRefTransaction)}>
                    Validate Soroban Transaction
                </Button>
                <Button override={true} onClick={() => setTransactionXdr(sampleXdr)}>
                    Load Soroban Transaction
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRefTransaction} />
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

const isValidTransactionCode = `
import { Transaction } from "stellar-sdk";

const isSorobanTransaction = (tx: Transaction): boolean => {
    if (tx.operations.length !== 1) {
        return false;
    }

    switch (tx.operations[0].type) {
        case 'invokeHostFunction':
        case 'bumpFootprintExpiration':
        case 'restoreFootprint':
            return true;

        default:
            return false;
    }
}
`.trim()

const sampleXdr = "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ACABrUIghkIEhCADrUIghkIEhCACrUIghkIEhBCLgICAABoLgwECAX8BfgJAAkACQCABp0H/AXEiAkHFAEYNAAJAIAJBC0cNACAAQRBqIAFCP4c3AwAgACABQgiHNwMIDAILIABCg5CAgIABNwMIQgEhAQwCCyABEIaAgIAAIQMgARCHgICAACEBIABBEGogAzcDACAAIAE3AwgLQgAhAQsgACABNwMACwwAEIyAgIAAQiCIpwubAgECfyOAgICAAEHQAGsiBSSAgICAAAJAAkAgAlAgA0IAUyADUCIGGw0AEJ2AgIAAIARLDQELIAVBEGpBEGogATcDACAFIAA3AxggBUIANwMQIAVBKGpBEGogATcDACAFIAA3AzAgBUIANwMoIAVBKGoQkYCAgAAhASAFIAIgAxCfgICAACAFIAStQiCGQgSENwNIIAUgBSkDCDcDQCABQbCBwIAAQQIgBUHAAGpBAhCTgICAAEIAEIKAgIAAGgJAAkAgAkIAUiADQgBVIAYbRQ0AIAQQnYCAgAAiBkkNASAFQRBqQgAgBCAGayIEIAQQkICAgAALIAVB0ABqJICAgIAADwtBgIDAgABBKxCYgICAAAALEKCAgIAAAAtbAAJAAkAgAUKAgICAgICAwAB8Qv//////////AFYNACABIAGFIAFCP4cgAoWEQgBSDQAgAUIIhkILhCEBDAELIAIgARCIgICAACEBCyAAIAE3AwggAEIANwMACwQAAAALoQEEAX8BfgF/AX4jgICAgABBIGsiBCSAgICAACAEQQhqIAAgARCagICAAAJAAkAgBCkDCCIFIAJUIgYgBEEQaikDACIHIANTIAcgA1EbDQAgByADhSAHIAcgA30gBq19IgOFg0IAWQ0BQbCAwIAAQSEQmICAgAAACxCggICAAAALIAAgASAFIAJ9IAMgBCgCGBCegICAACAEQSBqJICAgIAAC5sBAgF/An4jgICAgABBMGsiAiSAgICAACACQgE3AwAgAiABNwMIQgAhAUIAIQMCQAJAIAIQkYCAgAAiBEIBEJeAgIAARQ0AIAJBGGogBEIBEIGAgIAAEJyAgIAAIAIpAxhQRQ0BIAJBKGopAwAhAyACKQMgIQEgAhCPgICAAAsgACADNwMIIAAgATcDACACQTBqJICAgIAADwsAAAtlAQF/I4CAgIAAQTBrIgMkgICAgAAgA0IBNwMYIAMgADcDICADQRhqEJGAgIAAIQAgA0EIaiABIAIQn4CAgAAgACADKQMQQgEQgoCAgAAaIANBGGoQj4CAgAAgA0EwaiSAgICAAAt8AgF/AX4jgICAgABBEGsiAySAgICAACADIAAQooCAgAACQCADQQhqKQMAIgQgAoVCf4UgBCAEIAJ8IAMpAwAiAiABfCIBIAJUrXwiAoWDQgBTDQAgACABIAIQo4CAgAAgA0EQaiSAgICAAA8LQeCAwIAAQRwQmICAgAAAC5UBBAF/AX4BfwF+I4CAgIAAQRBrIgMkgICAgAAgAyAAEKKAgIAAAkACQCADKQMAIgQgAVQiBSADQQhqKQMAIgYgAlMgBiACURsNACAGIAKFIAYgBiACfSAFrX0iAoWDQgBZDQFBsIDAgABBIRCYgICAAAALEKCAgIAAAAsgACAEIAF9IAIQo4CAgAAgA0EQaiSAgICAAAsUAAJAIAFCAFMNAA8LEKCAgIAAAAvXAQEBfyOAgICAAEEgayIEJICAgIAAAkACQCAAQv8Bg0LNAFINACABQv8Bg0IEUg0AIAJC/wGDQskAUg0AIANC/wGDQskAUg0AIARCBDcDCCAEQQhqEJGAgIAAQgIQl4CAgAANASAAEJmAgIAAIAFCgICAgIAgWg0BIAQgAzcDGCAEIAI3AxAgBCABQoCAgIBwg0IEhDcDCEKOmJ/mw/nBMEGMgsCAAEEDIARBCGpBAxCTgICAAEICEIKAgIAAGiAEQSBqJICAgIAAQgIPCwAACxCggICAAAALxwECAX8CfiOAgICAAEEwayICJICAgIAAAkAgAEL/AYNCzQBSDQAgAkEYaiABEJyAgIAAIAIpAxhQRQ0AIAIpAyAiASACQShqKQMAIgMQpoCAgAAQloCAgAAiBBCDgICAABoQqYCAgAAgACABIAMQpICAgAAgAiAANwMoIAIgBDcDICACQo7ys9cMNwMYIAJBGGoQqoCAgAAhACACQQhqIAEgAxCfgICAACAAIAIpAxAQhICAgAAaIAJBMGokgICAgABCAg8LAAALGwBChICAgICg5QBChICAgICQ9gAQjoCAgAAaC6YBAgF/AX4jgICAgABBMGsiASSAgICAACABIAApAxA3AxAgASAAKQMINwMIIAEgACkDADcDAEEAIQADfgJAIABBGEcNAEEAIQACQANAIABBGEYNASABQRhqIABqIAEgAGopAwA3AwAgAEEIaiEADAALCyABQRhqQQMQlYCAgAAhAiABQTBqJICAgIAAIAIPCyABQRhqIABqQgI3AwAgAEEIaiEADAALC08BAX4CQCAAQv8Bg0LNAFENAAAACxCWgICAACIBEIOAgIAAGhCpgICAACAAEJmAgIAAQo7mrrnqjOTVOCABEKyAgIAAIAAQhICAgAAaQgILlAEBAn8jgICAgABBIGsiAiSAgICAACACIAE3AwggAiAANwMAQQAhAwN+AkAgA0EQRw0AQQAhAwJAA0AgA0EQRg0BIAJBEGogA2ogAiADaikDADcDACADQQhqIQMMAAsLIAJBEGpBAhCVgICAACEBIAJBIGokgICAgAAgAQ8LIAJBEGogA2pCAjcDACADQQhqIQMMAAsLdAEBfyOAgICAAEEwayICJICAgIAAAkAgAEL/AYNCzQBSDQAgAUL/AYNCzQBSDQAQqYCAgAAgAkEYaiAAIAEQmoCAgAAgAkEIaiACKQMYIAJBIGopAwAQn4CAgAAgAikDECEAIAJBMGokgICAgAAgAA8LAAALlQICAX8CfiOAgICAAEHAAGsiBCSAgICAAAJAIABC/wGDQs0AUg0AIAFC/wGDQs0AUg0AIARBGGogAhCcgICAACAEKQMYUEUNACADQv8Bg0IEUg0AIARBKGopAwAhAiAEKQMgIQUgABCDgICAABogBSACEKaAgIAAEKmAgIAAIAAgASAFIAIgA0IgiKcQnoCAgABB8oHAgABBBxCSgICAACEGIAQgATcDKCAEIAA3AyAgBCAGNwMYIARBGGoQqoCAgAAhACAEQQhqIAUgAhCfgICAACAEIANCgICAgHCDQgSENwM4IAQgBCkDEDcDMCAAIARBMGpBAhCVgICAABCEgICAABogBEHAAGokgICAgABCAg8LAAALYgEBfyOAgICAAEEgayIBJICAgIAAAkAgAEL/AYNCzQBRDQAAAAsQqYCAgAAgAUEQaiAAEKKAgIAAIAEgASkDECABQRhqKQMAEJ+AgIAAIAEpAwghACABQSBqJICAgIAAIAALqAECAX8BfiOAgICAAEEgayIDJICAgIAAAkAgAEL/AYNCzQBSDQAgAUL/AYNCzQBSDQAgA0EIaiACEJyAgIAAIAMpAwhQRQ0AIANBGGop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"
