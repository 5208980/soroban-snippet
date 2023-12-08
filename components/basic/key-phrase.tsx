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
import { SorobanRpc, BASE_FEE, Keypair } from 'stellar-sdk';
import { Reference } from "../shared/link";
import { getRandContract } from "@/utils/util";
import * as bip39 from 'bip39';
import { derivePath } from "ed25519-hd-key";
const { Server } = SorobanRpc;

export interface MnemonicWalletProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const MnemonicWallet = ({ }: MnemonicWalletProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
    const [disabledBtn, setDisabledBtn] = useState<boolean>(false);
    const [publicKey, setPublicKey] = useState<string>("");
    const [contractAddress, setContractAddress] = useState<string>("");

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
            setDisabledBtn(true);
            loggerRef.current?.appendConsole("============ Done ============");
        }
    }

    useEffect(() => {
        (async () => {
            const { publicKey } = await getUserInfo();
            setPublicKey(publicKey);

            const contractAddress = getRandContract();
            setContractAddress(contractAddress);
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

    const handleDiceRoll = async () => {
        consoleLogRef.current?.appendConsole(`Rolling Dice...`);
        const number = await sdk.call(contractAddress, "roll");
        consoleLogRef.current?.appendConsole(`Rolled ${number}`);
    }

    const generateMnemonic = async () => {
        const language: string = "english";
        const entropyBits = 128;    // 12 words
        const derivationkeypath: string = "m/44'/148'/0'";

        if (language && !bip39.wordlists["english"])
            return "";

        const wordlist = bip39.wordlists[language];
        const seedPhrase = bip39.generateMnemonic(entropyBits, undefined, wordlist);
        const phrases: string[] = seedPhrase.split(" ");

        consoleLogRef.current?.appendConsole(`12 Seed Phrase:`);
        for (let i = 0; i < phrases.length; i += 3) {
            const group = phrases.slice(i, i + 3);
            consoleLogRef.current?.appendConsole(group.join(" "));
        }

        // Get Seed from Mnemonic
        const seed = await bip39.mnemonicToSeed(seedPhrase);
        // consoleLogRef.current?.appendConsole(`Seed: ${seed.toString("hex")}`);

        // Deriving KeyPair from Seed
        const result = derivePath(derivationkeypath, seed.toString("hex"));
        const keypair = Keypair.fromRawEd25519Seed(Buffer.from(result.key));

        consoleLogRef.current?.appendConsole(``);
        consoleLogRef.current?.appendConsole(`Generating KeyPair from 12 word phrases...`);
        consoleLogRef.current?.appendConsole(`Public Key: ${keypair.publicKey()}`);
        consoleLogRef.current?.appendConsole(`Secret Key: ${keypair.secret()}`);

        setDisabledBtn(true);
    }

    return (
        <div className="pb-32">
            <Title>Generating and Deriving Stellar Accounts with Seed Phrases</Title>

            <Header2>Introduction</Header2>
            <p>
                This section will detail how to use the Bitcoin&apos;s <Code>BIP-0039</Code> implementation to generate a 12-word seed phrase (or 24).
                The seed phrase can then be used to generate a KeyPair, which can be used to sign transactions. It will follow
                the <Reference href="https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0005.md" target="_blank">
                    <Code>BIP-0039</Code>
                </Reference> standard. Note, the code below should not be used for production, but used as a guide to understand how to
                generate a KeyPair from a seed phraseand how hardware wallets can be implemented for Stellar.
            </p>

            <Header2>Ed25519</Header2>
            <p>
                Hierarchical Deterministic (HD) key derivation is a technique that allows you to derive a sequence of cryptographic 
                keys from a single root key. This hierarchy is useful for organizational purposes, such as creating a tree 
                structure of keys for different purposes like accounts and transactions. Ed25519 is a widely used elliptic curve 
                cryptography system, and it&apos;s specifically popular in the context of cryptographic keys. Ed25519 keys are used in 
                various blockchain systems, (like Stellar). We will be using the library <Code>ed25519-hd-key</Code> to derive the
                child keys from an Ed25519 master key using a specified derivation path.
            </p>
            <Header2>SEP-0005</Header2>
            <p>
                Stellar Ecosystem Proposal (<Code>SEP-0005</Code>) outlines methods for key derivation in the Stellar network, aiming to enhance
                key storage and facilitate the movement of keys between wallets and applications. The motivation behind this
                proposal is to improve key management by aligning with industry standards, allowing for uniform key derivation
                across different wallets and apps, enabling hardware wallet support, enhancing cold storage using mnemonic codes,
                and facilitating the generation of multiple keys from a single seed. The specification incorporates <Code>SLIP-0010</Code>
                for key derivation with ed25519, BIP-0044 for deterministic wallet generation, and <Code>BIP-0039</Code> for deriving binary
                seeds from mnemonic codes. The rationale behind choosing these standards lies in their widespread adoption across
                various cryptocurrencies and wallets.
            </p>

            <Header2>Generating Word Phrase with <Code>bip39</Code></Header2>
            <p>
                To get started with generating seed phrases, we will use the <Code>bip39</Code> library.
            </p>
            <CodeBlock code={`npm i --save bip39`} />

            <p>
                The provided function, <Code>generateMnemonic</Code>, is designed to asynchronously generate a mnemonic seed phrase
                for the Stellar ecosystem. It first sets the language for the mnemonic (not limited to English, see library for more details),
                the number of entropy bits (128 bits for a 12-word phrase), and the derivation key path. If the language is supported,
                it proceeds to generate the mnemonic seed phrase using the specified entropy bits and language wordlist.
                The resulting 12-word seed phrase which should be kept as a string but for the purposes of this example,
                we will split the phrase into an array of 12 words. This function can be utilized to obtain a mnemonic seed phrase
                tailored for Stellar key generation, providing a secure and standardized way to manage cryptographic keys
                in the Stellar ecosystem.
            </p>
            <CodeBlock language="rust" code={generateMnemonicCode} />

            <Header2>Deriving <Code>KeyPair</Code> from Word Phrases(Usage)</Header2>
            <p>
                Having generated a 12-word seed phrase, we can now derive a KeyPair from the seed phrase. The following code snippet
                demonstrates how to do so:
            </p>
            <CodeBlock language="rust" code={sampleCode} />
            <p>
                Note developers will need to implement <Code>ed25519-hd-key</Code>
            </p>
            <CodeBlock code={`npm i --save ed25519-hd-key`} />

            <div className="flex space-x-2 my-4">
                <Button override={true} disabled={disabledBtn} onClick={() => excute(generateMnemonic)}>
                    Generate Seed Phrase
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const generateMnemonicCode = `
import * as bip39 from 'bip39';

const generateMnemonic = async (): string[] => {
    // Set the language for the mnemonic (e.g., "english")
    const language: string = "english";

    // Set the number of entropy bits (128 bits for 12 words)
    const entropyBits = 128; 

    // Define the derivation key path
    const derivationkeypath: string = "m/44'/148'/0'";

    // Check if the specified language is supported
    if (language && !bip39.wordlists[language])
        return "";

    // Get the wordlist based on the specified language
    const wordlist = bip39.wordlists[language];

    // Generate a mnemonic seed phrase with the specified entropy bits and wordlist
    const seedPhrase = bip39.generateMnemonic(entropyBits, undefined, wordlist);
    console.log(seedPhrase);    // Log the 12-word seed phrase

    return seedPhrase.split(" ");
}
`.trim();

const sampleCode = `
import * as bip39 from 'bip39';
import { derivePath } from "ed25519-hd-key";
import { Keypair } from 'stellar-sdk';

await phrases: string[] = await generateMnemonic();

// Get Seed from Mnemonic
const seed = await bip39.mnemonicToSeed(" ".join(phrases));

// Deriving KeyPair from Seed
const result = derivePath(derivationkeypath, seed.toString("hex"));

// Create a KeyPair from the derived key
const keypair = Keypair.fromRawEd25519Seed(Buffer.from(result.key));

// Log the public key and secret key of the generated KeyPair
console.log(keypair.publicKey());
console.log(keypair.secret());
`.trim()