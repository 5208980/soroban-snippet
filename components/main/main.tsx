"use client";

import { useState } from "react";
import { InvokeContractCall } from "@/components/contract/invoke-contract-call";
import { DeployYourFirstContract } from "../contract/deploy-your-first-contract";
import { InstallingWasmToSoroban } from "../contract/installing-wasm-to-soroban";
import { GasEstimation } from "../operation/gas-estimation";
import { GetWasmFromContract } from "../contract/get-wasm-from-contract";
import { GetAssetContract } from "../operation/get-asset-contract";
import { GetContractStorage } from "../contract/get-contract-storage";
import { ConvertCustomTypeToScVal } from "../operation/convert-custom-types-to-sc-val";
import { GetContractABI } from "../contract/get-contract-abi";
import { SubmitTransactionProcess } from "../operation/submit-transaction-process";
import { ConnectToSoroban } from "../operation/connecting-to-soroban";
import { ConvertXDRToTransactionEnvelope } from "../operation/convert-xdr-to-transaction-envelope";
import { RestoreExpiredContractOrWasm } from "../contract/restore-contract-or-wasm";
import { AuthorizeInvocation } from "../operation/authorize-invocation";

export interface MainProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

const sidebarData = {
    contract: {
        items: [
            { name: "Installing Contract/WASM to Soroban", spec: <InstallingWasmToSoroban /> },
            { name: "JavaScript/TypeScript Soroban Contract Deployment", spec: <DeployYourFirstContract /> },
            { name: "Execute Soroban Smart Contract", spec: <InvokeContractCall /> },
            { name: "Retrieve WebAssembly (WASM) Code from Smart Contract", spec: <GetWasmFromContract /> },
            { name: "Access Soroban Contract Storage State", spec: <GetContractStorage />},
            { name: "Construct Soroban Contract ABI in JavaScript/TypeScript", spec: <GetContractABI /> },
            { name: "Restore Expired Contract/WASM", spec: <RestoreExpiredContractOrWasm />},
        ]
    },
    operation: {
        items: [
            { name: "Connecting to Soroban", spec: <ConnectToSoroban /> },
            { name: "Gas Estimation on Soroban", spec: <GasEstimation /> },
            { name: "Authorise Invocation", spec: <AuthorizeInvocation />},
            { name: "Pratical Guide Custom Types to xdr in JavaScript/TypeScript", spec: <ConvertCustomTypeToScVal /> },
            { name: "Submit Transaction Process", spec: <SubmitTransactionProcess /> },
            { name: "Get Contract from Wrapped Asset", spec: <GetAssetContract /> },
            { name: "Covert XDR to Transaction Envelope", spec: <ConvertXDRToTransactionEnvelope />}
        ]
    }
}

export const Main = ({ children, ...props }: MainProps) => {
    const [spec, setSpec] = useState<JSX.Element>(<ConnectToSoroban />);
    const [selected, setSelected] = useState<string>("Connecting to Soroban");

    const handleSidebarClick = (item: any) => {
        setSelected(item.name);
        setSpec(item.spec);
    }
    return (
        <div className="grid grid-cols-12 min-h-screen">
            <div className="col-span-12 lg:col-span-3 border-r pt-6 pl-6">
                <div className="invisible lg:visible">
                    {Object.entries(sidebarData).map(([category, { items }]) => (
                        <div key={category}>
                            <div className="text-slate-500 font-bold uppercase tracking-wider">{category}</div>
                            <ul>
                                {items.map((item, index) => (
                                    <li className={`my-1 py-1 px-2 mr-2 rounded-md hover:bg-gray-100 cursor-pointer
                                    ${(selected === item.name) && "bg-blue-100 text-blue-800 font-bold"}
                                    `}
                                        key={index}
                                        onClick={() => handleSidebarClick(item)}
                                    >{item.name}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
            <div className="col-span-12 lg:col-span-9 px-16">
                {spec}
            </div>
        </div>
    )
}