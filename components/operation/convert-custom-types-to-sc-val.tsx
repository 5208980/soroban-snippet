"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { BASE_FEE, Contract, SorobanRpc, scValToNative, xdr } from "soroban-client";
import { hexToByte, initaliseTransactionBuilder, signTransactionWithWallet, submitTxAndGetWasmId, uploadContractWasmOp } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { getContract, toObject } from "@/utils/util";

export interface ConvertCustomTypeToScValProps
    extends React.HTMLAttributes<HTMLDivElement> {
}


export const ConvertCustomTypeToScVal = ({ }: ConvertCustomTypeToScValProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLog = useRef({} as any);
    const consoleLogRefEnum = useRef({} as any);
    const consoleLogRefStruct = useRef({} as any);
    const consoleLogRef = useRef({} as any);
    const consoleLogRefStructUnnamed = useRef({} as any);
    const [publicKey, setPublicKey] = useState<string>("");
    const [contractAddress, setContractAddress] = useState<string>("");

    const excute = async (fn: Function, logger?: any) => {
        const loggerRef = logger || consoleLog;
        try {
            loggerRef.current?.clearConsole();
            await fn();
        } catch (error) {
            loggerRef.current?.appendConsole(`# ${error}`);
            console.log(error);
        }
    }

    useEffect(() => {
        (async () => {
            const { publicKey } = await getUserInfo();
            setPublicKey(publicKey);

            const contractAddress: string = await getContract(sdk.selectedNetwork.network);
            setContractAddress(contractAddress);
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

    const handleCustomEnum = () => {
        const timeBoundKindBefore: xdr.ScVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Before")]);
        consoleLogRefEnum.current?.appendConsole(`# Data (${timeBoundKindBefore.switch().name})`);
        consoleLogRefEnum.current?.appendConsole(`${toObject(scValToNative(timeBoundKindBefore))}`);

        consoleLogRefEnum.current?.appendConsole(`# ScVal (${timeBoundKindBefore.switch().name})`);
        consoleLogRefEnum.current?.appendConsole(`${toObject(timeBoundKindBefore.value())}`);
    }

    const handleCustomStruct = () => {
        const timeBoundkindVal: xdr.ScVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Before")]);
        const timeBoundKindMap = new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("kind"),
            val: timeBoundkindVal,
        })
        const timeBoundTimestampVec = new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("timestamp"),
            val: xdr.ScVal.scvU64(new xdr.Uint64(100000)),
        })

        const timebound = xdr.ScVal.scvMap([timeBoundKindMap, timeBoundTimestampVec]);
        consoleLogRefStruct.current?.appendConsole(`# Data (${timebound.switch().name})`);
        consoleLogRefStruct.current?.appendConsole(`${toObject(scValToNative(timebound))}`);

        consoleLogRefStruct.current?.appendConsole(`# ScVal (${timebound.switch().name})`);
        consoleLogRefStruct.current?.appendConsole(`${toObject(timebound.value())}`);
    }

    const handleCustomStructUnnamed = () => {
        const timeBoundKindAfter: xdr.ScVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("After")]);
        const timeStamp: xdr.ScVal = xdr.ScVal.scvU64(new xdr.Uint64(100000));

        const timebound = xdr.ScVal.scvVec([timeBoundKindAfter, timeStamp]);
        consoleLogRefStructUnnamed.current?.appendConsole(`# Data (${timebound.switch().name})`);
        consoleLogRefStructUnnamed.current?.appendConsole(`${toObject(scValToNative(timebound))}`);

        consoleLogRefStructUnnamed.current?.appendConsole(`# ScVal (${timebound.switch().name})`);
        consoleLogRefStructUnnamed.current?.appendConsole(`${toObject(timebound.value())}`);
    }
    return (
        <div className="pb-32">
            <Title>Practical Guide Custom Types to xdr in JavaScript/TypeScript</Title>

            <Header2>Introduction</Header2>
            <p>
                This section will cover how to structure custom types in Javascript/Typescript.
                This is a pratical documentation based on the learning from:
                https://soroban.stellar.org/docs/basic-tutorials/custom-types.

                This section will cover how to structure custom types such as Rust <b>Enum</b> and
                <b>Struct</b> into <Code>ScVal</Code> (Soroban type) in Javascript/Typescript,
                as you can pass complex types as params for Soroban Contract call.
            </p>

            <p>
                This practical documentation is curated based on the insights gathered
                from the lessons at Soroban Documentation: https://soroban.stellar.org/docs/basic-tutorials/custom-types.
            </p>

            <Header2>Enum</Header2>
            <p>
                In simple terms, converting an enum to a Soroban custom type just requires
                converting the enum to a vector. The following code snippet shows how to Rust
                to <Code>ScVal</Code>, mainly <Code>scvVec</Code>
            </p>
            <CodeBlock language={"rust"} code={rustEnum} />
            <CodeBlock code={tsEnumBeforeAfter} />

            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleCustomEnum, consoleLogRefEnum)}>
                    Get as ScVal for enum
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRefEnum} />

            <Header2>Struct</Header2>
            <p>
                You can use scMap in TypeScript, creating a map with each property as
                a <Code>ScMapEntry</Code>. <b>Note</b>, that the order of these attributes
                are important for Soroban to process the struct. In this case, the
                Timebound Enum must be the first entry in the <Code>scvMap</Code>
            </p>
            <CodeBlock language={"rust"} code={rustStruct} />
            <CodeBlock code={tsStruct} />

            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleCustomStruct, consoleLogRefStruct)}>
                    Get as ScVal for struct
                </Button>
            </div>
            <ConsoleLog language={"json"} ref={consoleLogRefStruct} />


            <Header2>Struct (Unnamed)</Header2>
            <p>
                Furthermore, structs in <Code>Rust</Code> can be construct with unnamed fields. 
                More information about this in Soroban can be found here:
                https://soroban.stellar.org/docs/fundamentals-and-concepts/custom-types#structs-with-unnamed-fields
            </p>

            <p>
                The example provided is has the same structure as the previous struct example,
                however, the fields are unnamed. The order of the fields are still important.
                However, instead of using <Code>scvMap</Code>, we use <Code>scvVec</Code>.
            </p>
            <CodeBlock language={"rust"} code={rustStructUnamed} />
            <p>
                Hence the following code snippet shows how to convert the unnamed struct 
                would be 
            </p>
            <CodeBlock code={tsStructUnamed} />
            <div className="flex space-x-2 my-4">
                <Button override={true} onClick={() => excute(handleCustomStructUnnamed, consoleLogRefStructUnnamed)}>
                    Get as ScVal for enum
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRefStructUnnamed} />
        </div>
    )
}

const rustEnum = `
// Rust Enum
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum TimeBoundKind {
    Before,
    After,
}
`.trim();

const tsEnumBeforeAfter = `
import { xdr } from "soroban-client";

// Javacript/Typescript counterpart
const timeBoundKindBefore: xdr.ScVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Before")]);
const timeBoundKindAfter: xdr.ScVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("After")]);
`.trim();

const rustStruct = `
// Rust Struct
#[derive(Clone)]
#[contracttype]
pub struct TimeBound {
    pub kind: TimeBoundKind,
    pub timestamp: u64,
}
`.trim();

const rustStructUnamed = `
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct State(pub TimeBoundKind, pub u64);
`.trim();


const tsStructUnamed = `
import { xdr } from "soroban-client";

const timeBoundKindAfter: xdr.ScVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("After")]);
const timeStamp: xdr.ScVal = xdr.ScVal.scvU64(new xdr.Uint64(100000));

// Javacript/Typescript counterpart
// Create a Soroban Vec with the 'kind' and 'timestamp' properties IN THAT ORDER!
const timebound = xdr.ScVal.scvVec([timeBoundKindAfter, timeStamp]);
`.trim();

const tsStruct = `
import { xdr } from "soroban-client";

// This is from the Enum section since kind is an enum call TimeBoundKind
const timeBoundkindVal: xdr.ScVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Before")]);

// Create a Soroban Map Entry for the 'kind' property
const timeBoundKindMap = new xdr.ScMapEntry({
    key: xdr.ScVal.scvSymbol("kind"),
    val: timeBoundkindVal,
})

// Create a Soroban Map Entry for the 'timestamp' property
const timeBoundTimestampVec = new xdr.ScMapEntry({
    key: xdr.ScVal.scvSymbol("timestamp"),
    val: xdr.ScVal.scvU64(new xdr.Uint64(timestampVal)),
})

// Javacript/Typescript counterpart
// Create a Soroban Map with the 'kind' and 'timestamp' properties IN THAT ORDER!
const timebound = xdr.ScVal.scvMap([timeBoundKindBefore, timeBoundTimestampVec]);
`.trim();
