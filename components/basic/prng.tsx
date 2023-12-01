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
import { NetworkDetails, RPC, TESTNET_DETAILS, getRPC } from "@/utils/network";
import { RPCTable } from "../other/rpc-table";
import { SorobanRpc, Networks, BASE_FEE, xdr } from 'stellar-sdk';
import { Reference } from "../shared/link";
import { Header3 } from "../shared/header-3";
import { getRandContract } from "@/utils/util";
import { Input } from "../shared/input";
const { Server } = SorobanRpc;

export interface PRNGProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const PRNG = ({ }: PRNGProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
    const consoleLogRefShuffle = useRef({} as any);
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
            setDisabledBtn(false);
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

    const [seed, setSeed] = useState<number>(0);
    const [list, setList] = useState<string>("");
    const handleShuffle = async () => {
        consoleLogRefShuffle.current?.appendConsole(`Shuffling ...`);

        const items: xdr.ScVal[] = list.split(",").map((item) => sdk.nativeToScVal(item));
        let params: xdr.ScVal[] = [
            xdr.ScVal.scvVec(items),
        ];
        if (seed !== 0) {
            params.push(xdr.ScVal.scvU64(new xdr.Uint64(seed)));
        }

        sdk.publicKey = publicKey;
        const shuffled = await sdk.call(contractAddress, "roll", params);
        console.log(shuffled);
        // consoleLogRef.current?.appendConsole(`Result: ${items}`);
    }

    return (
        <div className="pb-32">
            <Title>Stellar Randomness</Title>

            <Header2>Introduction</Header2>
            <p>
                In this section, we will explore the Soroban Rust PRNG library. This is more related to
                developing Stellar smart contract, but it can be used in dapps, to achieve PRNG. It allows
                for onchain randoms, and techniques for shuffling a vector and grabbing a random number between
                two internal. Having this is simplicity and reliability in generating randomness within the Stellar ecosystem.
                However do note it should not be used for security purposes and in application that are <i>low risk tolerance</i>.
                You can check out the <Reference href="https://docs.rs/soroban-sdk/20.0.0-rc2/soroban_sdk/prng/struct.Prng.html"
                    target="_blank">documentation</Reference>.
            </p>


            <Header2>u64_in_range</Header2>
            <p>
                Will demonstrate the use of PRNG, with this Dice. It uses the Soroban SDK to create a dice-rolling mechanism.
                The main function, <Code>roll</Code>takes an environmental context (Env) and generates a random number between 1 and 6
                using a pseudorandom number generator. This contract is designed for applications requiring a simple and
                lightweight solution for obtaining random outcomes in the specified range.
            </p>
            <CodeBlock language="rust" code={diceCode} />
            <Header2>Usage</Header2>
            {/* <CodeBlock code={} /> */}
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleDiceRoll)}>
                    Roll Dice
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRef} />

            <Header3>Seed</Header3>
            <Header3>Shuffle</Header3>
            <p>
                Another PRNG function is <Code>shuffle</Code>, which takes a vector of values and returns a vector of
                the same values in a random order. Addtionally, if a seed is provided, the PRNG will be seeded with
                that value before shuffling. This contract is designed for applications requiring a simple and
                lightweight solution for obtaining random outcomes in the specified range.
            </p>
            <CodeBlock code={shuffleCode} />
            <Header2>Usage</Header2>
            <Input type="text" onChange={(e) => setList(e.target.value)}
                value={list} placeholder="Comma Seperated List" />
            <Input type="number" onChange={(e) => setSeed(parseInt(e.target.value, 10))}
                value={seed} placeholder="Seed Number" />
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleShuffle, consoleLogRefShuffle)}>
                    Roll Dice
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRefShuffle} />
        </div>
    )
}

const diceCode = `
#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct DiceContract;

#[contractimpl]
impl DiceContract {
    pub fn roll(env: Env) -> u64 {
        env.prng().u64_in_range(1..=6)
    }
}
`.trim()

const shuffleCode = `
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Vec, Val, Bytes};

#[contract]
pub struct ShuffleContract;

#[contractimpl]
impl ShuffleContract {
    pub fn new_seed(env: Env, seed: u64) {
        let mut arr = [0u8; 32];
        let seed_bytes = seed.to_be_bytes();
        arr[24..32].copy_from_slice(&seed_bytes[0..8]);
        env.prng().seed(Bytes::from_slice(&env, arr.as_slice()));
    }
    
    pub fn shuffle(env: Env, items: Vec<Val>, seed: Option<u64>) -> Vec<Val> {
        if let Some(seed_value) = seed {
            Self::new_seed(env.clone(), seed_value);
        }
        env.prng().shuffle(items)
    }
}
`.trim();