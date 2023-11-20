"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { BASE_FEE, Contract, SorobanRpc, xdr } from "soroban-client";
import { decodeContractSpecBuffer, hexToByte, initaliseTransactionBuilder, signTransactionWithWallet, structNameToXdr, submitTxAndGetWasmId, uploadContractWasmOp } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { getContract } from "@/utils/util";

export interface GetContractABIProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const GetContractABI = ({ }: GetContractABIProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
    const consoleLogRefStruct = useRef({} as any);
    const [publicKey, setPublicKey] = useState<string>("");
    const [contractAddress, setContractAddress] = useState<string>("");

    const excute = async (fn: Function, logger?: any) => {
        const loggerRef = logger || consoleLogRef;
        try {
            loggerRef.current?.clearConsole();
            await fn();
        } catch (error) {
            loggerRef.current?.appendConsole(`# ${error}`);
            console.log(error);
        } finally {
            loggerRef.current?.appendConsole("============ Done ============");
        }
    }

    useEffect(() => {
        (async () => {
            const { publicKey } = await getUserInfo();
            setPublicKey(publicKey);

            const contractAddress = await getContract(sdk.selectedNetwork.network);
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

    const getContractWasm = async () => {
        consoleLogRef.current?.appendConsole("Getting WASM ID ...");
        const contractData = xdr.LedgerKey.contractData(
            new xdr.LedgerKeyContractData({
                contract: new Contract(contractAddress).address().toScAddress(),
                key: xdr.ScVal.scvLedgerKeyContractInstance(),
                durability: xdr.ContractDataDurability.persistent()
            })
        );

        let ledgerEntries: SorobanRpc.GetLedgerEntriesResponse = await sdk.server.getLedgerEntries(contractData);


        if (ledgerEntries == null || ledgerEntries.entries == null || ledgerEntries.entries.length == 0) {
            return null;
        }

        let ledgerEntry = ledgerEntries.entries[0] as SorobanRpc.LedgerEntryResult;
        const codeData = ledgerEntry.val.contractData();

        const contractInstance = codeData.val().instance();
        const wasmId = contractInstance.executable().wasmHash();

        // Here is the main part of the code
        const contractCode = xdr.LedgerKey.contractCode(
            new xdr.LedgerKeyContractCode({
                hash: wasmId
            })
        );

        ledgerEntries = await sdk.server.getLedgerEntries(contractCode);
        if (ledgerEntries == null || ledgerEntries.entries == null) {
            return null;
        }

        ledgerEntry = ledgerEntries.entries[0] as SorobanRpc.LedgerEntryResult;
        const codeEntry = ledgerEntry.val;
        const wasmCode = codeEntry.contractCode().code().toString('hex');
        const wasmBytes = hexToByte(wasmCode)
        const wasmFile = new Blob([new Uint8Array(wasmBytes)])

        return { wasmId, wasmCode };
    }

    const handleContractABI = async (): Promise<xdr.ScSpecEntry[]> => {
        const { wasmId, wasmCode }: any = await getContractWasm();

        const buffer = Buffer.from(wasmCode || "", 'hex');

        // Here is the main part of the code
        const executable = new WebAssembly.Module(buffer);
        const contractSpecificationSection = WebAssembly.Module.customSections(executable, 'contractspecv0');

        let specs: xdr.ScSpecEntry[] = [];
        for (const item of contractSpecificationSection) {
            const entries = await decodeContractSpecBuffer(item);

            entries.forEach((entry: xdr.ScSpecEntry) => {
                specs.push(entry);
            });
        }

        return specs;
    }

    const handleContractFunction = async () => {
        consoleLogRef.current?.appendConsole("Decompiling contract ...");
        const specs: xdr.ScSpecEntry[] = await handleContractABI();
        consoleLogRef.current?.appendConsole(`Total Specs: ${specs.length || 0}`);

        const fns = specs.filter(x => x.switch() === xdr.ScSpecEntryKind.scSpecEntryFunctionV0());
        if (fns.length == 0) {
            consoleLogRef.current?.appendConsole(`No functions found`);
            return;
        }
        const fn = fns[0]; // Just take the first one to examine
        // Should be:
        // fn initialize(e: Env, admin: Address, decimal: u32, name: String, symbol: String) {

        consoleLogRef.current?.appendConsole(`fn ${fn.functionV0().name().toString()}(`);
        consoleLogRef.current?.appendConsole(`    e: Env`);
        fn.functionV0().inputs().forEach((input: xdr.ScSpecFunctionInputV0) => {
            consoleLogRef.current?.appendConsole(`    ${input.name().toString()}: ${input.type().switch().name}`);
        });
        consoleLogRef.current?.appendConsole(`)`);
        fn.functionV0().outputs().forEach((output: xdr.ScSpecTypeDef) => {
            consoleLogRef.current?.appendConsole(`${output.switch().name}`);
        });
    }

    const handleContractStruct = async () => {
        consoleLogRefStruct.current?.appendConsole("Decompiling contract ...");
        const specs: xdr.ScSpecEntry[] = await handleContractABI();
        consoleLogRefStruct.current?.appendConsole(`Total Specs: ${specs.length || 0}`);

        const structs = specs.filter(x => x.switch() === xdr.ScSpecEntryKind.scSpecEntryUdtStructV0());
        // const enums = specs.filter(x => x.switch() === xdr.ScSpecEntryKind.scSpecEntryUdtEnumV0());
        if (structs.length == 0) {
            consoleLogRefStruct.current?.appendConsole(`No Specs found`);
            return;
        }
        const struct = structs[0];
        const structScVal: xdr.ScVal = structNameToXdr(struct.udtStructV0())
        consoleLogRefStruct.current?.appendConsole(`#[derive(Clone)]`);
        consoleLogRefStruct.current?.appendConsole(`#[contracttype]`);
        consoleLogRefStruct.current?.appendConsole(`pub struct ${struct.value().name().toString()} {`);
        const vals = structScVal.value() as xdr.ScMapEntry[];
        vals.forEach(element => {
            consoleLogRefStruct.current?.appendConsole(`   pub ${element.key().value()}: ${element.val().switch().name}`);
        });
        consoleLogRefStruct.current?.appendConsole(`)`);
    }

    return (
        <div className="pb-32">
            <Title>Construct Soroban Contract ABI in JavaScript/TypeScript</Title>

            <Header2>Introduction</Header2>
            <div>
                In this section, we will delve into the construction of Soroban Contract ABI
                using JavaScript/TypeScript. This is a more custom way to obtain the interface
                of a Soroban contact that can be used to interact with the contract without the
                need to manually construct the interface. It is similar to the <Code>soroban-client</Code>
                {" "} <Code>inspect</Code> however, we have the ability to get the contract interface,
                functions, meta, etc <b>of a contract</b> rather than just the WASM.
            </div>
            <CodeBlock language={"bash"} code={cliCode} />

            <Header2>Prerequistes</Header2>
            <p>
                The uploadContractWasmOp function is designed to facilitate the
                upload of a WebAssembly (Wasm) smart contract to a Soroban or Stellar blockchain.
                This function is asynchronous and returns a Promise that resolves
                to a Transaction object that can be used to sign and submit to Stellar
            </p>
            <CodeBlock code={code} />

            <p>
                In this snippet, the <Code>decodeContractSpecBuffer</Code> function is
                utilized to convert a Soroban contract&apos;s WebAssembly (WASM) code into a more
                structured and usable format, particularly extracting the contract
                specification entries.
            </p>

            <Header3>Decode and Accumulate ScSpec Entries</Header3>
            <p>
                The decodeContractSpecBuffer function is called for each item in the contract
                specification section, returning an array of decoded entries.
                These decoded entries (of type <Code>xdr.ScSpecEntry</Code>) are accumulated in
                the totalEntries array.  The final result is an array (totalEntries) containing
                all the decoded Soroban contract specification entries. defined is inherently the v0
                contract spec and is stored in the contractspecv0 custom section of the wasm file
            </p>
            <CodeBlock code={decodingCode} />

            <Header2>Contract Specs</Header2>
            <p>
                Being able to extract the specification of a contract. We can dive deeper and
                look into each of the contract specs. The following are the contract specs
            </p>
            <UList>
                <li>
                    <Header3>Function Entry (<Code>ScSpecEntryFunctionV0</Code>)</Header3>
                    <p>
                        Represents a function in the Soroban contract.
                        Contains information about the function, such as its name, parameters, and return type.

                        We can use deconstruct this further which has the following properties:
                        <UList>
                            <li>
                                name <Code>string | Buffer</Code>
                                <p>
                                    Identifies the unique name by which the
                                    function can be called within the Soroban contract.
                                </p>
                            </li>
                            <li>
                                inputs <Code>ScSpecFunctionInputV0[]</Code>
                                <p>
                                    The parameters of the function, which can be found
                                    via the <Code>name</Code> and <Code>type</Code> properties.
                                </p>
                            </li>
                            <li>
                                outputs <Code>ScSpecTypeDef[]</Code>
                                <p>
                                    Represents the output types of the function, which has similar
                                    properties to the <Code>inputs</Code> property.
                                </p>
                            </li>
                        </UList>
                    </p>
                </li>
                <li>
                    <Header3>Struct Entry (<Code>ScSpecEntryUdtStructV0</Code>)</Header3>
                    <p>
                        Represents a user-defined struct in the Soroban contract.
                        Contains details about the struct&apos;s fields, including their names and types.
                    </p>
                </li>
                <li>
                    <Header3>Enum Entry (<Code>ScSpecEntryUdtEnumV0</Code>)</Header3>
                    <p>
                        Represents a user-defined enum in the Soroban contract.
                        Contains information about the enum&apos;s variants, including their names and associated values.
                    </p>
                </li>
                <li>
                    <Header3>Union Entry (<Code>ScSpecEntryUdtUnionV0</Code>)</Header3>
                </li>
            </UList>

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>

            <Header3>Function Specs</Header3>
            <p>
                This code snippet focuses on working with a Stellar smart contract using the Soroban client
                library to obtain the function specifications. The core part involves creating a transaction
                and getting the contract specifications. Then the code then extracts information from the
                first function entry, including the method name, input parameters, and output types.
            </p>
            <CodeBlock code={sampleUploadContractWasmOp} />
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleContractFunction)}>
                    Generate Contract Function
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRef} />

            <Header3>Struct Specs</Header3>
            <p>
                These can both be named and unnamed struct, for pratical understanding
                see: Pratical Guide Custom Types to xdr in JavaScript/TypeScript, as when
                we converting <Code>ScSpecUdtStructV0</Code> to <Code>xdr.ScVal</Code>
                we need to determined if it is a named or unnamed struct and then
                convert it accordingly (<Code>scvMap</Code> and <Code>scvVec</Code> respectively).
            </p>
            <CodeBlock code={sampleStructSpec} />
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleContractStruct, consoleLogRefStruct)}>
                    Generate Contract Struct
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRefStruct} />
        </div>
    )
}

const cliCode = `
soroban contract inspect \\
    --wasm target/wasm32-unknown-unknown/release/incrementor.wasm
`.trim()

const code = `
import { Contract, SorobanRpc, xdr } from "soroban-client";

const getContractSpecs = async (
    wasmCode: Buffer
): Promise<xdr.ScSpecEntry[]> => {
    const buffer = Buffer.from(wasmCode || "", 'hex');

    // Here is the main part of the code
    const executable = new WebAssembly.Module(buffer);
    const contractSpecificationSection = WebAssembly.Module.customSections(executable, 'contractspecv0');

    let specs: xdr.ScSpecEntry[] = [];
    for (const item of contractSpecificationSection) {
        // More details in the next section
        const entries = await decodeContractSpecBuffer(item);

        entries.forEach((entry: xdr.ScSpecEntry) => {
            specs.push(entry);
        });
    }
    
    return specs;
}
`.trim();

const sampleUploadContractWasmOp = `
import { Transaction, xdr } from "soroban-client";

// Can also use a local .wasm file
// const wasmBuffer = fs.readFileSync("soroban_token_contract.wasm");

// See: Retrieve WebAssembly (WASM) Code from Smart Contract
const contractAddress: string = "CDES3YLWWIWGMWAT4IHYUB3B4MNQMPHE3UYBMWDLONUOEY3VRNISEQHK"; // testnet contract address
const { wasmId, wasmCode }: any = await getContractWasm();

// Here is the main part of the code
const txBuilder: Transaction = await getContractSpecs(wasmBuffer);

// Extract method name from the function entry
const fns = specs.filter(x => x.switch() === xdr.ScSpecEntryKind.scSpecEntryFunctionV0());
const fn = fns[0]; // Just take the first one to examine
const methodName: string = fn.functionV0().name().toString();

// Extract parameters from the function entry
const params: Array<any> = [];
fn.functionV0().inputs().forEach((input: xdr.ScSpecFunctionInputV0) => {
    params.push({ name: input.name().toString(), type: input.type().switch().name });
});

// Extract output types from the function entry
const outputs: Array<any> = [];
fn.functionV0().outputs().forEach((output: xdr.ScSpecTypeDef) => {
    outputs.push({ type: output.switch().name });
});
`.trim();

const decodingCode = `
export const decodeContractSpecBuffer = async (buffer: ArrayBuffer) => {
    const bufferData = new Uint8Array(buffer);
    const decodedEntries = [];

    // Offset to keep track of the current position in the buffer
    let offset = 0;

    // Continue decoding until the end of the buffer is reached
    while (offset < bufferData.length) {
        const { partialDecodedData, length } = tryDecodeEntry(bufferData, offset);

        // If a partial decoded entry is obtained, add it to the result and update the offset
        if (partialDecodedData) {
            decodedEntries.push(partialDecodedData);
            offset += length;
        } else {
            break;
        }
    }

    return decodedEntries;
};

const tryDecodeEntry = (bufferData: Uint8Array, offset: number) => {
    for (let length = 1; length <= bufferData.length - offset; length++) {
        // Extract a subarray of the buffer based on the current length
        const subArray = bufferData.subarray(offset, offset + length);

        try {
            // Attempt to decode the subarray as a Soroban contract specification entry
            const partialDecodedData = xdr.ScSpecEntry.fromXDR(Buffer.from(subArray));
            return { partialDecodedData, length };
        } catch (error) {
            // If an error occurs during decoding, continue with the next length
        }
    }

    // If no valid entry is found, return null and a length of 0
    return { partialDecodedData: null, length: 0 };
};
`.trim()

const sampleStructSpec = `
import { Transaction, xdr } from "soroban-client";

// Can also use a local .wasm file
// const wasmBuffer = fs.readFileSync("soroban_token_contract.wasm");

// See: Retrieve WebAssembly (WASM) Code from Smart Contract
const contractAddress: string = "CDES3YLWWIWGMWAT4IHYUB3B4MNQMPHE3UYBMWDLONUOEY3VRNISEQHK"; // testnet contract address
const { wasmId, wasmCode }: any = await getContractWasm();

// Here is the main part of the code
const txBuilder: Transaction = await getContractSpecs(wasmBuffer);

// Extract method name from the function entry
const structs = specs.filter(x => x.switch() === xdr.ScSpecEntryKind.scSpecEntryUdtStructV0());
const struct = structs[0]; // Just take the first one to examine
const methodName: string = struct.udtStructV0().name().toString();

// Extract parameters from the function entry
const fields: Array<any> = [];
struct.udtStructV0().fields().forEach((input: xdr.ScSpecUdtStructFieldV0) => {
    fields.push({ name: input.name().toString(), type: input.type().switch().name });
});
`.trim();
