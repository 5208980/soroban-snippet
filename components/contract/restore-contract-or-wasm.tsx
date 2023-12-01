"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getUserInfo } from "@stellar/freighter-api";
import { Address, BASE_FEE, Contract, Memo, MemoHash, Operation, SorobanDataBuilder, SorobanRpc, Transaction, TransactionBuilder, xdr } from "stellar-sdk";
import { initaliseTransactionBuilder, signTransactionWithWallet, submitTx } from "@/utils/soroban";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "@/components/shared/console-log";
import { Title } from "@/components/shared/title";
import { getContract } from "@/utils/util";
import { Header3 } from "@/components/shared/header-3";
const { Server, assembleTransaction } = SorobanRpc;

export interface RestoreExpiredContractOrWasmProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const RestoreExpiredContractOrWasm = ({ }: RestoreExpiredContractOrWasmProps) => {
    //#region Shared
    const { sdk } = useSorosanSDK();
    const consoleLogRef = useRef({} as any);
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
    }, []);

    const initTxBuilder = async (fee: string = BASE_FEE) => {
        return await initaliseTransactionBuilder(
            publicKey, fee, sdk.server,
            sdk.selectedNetwork.networkPassphrase);
    }

    const sign = async (tx: string) => {
        return await signTransactionWithWallet(tx, publicKey, sdk.selectedNetwork);
    }
    //#endregion

    const bumpContractInstance = async (
        txBuilder: TransactionBuilder,
        server: SorobanRpc.Server,
        contractAddress: string,
        publicKey: string,
    ): Promise<Transaction> => {
        // Read Only
        // const ledgerKey: xdr.LedgerKey = xdr.LedgerKey.contractData(
        //     new xdr.LedgerKeyContractData({
        //         contract: contract.toScAddress(),
        //         key: xdr.ScVal.scvLedgerKeyContractInstance(),
        //         durability: xdr.ContractDataDurability.persistent(),
        //     })
        // );

        // const sorobanData = new SorobanDataBuilder()
        //     .setReadOnly([ledgerKey])
        //     .build()

        // Read Write
        const network = (await server.getNetwork()).passphrase;
        // const key = xdr.ScVal.scvLedgerKeyContractInstance()
        // const contractData = await server.getContractData(contract, key, SorobanRpc..Persistent)
        // const hash = contractData.val.contractData().val().instance().executable().wasmHash()
        const ledgerKey = xdr.LedgerKey.contractData(
            new xdr.LedgerKeyContractData({
                contract: new Contract(contractAddress).address().toScAddress(),
                key: xdr.ScVal.scvLedgerKeyContractInstance(),
                durability: xdr.ContractDataDurability.persistent()
            })
        );

        const ledgerEntries = await sdk.server.getLedgerEntries(ledgerKey);
        const ledgerEntry = ledgerEntries.entries[0] as SorobanRpc.Api.LedgerEntryResult;
        const hash = ledgerEntry.val.contractData().val().instance().executable().wasmHash(); 
        const sorobanData = new SorobanDataBuilder()
            .setReadWrite([
                xdr.LedgerKey.contractCode(
                    new xdr.LedgerKeyContractCode({ hash })
                ),
                ledgerKey
            ])
            .build()

        let tx: Transaction = txBuilder
            // .addOperation(Operation.bumpFootprintExpiration({ ledgersToExpire: 101 }))
            .addOperation(Operation.restoreFootprint({}))
            .setNetworkPassphrase(network)
            .setSorobanData(sorobanData)
            .setTimeout(0)
            .build()

        // Manual prepareTransaction as server.prepareTransaction throw transaction simulation failed
        const sim = await server.simulateTransaction(tx)
        const acc = new Address(publicKey);
        tx = assembleTransaction(tx, sim)
            .addMemo(new Memo(MemoHash, acc.toScAddress().accountId().value()))
            .setTimeout(0)
            .build()

        return tx;
    }

    const handleRestoreContract = async () => {
        // fee should be higher than the BASE_FEE
        const txBuilder = await initTxBuilder("50000");
        const contractAddress = await getContract(sdk.selectedNetwork.network);

        consoleLogRef.current?.appendConsole("Creating restore footprint for contract ...");
        const tx: Transaction = await bumpContractInstance(
            txBuilder, sdk.server, contractAddress, publicKey);
        console.log(tx);

        const signedTx = await sign(tx.toXDR());
        const result: SorobanRpc.Api.GetTransactionResponse = await submitTx(
            signedTx.tx, sdk.server, sdk.selectedNetwork);

        console.log(result);
        consoleLogRef.current?.appendConsole(`Result status: ${result.status}`);
    }

    return (
        <div className="pb-32">
            <Title>Restore (Extend) Expired Contract/WASM TTL</Title>

            <Header2>Introduction</Header2>
            <div>
                To recover or extend an expired contract, it is crucial to
                retrieve expiration details and leverage the  <Code>Operation.restoreFootprint()</Code>
                method to obtain ledger keys associated with the contract instance.
                In this section, we&apos;ll guide you through extending an expired contract.
                You can check out the offical documenation and explanation can be found here:
                https://soroban.stellar.org/docs/fundamentals-and-concepts/state-expiration#example-my-contract-expired
            </div>

            <Header2>Prerequistes</Header2>
            <p>
                The uploadContractWasmOp function is designed to facilitate the
                upload of a WebAssembly (Wasm) smart contract to a Soroban or Stellar blockchain.
                This function is asynchronous and returns a Promise that resolves
                to a Transaction object that can be used to sign and submit to Stellar
            </p>
            <CodeBlock code={code} />

            <UList>
                <li>
                    <Header3>Network and Key Setup</Header3>
                    <p>
                        We first need the the wasm Hash in order to restore the contract code.
                        This will contain the wasm code that corresponds to the contract instance,
                        you want to restore. Then will setup the restoration footprint by
                        creating a <Code>SorobanDataBuilder</Code> and providing both the Contract Code and
                        Contract Data.
                    </p>
                </li>
                <li>
                    <Header3>Transaction Building</Header3>
                    <p>
                        Add an operation to restore the footprint using <Code>Operation.restoreFootprint({ })</Code>
                        and prepare the transaction for signing and submission to Soroban.
                    </p>
                </li>
            </UList>

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <CodeBlock code={sampleRestoreContract} />
            <div className="flex space-x-2 my-4">
                <Button onClick={() => excute(handleRestoreContract)}>
                    Extend Contract
                </Button>
            </div>
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const code = `
import { Address, BASE_FEE, Durability, Memo, MemoHash, Operation, Server, SorobanDataBuilder, Transaction, TransactionBuilder, assembleTransaction, xdr } from "stellar-sdk";

const bumpContractInstance = async (
    txBuilder: TransactionBuilder,
    server: Server,
    contractAddress: string,
    publicKey: string,
): Promise<Transaction> => {
    const contract = new Address(contractAddress);
    
    // Read Only
    // const ledgerKey: xdr.LedgerKey = xdr.LedgerKey.contractData(
    //     new xdr.LedgerKeyContractData({
    //         contract: contract.toScAddress(),
    //         key: xdr.ScVal.scvLedgerKeyContractInstance(),
    //         durability: xdr.ContractDataDurability.persistent(),
    //     })
    // );

    // const sorobanData = new SorobanDataBuilder()
    //     .setReadOnly([ledgerKey])
    //     .build()

    // Read Write
    const network = (await server.getNetwork()).passphrase;
    // Using server to get contract data
    // const key = xdr.ScVal.scvLedgerKeyContractInstance()
    // const contractData = await server.getContractData(contract, key, Durability.Persistent)
    // const hash = contractData.val.contractData().val().instance().executable().wasmHash()
    const ledgerKey = xdr.LedgerKey.contractData(
        new xdr.LedgerKeyContractData({
            contract: new Contract(contractAddress).address().toScAddress(),
            key: xdr.ScVal.scvLedgerKeyContractInstance(),
            durability: xdr.ContractDataDurability.persistent()
        })
    );

    const ledgerEntries = await sdk.server.getLedgerEntries(ledgerKey);
    const ledgerEntry = ledgerEntries.entries[0] as SorobanRpc.Api.LedgerEntryResult;
    const hash = ledgerEntry.val.contractData().val().instance().executable().wasmHash(); 
    const sorobanData = new SorobanDataBuilder()
        .setReadWrite([
            xdr.LedgerKey.contractCode(
                new xdr.LedgerKeyContractCode({ hash })
            ),
            ledgerKey
        ])
        .build()

    let tx: Transaction = txBuilder
        // .addOperation(Operation.bumpFootprintExpiration({ ledgersToExpire: 101 }))
        .addOperation(Operation.restoreFootprint({}))
        .setNetworkPassphrase(network)
        .setSorobanData(sorobanData)
        .setTimeout(0)
        .build()

    // Manual prepareTransaction as server.prepareTransaction throw transaction simulation failed
    const sim = await server.simulateTransaction(tx)
    const acc = new Address(publicKey);
    tx = assembleTransaction(tx, network, sim)
        .addMemo(new Memo(MemoHash, acc.toScAddress().accountId().value()))
        .setTimeout(0)
        .build()

    return tx;
}
`.trim();

const sampleRestoreContract = `
import { Operation, Server, SorobanRpc, TimeoutInfinite, Transaction, TransactionBuilder, xdr } from "stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// fee should be higher than the BASE_FEE
const txBuilder = await initTxBuilder("50000");
// Note this is a futurenet contract
const contractAddress = "CAEKJZUWNRUGTDINKFPYF5DVD5NIDJVROGL4A7P6KE6ZSH7SWIRGKZBM";

// This is the main part of the code
const tx: Transaction = await bumpContractInstance(
    txBuilder, sdk.server, contractAddress, publicKey);

const signedTx = await sign(tx.toXDR());
const result = await submitTx(
    signedTx.tx, sdk.server, sdk.selectedNetwork);
`.trim();

