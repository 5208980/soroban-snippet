"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { BASE_FEE, Contract, SorobanRpc, xdr } from "stellar-sdk";
import { hexToByte, initaliseTransactionBuilder, signTransactionWithWallet, submitTxAndGetWasmId, uploadContractWasmOp } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { getContract } from "@/utils/util";

export interface GetWasmFromContractProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const GetWasmFromContract = ({ }: GetWasmFromContractProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
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

    const [wasmFile, setWasmFile] = useState<Blob | null>(null);
    const handleWasmFromContract = async () => {
        consoleLogRef.current?.appendConsole("Getting WASM ID ...");
        const contractData = xdr.LedgerKey.contractData(
            new xdr.LedgerKeyContractData({
                contract: new Contract(contractAddress).address().toScAddress(),
                key: xdr.ScVal.scvLedgerKeyContractInstance(),
                durability: xdr.ContractDataDurability.persistent()
            })
        );

        let ledgerEntries: SorobanRpc.Api.GetLedgerEntriesResponse = await sdk.server.getLedgerEntries(contractData);

        
        if (ledgerEntries == null || ledgerEntries.entries == null || ledgerEntries.entries.length == 0) {
            return null;
        }

        let ledgerEntry = ledgerEntries.entries[0] as SorobanRpc.Api.LedgerEntryResult;
        const codeData = ledgerEntry.val.contractData();

        const contractInstance = codeData.val().instance();
        const wasmId = contractInstance.executable().wasmHash();
        consoleLogRef.current?.appendConsole(`WASM ID for ${contractAddress}:`);
        consoleLogRef.current?.appendConsole(`${wasmId.toString("hex")}`);

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

        ledgerEntry = ledgerEntries.entries[0] as SorobanRpc.Api.LedgerEntryResult;
        const codeEntry = ledgerEntry.val;
        const wasmCode = codeEntry.contractCode().code().toString('hex');
        const wasmBytes = hexToByte(wasmCode)
        const wasmFile = new Blob([new Uint8Array(wasmBytes)])

        consoleLogRef.current?.appendConsole(`WASM for ${contractAddress}:`);
        consoleLogRef.current?.appendConsole(`${wasmFile.size} bytes`);
        setWasmFile(wasmFile);

        return { wasmId, wasmCode };
    }

    const downloadWasm = () => {
        if (!wasmFile) return;

        consoleLogRef.current?.appendConsole(`Downloading WASM file ...`);
        const url = window.URL.createObjectURL(wasmFile);

        var link = document.createElement("a"); // Or maybe get it from the current document
        link.href = url;
        link.download = "soroban_contract.wasm";
        link.click();
    }

    return (
        <div className="pb-32">
            <Title>Retrieve WebAssembly (WASM) Code from Smart Contract</Title>

            <Header2>Introduction</Header2>
            <div>
                This section will explore the process of obtaining the WebAssembly (Wasm) code
                from a Soroban smart contract. This is particularly handy when you wish to
                deploy the identical contract to Soroban without the necessity of recompiling
                the contract or simply to inspect the contract code.
            </div>

            <Header2>contractData and contractCode</Header2>
            <p>
                The following code shows a two setp procedure to obtain the wasm file.
                This involves getting the WASM Id first and then using the WASM Id to
                get the WASM file.
            </p>
            <UList>
                <li>
                    <Header3>Step 1: contractData</Header3>
                    <p>
                        This two-step procedure demonstrates how to retrieve the WASM
                        file associated with a Soroban smart contract. The steps involve
                        querying the Soroban blockchain to obtain the WASM ID, and
                        then using that ID to fetch the corresponding WASM file.
                    </p>
                </li>
                <li>
                    <Header3>Step 2: contractCode</Header3>
                    <p>
                        After that the main step to getting the WASM file is
                        constructing another LedgerKey to query the contract code
                        using the acquired WASM ID. The procedure retrieves the ledger entries
                        for the contract code, extracts the WASM code, converts it to a Blob
                    </p>
                </li>
            </UList>
            <CodeBlock code={code} />
            <p>
                The overall function fetches the WASM ID of a Soroban smart contract using 
                its address, then retrieves the corresponding WASM file from the blockchain and 
                returns it as a Blob.
            </p>

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <CodeBlock code={sampleGetContractWasm} />
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleWasmFromContract)}>
                    Obtain WASM For contract
                </Button>
                <Button disabled={!wasmFile} onClick={downloadWasm}>
                    {wasmFile ? "Download WASM" : "Run code to obtain WASM"}
                </Button>
            </div>

            <input type="text"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 "
                onChange={(e) => setContractAddress(e.target.value)} value={contractAddress} />
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const code = `
import { BASE_FEE, Contract, SorobanRpc, xdr } from "stellar-sdk";

const getContractWasm = async (
    contractAddress: string,
    server: Server,
) => Promise<Blob> {
    // Step 1: Get WASM Hash (ID) from contract
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

    // Step 2: Get WASM file from WASM Hash (ID)
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

    return wasmFile;
};


// Helper function to convert hex string to byte array
export function hexToByte(hexString: string) {
    if (hexString.length % 2 !== 0) {
        throw "Must have an even number of hex digits to convert to bytes";
    }
    var numBytes = hexString.length / 2;
    var byteArray = Buffer.alloc(numBytes);
    for (var i = 0; i < numBytes; i++) {
        byteArray[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return byteArray;
}
`.trim();

const sampleGetContractWasm = `
import { Server } from "stellar-sdk";

// This connects to the testnet, but you can change it to appriopriate network
const server: Server = new Server("https://soroban-testnet.stellar.org/", { 
                            allowHttp: true, });

const contractAddress: string = "CDES3YLWWIWGMWAT4IHYUB3B4MNQMPHE3UYBMWDLONUOEY3VRNISEQHK";

// Here is the main part of the code
const wasmFile: Blob = await getContractWasm(contractAddress, server);
`.trim();