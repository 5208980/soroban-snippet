"use client";

import { useSorosanSDK } from "@sorosan-sdk/react";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";
import { Button } from "@/components/shared/button";

export interface CreateContractOperationProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

const code = `
export const createContractOp = async (
    wasmId: string,
    source: Account,
    txBuilder: TransactionBuilder,
    server: Server,
) => {
    wasmId = ba.unhexlify(wasmId);
    const wasmIdBuffer = Buffer.from(wasmId, "ascii");
    const salt = Salt(32);
    const buff = Buffer.from(salt);
    const addr = new Address(source.accountId());
    // const contractIdPreimage = xdr.ContractIdPreimage
    // .contractIdPreimageFromAsset(xdr.Asset.assetTypeNative());

    const contractIdPreimageFromAddress = new xdr.ContractIdPreimageFromAddress({
        address: addr.toScAddress(),
        salt: buff,
    });
    const contractIdPreimage = xdr.ContractIdPreimage
        .contractIdPreimageFromAddress(contractIdPreimageFromAddress);

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

    tx = await server.prepareTransaction(tx) as Transaction;

    return tx;
}
`.trim();

const operationCode =
    `
let tx: Transaction = txBuilder
    .addOperation(contract.call(method, ...args))
    .setTimeout(TimeoutInfinite)
    .build();
`.trim()
export const CreateContractOperation = ({ }: CreateContractOperationProps) => {
    const { sdk } = useSorosanSDK();

    const handleContractCall = async () => {
        console.log(sdk);
    }

    return (
        <div className="">
            <h1 className="text-4xl font-bold leading-6 py-12">Create Contract Operation</h1>

            <Header2>Introduction</Header2>
            <div>
                The following TypeScript code snippet showcases the invocation of a
                Soroban smart contract:
            </div>
            <CodeBlock language={"ts"} code={code} />

            <Header3>Contract Initialization:</Header3>
            <CodeBlock code={`const contract = new Contract(contractAddress);`} />

            <Header3>Transaction Building:</Header3>
            <CodeBlock language={"javascript"} code={operationCode} />
            <p>
                This part involves constructing a Stellar transaction. The <code>txBuilder</code> is a transaction builder object. We add an operation to the transaction using the <code>addOperation</code> method. In this case, the operation involves calling a specific method (<code>method</code>) on our Soroban smart contract with provided arguments (<code>...args</code>). Additionally, we set the transaction timeout to infinite with <code>setTimeout(TimeoutInfinite)</code>. Finally, we build the transaction using <code>build()</code>.
            </p>

            <Header3>Transaction Preparation:</Header3>
            <CodeBlock language={"javascript"} code={`tx = await server.prepareTransaction(tx) as Transaction;`} />
            <p>
                Here, we prepare the transaction by simulating it with the Soroban server. This step is crucial as it determines the storage footprint and updates the transaction accordingly. The <code>await</code> keyword ensures that we wait for the preparation to complete before proceeding.
            </p>

            <Header3>Transaction Submission:</Header3>
            <Code>
                return tx;
            </Code>
            <p>
                The prepared transaction is now ready to be submitted for execution. This could involve sending it to a Soroban-RPC server, initiating the contract invocation process.
            </p>

            <Header2>How to Use This Code:</Header2>
            <UList>
                <li><strong>Configure the Contract:</strong>
                    <ul>
                        <li>Replace <code>contractAddress</code> with the address of the Soroban smart contract you want to interact with.</li>
                    </ul>
                </li>
                <li><strong>Invoke a Method:</strong>
                    <ul>
                        <li>Set the <code>method</code> variable to the specific method of the smart contract you want to invoke.</li>
                        <li>Provide any required arguments in the <code>args</code> array.</li>
                    </ul>
                </li>
                <li><strong>Execute the Code:</strong>
                    <ul>
                        <li>Run the code to build, prepare, and submit the transaction.</li>
                    </ul>
                </li>
            </UList>

            <p>
                Here, we initialize a Soroban smart contract by creating an instance of the <Code>Contract</Code> class. The <Code>contractAddress</Code> parameter represents the address of the deployed smart contract we want to interact with.
            </p>
            <Button onClick={handleContractCall}>
                Run
            </Button>
        </div >
    )
}