"use client";

import { useEffect, useRef, useState } from "react";
import { useSorosanSDK } from "@sorosan-sdk/react";
import { getPublicKey, getUserInfo, signTransaction } from "@stellar/freighter-api";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";
import { ConsoleLog } from "../shared/console-log";
import { Title } from "@/components/shared/title";
import { createContractOp, initaliseTransactionBuilder, signTransactionWithWallet, submitTxAndGetContractId, submitTxAndGetWasmId, uploadContractWasmOp } from "@/utils/soroban";
import { Account, BASE_FEE, Transaction } from "soroban-client";

export interface DeployYourFirstContractProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const DeployYourFirstContract = ({ }: DeployYourFirstContractProps) => {
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

    //#region Upload Contract Wasm
    const handleSampleUploadContractWasmOp = async (): Promise<string> => {
        const txBuilder = await initTxBuilder();
        const response = await fetch(`/api/token`, { method: "POST", });
        const wasm = await response.blob();
        const wasmBuffer = Buffer.from(await wasm.arrayBuffer());
        const tx = await uploadContractWasmOp(
            wasmBuffer, txBuilder, sdk.server)

        consoleLogRef.current?.appendConsole(tx.toXDR());
        return tx.toXDR();
    }

    const handleInstallWASM = async (): Promise<string> => {
        consoleLogRef.current?.appendConsole("Step 1: Installing WASM ...");
        const xdr: string = await handleSampleUploadContractWasmOp();
        const response = await sign(xdr);
        const wasmId = await submitTxAndGetWasmId(
            response, sdk.server, sdk.selectedNetwork);

        consoleLogRef.current?.appendConsole("WASM Hash on Soroban:");
        consoleLogRef.current?.appendConsole(wasmId);

        return wasmId;
    }
    //#endregion

    const handleContractCall = async () => {
        // Step 1
        const wasmId = await handleInstallWASM();

        // Step 2
        consoleLogRef.current?.appendConsole("Step 2: Deploying WASM ...");
        const txBuilder = await initTxBuilder();
        const source: Account = await sdk.server.getAccount(publicKey);

        // Here is the main part of the code
        const tx = await createContractOp(
            wasmId, source, txBuilder, sdk.server);
            
        consoleLogRef.current?.appendConsole(tx.toXDR());

        // Soroban Snippet uses Freighter to sign transaction
        const response = await sign(tx.toXDR());
        const contractId = await submitTxAndGetContractId(
            response, sdk.server, sdk.selectedNetwork);

        consoleLogRef.current?.appendConsole("Contract Deploy to Soroban:");
        consoleLogRef.current?.appendConsole(sdk.util.toContractAddress(contractId));
        consoleLogRef.current?.appendConsole(`See on explorer: https://${sdk.selectedNetwork.network.toLocaleLowerCase()}.steexp.com/contract/${sdk.util.toContractAddress(contractId)}`);

        return contractId;
    }

    return (
        <div className="pb-32">
            <Title>JavaScript/TypeScript Soroban Contract Deployment</Title>

            <Header2>Introduction</Header2>
            <p>
                In this section, we will learn how to deploy a Soroban smart contract.
                To deploy a contract, you need to provide the following:

                This section is dedicated to guiding you through the process of implementing a
                method to deploy a smart contract on the web.
                Soroban smart contract, a fundamental step in leveraging the capabilities of the Soroban blockchain. 
                To embark on this journey, you&apos;ll need two essential components: the WebAssembly (WASM) 
                code representing your contract and the source account associated with its deployment. 
                As we delve into the details, you&apos;ll gain valuable insights into the key elements 
                required for a successful contract deployment on Soroban. Let&apos;s get started!
            </p>

            <p>
                The corresponding <Code>soroban-cli</Code> command to deploy a contract is.
                Javascript as of current, doesn&apos;t support abstraction of deploying a contract.
                Hence we will be using <Code>soroban-client</Code> to deploy a contract.
            </p>
            <CodeBlock language={"bash"} code={cliDeploy} />

            <Header2>Prerequistes</Header2>
            <p>
                For this demo, Soroban Snippet will provide a <Code>.wasm</Code> of a soroban
                token contract found here: https://github.com/stellar/soroban-examples/tree/main/token.
                In a pratical dapp, you will need to compile your own smart contract and load the
                <Code>.wasm</Code> file as a buffer. Additionally, you will need to connect to <b>Freighter</b>
                a stellar wallet extension (like Metamask) to sign transactions.
            </p>

            <Header2>createContractOp</Header2>
            <CodeBlock code={code} />
            <UList>
                <li>
                    <Header3>Convert Wasm ID to Buffer:</Header3>
                    <p>
                        The Wasm ID is converted to a buffer using <code>Buffer.from(wasmId, &quot;ascii&quot;)</code>.
                    </p>
                </li>
                <li>
                    <Header3>Generate Salt:</Header3>
                    <p>
                        A random 32-byte salt is generated using <code>randomBytes(32)</code>.
                    </p>
                </li>
                <li>
                    <Header3>Create Address and Contract ID Preimage:</Header3>
                    <p>
                        The source account&apos;s address is converted to an address object, and a <code>ContractIdPreimageFromAddress</code> is created using the address and salt.
                    </p>
                </li>
                <li>
                    <Header3>Create Contract Arguments:</Header3>
                    <p>
                        Contract arguments are created, including the <code>ContractIdPreimage</code> and executable Wasm code.
                    </p>
                </li>
                <li>
                    <Header3>Build Host Function and Operation:</Header3>
                    <p>
                        A host function and operation are created to invoke the contract creation with the specified parameters.
                    </p>
                </li>
                <li>
                    <Header3>Build and Prepare Transaction:</Header3>
                    <p>
                        The transaction is built using the provided transaction builder, and the server prepares the transaction.
                    </p>
                </li>
                <li>
                    <Header3>Return Prepared Transaction:</Header3>
                    <p>
                        The prepared transaction is returned.
                    </p>
                </li>
            </UList>

            <p>
                To build this in on the web and you can use <Code>soroban-client</Code>
                to deploy a contract. The following TypeScript code snippet showcases the invocation of a
                You will need to compile a wasm file. You can found a guide to compiling using
                <Code>soroban-client</Code> here:
            </p>

            <Header2>Usage</Header2>
            <p>Try out this code sample below</p>
            <UList>
                <li>
                    <Header3>Step 1: Upload Contract Bytes</Header3>
                    <p>
                        The first step is to upload the bytes of the contract to the Soroban network. This is referred to as &quot;installing&quot; the contract. In the blockchain&apos;s perspective, it&apos;s like adding the contract&apos;s code to the network and indexing it by its hash. This allows multiple contracts to reference the same code, giving them identical behavior but maintaining separate storage states.
                    </p>
                </li>
                <li>
                    <Header3>Step 2: Instantiate the Contract</Header3>
                    <p>
                        The second step involves creating what we commonly think of as a Smart Contract. It generates a new contract ID and associates it with the contract bytes uploaded in the previous step. This step completes the deployment process, and now the contract is ready to be executed on the Soroban blockchain.
                    </p>
                </li>
                <li>
                    <Header3>Separation of Steps:</Header3>
                    <p>
                        It&apos;s important to note that these two steps, uploading contract bytes and instantiating the contract, can be performed independently. This flexibility allows developers to manage and control the deployment process according to their needs.
                    </p>
                </li>
            </UList>
            <CodeBlock code={sampleDeployContract} />
            <Button onClick={() => excute(handleContractCall)}>
                Deploy Token Contract
            </Button>
            <ConsoleLog ref={consoleLogRef} />
        </div>
    )
}

const cliDeploy = `
soroban contract deploy \\
  --wasm target/wasm32-unknown-unknown/release/hello_soroban.wasm \\
  --source alice \\
  --network testnet
`.trim()

const code = `
import { Account, Address, Operation, Server, TimeoutInfinite, Transaction, TransactionBuilder, xdr } from "soroban-client";
import { randomBytes } from "crypto";

const createContractOp = async (
    wasmId: string,
    source: Account,
    txBuilder: TransactionBuilder,
    server: Server,
) => {
    // wasmId = ba.unhexlify(wasmId);   // In some case you might need binascii decoding

    // Setup up wasm file for Preimage which includes generating a 32 byte salt
    const wasmIdBuffer = Buffer.from(wasmId, "ascii");
    const salt = randomBytes(32);
    const buff = Buffer.from(salt);
    const addr = new Address(source.accountId());

    // This is the main part of the code
    // Create Contract Id with Freight address and salt
    const contractIdPreimageFromAddress = new xdr.ContractIdPreimageFromAddress({
        address: addr.toScAddress(),
        salt: buff,
    });
    const contractIdPreimage = xdr.ContractIdPreimage
        .contractIdPreimageFromAddress(contractIdPreimageFromAddress);

    // This builds InvokeHostFunctionOp operation with HostFunction hostFunctionTypeCreateContract
    const createContract = new xdr.CreateContractArgs({
        contractIdPreimage: contractIdPreimage,
        executable: xdr.ContractExecutable.contractExecutableWasm(wasmIdBuffer),
    });

    let hf: xdr.HostFunction = xdr.HostFunction
        .hostFunctionTypeCreateContract(createContract);
    let op: any = Operation.invokeHostFunction({
        func: hf,
        auth: [],
    });

    let tx: Transaction = txBuilder
        .addOperation(op)
        .setTimeout(TimeoutInfinite)
        .build();

    const prepared = await server.prepareTransaction(tx) as Transaction;
    return prepared;
}
`.trim();

const sampleDeployContract = `
import { Operation, Server, BASE_FEE, SorobanRpc, TimeoutInfinite, Transaction, TransactionBuilder, xdr } from "soroban-client";
import { getPublicKey, signTransaction } from "@stellar/freighter-api";

// Simple function to initialise a TransactionBuilder
const initialiseTransactionBuilder = async (
    server: Server,
    fee: number = BASE_FEE,
    networkPassphrase: string = Networks.TESTNET,
) => {  
    const { publicKey } = await getUserInfo();
    const source: Account = await server.getAccount(publicKey);
    return new TransactionBuilder(source, {
        fee,
        networkPassphrase
    });
}

// Step 1
// This connects to the testnet, but you can change it to appriopriate network
const server: Server = new Server("https://soroban-testnet.stellar.org/", { 
                            allowHttp: true, });

// Initialise a TxBuilder to build hostFunctionTypeUploadContractWasm transaction
const txBuilder: TransactionBuilder = await initialiseTransactionBuilder(server);

// Load in the contract
const wasmBuffer: Buffer = fs.readFileSync("soroban_token_contract.wasm");

// See Installing Wasm to Soroban demo for more details
const installedTx: Transaction = await uploadContractWasmOp(
    wasmBuffer,
    installTxBuilder,
    server,
);

// Soroban Snippet uses Freighter to sign transaction
const installSigned = await signTransaction(installedTx.toXDR());
const installResp: SorobanRpc.GetTransactionResponse = await submitTx(installedSigned);

// Get Wasm ID deployed to Soroban
let wasmId = "";
if (installResp.status == SorobanRpc.GetTransactionStatus.SUCCESS && installResp.resultMetaXdr) {
    const buff = Buffer.from(installResp.resultMetaXdr.toXDR("base64"), "base64");
    const txMeta = xdr.TransactionMeta.fromXDR(buff);
    wasmId txMeta.v3().sorobanMeta()?.returnValue().bytes().toString("hex") || "";  // WasmID
}

// Step 2
const { publicKey } = await getUserInfo();
const source: Account = await server.getAccount(publicKey);

// Initialise a TxBuilder this time to build hostFunctionTypeCreateContract transaction
const txBuilder: TransactionBuilder = await initialiseTransactionBuilder(server);

// Here is the main part of the code
const deployTx = await createContractOp(
    wasmId,
    source,
    deployTxBuilder,
    server);

// Soroban Snippet uses Freighter to sign transaction
const deploySigned = await signTransactionWithWallet(deployTx.toXDR());
const deployResp: SorobanRpc.GetTransactionResponse = await submitTx(deploySigned);

// Get Contract ID deployed to Soroban
if (deployResp.status == SorobanRpc.GetTransactionStatus.SUCCESS && deployResp.resultMetaXdr) {
    const buff = Buffer.from(deployResp.resultMetaXdr.toXDR("base64"), "base64");
    const txMeta = xdr.TransactionMeta.fromXDR(buff);

    // Contract ID
    const contractId txMeta.v3().sorobanMeta()?.returnValue().address().contractId().toString("hex") || "";
}
`.trim();