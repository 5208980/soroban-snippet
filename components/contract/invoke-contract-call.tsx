"use client";

import { useSorosanSDK } from "@sorosan-sdk/react";
import { CodeBlock } from "@/components/shared/code-block";
import { Header2 } from "@/components/shared/header-2";
import { Header3 } from "@/components/shared/header-3";
import { UList } from "@/components/shared/u-list";
import { Code } from "@/components/shared/code";

export interface InvokeContractCallProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

const code = `
const contract = new Contract(contractAddress);
let tx: Transaction = txBuilder
    .addOperation(contract.call(method, ...args))
    .setTimeout(TimeoutInfinite)
    .build();

tx = await server.prepareTransaction(tx) as Transaction;

return tx;
`.trim();

const operationCode = 
`
let tx: Transaction = txBuilder
    .addOperation(contract.call(method, ...args))
    .setTimeout(TimeoutInfinite)
    .build();
`.trim()
export const InvokeContractCall = ({ }: InvokeContractCallProps) => {
    const { sdk } = useSorosanSDK();

    const handleContractCall = async () => {
        console.log(sdk);
    }

    return (
        <div className="">
            <h1 className="text-4xl font-bold leading-6 py-12">Invoking Soroban Smart Contracts</h1>

            <Header2>Introduction</Header2>
            <div>
                The following TypeScript code snippet showcases the invocation of a
                Soroban smart contract:
            </div>
            <CodeBlock code={code} />

            <Header3>Contract Initialization:</Header3>
            <CodeBlock code={`const contract = new Contract(contractAddress);`} />

            <Header3>Transaction Building:</Header3>
            <CodeBlock code={operationCode} />
            <p>
                This part involves constructing a Stellar transaction. The <Code>txBuilder</Code> is a transaction builder object. We add an operation to the transaction using the <Code>addOperation</Code> method. In this case, the operation involves calling a specific method (<Code>method</Code>) on our Soroban smart contract with provided arguments (<Code>...args</Code>). Additionally, we set the transaction timeout to infinite with <Code>setTimeout(TimeoutInfinite)</Code>. Finally, we build the transaction using <Code>build()</Code>.
            </p>

            <Header3>Transaction Preparation:</Header3>
            <CodeBlock code={`tx = await server.prepareTransaction(tx) as Transaction;`} />
            <p>
                Here, we prepare the transaction by simulating it with the Soroban server. This step is crucial as it determines the storage footprint and updates the transaction accordingly. The <Code>await</Code> keyword ensures that we wait for the preparation to complete before proceeding.
            </p>

            <Header3>Transaction Submission:</Header3>
            <CodeBlock code={`return tx`} />
            <p>
                The prepared transaction is now ready to be submitted for execution. This could involve sending it to a Soroban-RPC server, initiating the contract invocation process.
            </p>

            <Header2>How to Use This Code:</Header2>
            <UList>
                <li><strong>Configure the Contract:</strong>
                    <ul>
                        <li>Replace <Code>contractAddress</Code> with the address of the Soroban smart contract you want to interact with.</li>
                    </ul>
                </li>
                <li><strong>Invoke a Method:</strong>
                    <ul>
                        <li>Set the <Code>method</Code> variable to the specific method of the smart contract you want to invoke.</li>
                        <li>Provide any required arguments in the <Code>args</Code> array.</li>
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
            <button className="rounded-md bg-primary px-4 py-2.5" onClick={handleContractCall}>
                Run
            </button>
        </div >
    )
}