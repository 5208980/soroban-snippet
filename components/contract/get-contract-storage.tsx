"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { BASE_FEE, Contract, SorobanRpc, scValToNative, xdr } from "soroban-client";
import { initaliseTransactionBuilder, signTransactionWithWallet, submitTxAndGetWasmId, uploadContractWasmOp } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { AnyAaaaRecord } from "dns";
import { getContract } from "@/utils/util";

export interface GetContractStorageProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const GetContractStorage = ({ }: GetContractStorageProps) => {
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

    const getContractStorage = async () => {
        // Create a LedgerKey for fetching contract data
        const contractData = xdr.LedgerKey.contractData(
            new xdr.LedgerKeyContractData({
                contract: new Contract(contractAddress).address().toScAddress(),
                key: xdr.ScVal.scvLedgerKeyContractInstance(),
                durability: xdr.ContractDataDurability.persistent()
            })
        );

        // Retrieve ledger entries from the Soroban server based on the contract data
        const ledgerEntries = await sdk.server.getLedgerEntries(contractData);
        const ledgerEntry = ledgerEntries.entries[0] as SorobanRpc.LedgerEntryResult;
        const codeData = ledgerEntry.val.contractData();

        // Extract the contract instance from the contract data
        const contractInstance: xdr.ScContractInstance = codeData.val().instance();

        // Extract the contract storage as an array of Soroban Map Entries
        const contractStorage: xdr.ScMapEntry[] = contractInstance.storage() || [];

        const storage = convertStorage(contractStorage);
        storage.forEach(el => {
            consoleLogRef.current?.appendConsole(`${el.key} (${el.keyType}): ${JSON.stringify(el.value)} (${el.valueType})`);
        });
    }

    const convertStorage = (storage: xdr.ScMapEntry[]): any[] =>
        storage.map(el => ({
            key: scValToNative(el.key()).toString(),
            keyType: el.key().switch().name,
            value: scValToNative(el.val()),
            valueType: el.val().switch().name,
        }))

    return (
        <div className="pb-32">
            <Title>Access Soroban Contract Storage State</Title>

            <Header2>Introduction</Header2>
            <div>
                This section will be focussed how to accessing the storage state
                and storage information of a Soroban smart contract. They are
                <b>Key/Value</b> pairs contract instance storage. That means in a Soroban
                contract, if the code uses <Code>Env.storage().instance()</Code>
            </div>

            <p>
                The Soroban documentation provides a detailed description of the
                of the storage types: https://docs.rs/soroban-sdk/20.0.0-rc2/soroban_sdk/storage/struct.Storage.html.
                That is <Code>Persistent</Code>, <Code>Temporary</Code> and <Code>Instance</Code>.
                As mention, this guide will focus on <Code>Instance</Code> storage.
            </p>

            <Header2>.instance() (Rust)</Header2>
            <p>
                By placing global variables in <Code>Instance</Code> storage, the contract
                ensures that the lifetime of the contract instance and all relevant global
                variables are tied together. This means that as long as the contract instance
                exists, the associated global state will persist and thus can be restored.
                Let take a look at the  Soroban token contract as an example. The contract stores
                admin as follow here:
                https://github.com/stellar/soroban-examples/blob/7a7cc6268ada55113ce0b82a3ae4405f7ec8b8f0/token/src/admin.rs#L17
            </p>
            <CodeBlock code={rustCode} />

            <p>
                In this example, when write_administrator is called, the contract stores the
                admin in the contract instance storage.
            </p>

            <Header2>contractData (soroban-client)</Header2>
            <CodeBlock code={code} />
            <UList>
                <li>
                    <Header3>Construct LedgerKey for Contract Data:</Header3>
                    <p>
                        Create a <Code>LedgerKey</Code> specifying the contract address, key type for contract instance (<code>scvLedgerKeyContractInstance</code>), and set data durability as persistent.
                    </p>
                </li>
                <li>
                    <Header3>Fetch Ledger Entries:</Header3>
                    <p>
                        Utilize <Code>server.getLedgerEntries</Code> to obtain ledger entries from the Soroban server based on the constructed <code>contractData</code>.
                    </p>
                </li>
                <li>
                    <Header3>Extract Ledger Entry Result and Contract Data:</Header3>
                    <p>
                        Extract the initial ledger entry result from the response and retrieve the contract data from it.
                    </p>
                </li>
                <li>
                    <Header3>Extract Contract Instance and Storage:</Header3>
                    <p>
                        Isolate the contract instance from the contract data and capture the contract storage as an array of Soroban Map Entries. Return the obtained contract storage.
                    </p>
                    <CodeBlock code={`const contractStorage: xdr.ScMapEntry[] = contractInstance.storage() || [];`} />
                    <p>
                        At the end, the contract storage should be an array of <Code>ScMapEntry</Code>, which will
                        contain the key and value of the storage both of <Code>ScVal</Code> types, which can be
                        access with the example below.
                    </p>
                    <CodeBlock code={storageElementCode} />
                </li>
            </UList>

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <CodeBlock code={sampleContractStorage} />
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(getContractStorage)}>
                    Get Contract Storage
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const rustCode = `
pub fn write_administrator(e: &Env, id: &Address) {
    let key = DataKey::Admin;
    e.storage().instance().set(&key, id);
}
`.trim()

const code = `
import { BASE_FEE, Contract, SorobanRpc, scValToNative, xdr } from "soroban-client";

const getContractStorage = async (contractAddress: string) => {
    // Create a LedgerKey for fetching contract data
    const contractData = xdr.LedgerKey.contractData(
        new xdr.LedgerKeyContractData({
            contract: new Contract(contractAddress).address().toScAddress(),
            key: xdr.ScVal.scvLedgerKeyContractInstance(),
            durability: xdr.ContractDataDurability.persistent()
        })
    );

    const ledgerEntries = await sdk.server.getLedgerEntries(contractData);
    const ledgerEntry = ledgerEntries.entries[0] as SorobanRpc.LedgerEntryResult;
    const codeData = ledgerEntry.val.contractData();

    // Extract the contract instance from the contract data
    const contractInstance: xdr.ScContractInstance = codeData.val().instance();

    // Extract the contract storage as an array of Soroban Map Entries
    const contractStorage: xdr.ScMapEntry[] = contractInstance.storage() || [];

    return contractStorage;
}
`.trim();

const storageElementCode =
    `
contractStorage.map(storage => ({
    const key: xdr.ScVal = storage.key();
    const value: xdr.ScVal = storage.val();
})
`.trim()

const sampleContractStorage = `
import { BASE_FEE, Contract, SorobanRpc, scValToNative, xdr } from "soroban-client";

const contractAddress: string = "CAEKJZUWNRUGTDINKFPYF5DVD5NIDJVROGL4A7P6KE6ZSH7SWIRGKZBM";

// Here is the main part of the code
const storage: xdr.ScMapEntry[] = await getContractStorage(contractAddress);

storage.foreach(data => ({
    console.log(scValToNative(data.key().toString());
    console.log(data.key().switch().name);
    console.log(scValToNative(data.val().toString());
    console.log(data.val().switch().name);
}))
`.trim();

