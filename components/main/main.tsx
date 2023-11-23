"use client";

import { useEffect, useState } from "react";
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
import { ContractEvents } from "../operation/contract-events";
import { CreateWrappedAsset } from "../operation/create-wrapped-asset";
import { CreateStellarAsset } from "../operation/create-stellar-asset";
import { useRouter, useSearchParams } from 'next/navigation'
import { hash } from "soroban-client";
import { Spinner } from "../shared/spinner";
export interface MainProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

const sidebarData = {
    basic: {
        items: [
            { name: "Connecting to Soroban", spec: <ConnectToSoroban /> },
            { name: "Gas Estimation on Soroban", spec: <GasEstimation /> },
            { name: "Practical Guide Custom Types to xdr in JavaScript/TypeScript", spec: <ConvertCustomTypeToScVal /> },
            { name: "Submit Transaction Process", spec: <SubmitTransactionProcess /> },
            { name: "Difference Transaction and Transaction Envelope", spec: <ConvertXDRToTransactionEnvelope /> },
            // { name: "Authorise Invocation", spec: <AuthorizeInvocation /> },
            // { name: "Events", spec: <ContractEvents /> },
        ]
    },
    asset: {
        items: [
            { name: "Create Stellar Asset", spec: <CreateStellarAsset /> },
            { name: "Create Soroban Wrapped Asset", spec: <CreateWrappedAsset /> },
            { name: "Get Contract from Wrapped Asset", spec: <GetAssetContract /> },
        ]
    },
    contract: {
        items: [
            { name: "Installing Contract/WASM to Soroban", spec: <InstallingWasmToSoroban /> },
            { name: "JavaScript/TypeScript Soroban Contract Deployment", spec: <DeployYourFirstContract /> },
            { name: "Execute Soroban Smart Contract", spec: <InvokeContractCall /> },
            { name: "Retrieve WebAssembly (WASM) Code from Smart Contract", spec: <GetWasmFromContract /> },
            { name: "Access Soroban Contract Storage State", spec: <GetContractStorage /> },
            { name: "Construct Soroban Contract ABI in JavaScript/TypeScript", spec: <GetContractABI /> },
            { name: "Restore Expired Contract/WASM", spec: <RestoreExpiredContractOrWasm /> },
        ]
    },
}

function searchByName(searchQuery: string, data: any): {name: string, spec: JSX.Element} {
    for (const category in data) {
        if (data.hasOwnProperty(category)) {
            const items = data[category].items;

            for (const item of items) {
                if (hash(Buffer.from(item.name)).toString("hex") === searchQuery) {
                    return item;
                }
            }
        }
    }

    // Return null if no match is found
    return { name: "Connecting to Soroban", spec: <ConnectToSoroban /> };
}

export const Main = ({ children, ...props }: MainProps) => {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [spec, setSpec] = useState<JSX.Element | null>(null);
    const [selected, setSelected] = useState<string>("");

    useEffect(() => {
        const title = searchParams.get("title") || "4b494b00824d6be559221ddd2e36bda315250ffea230ab4ff654ed64a7a0fa12"
        const item = searchByName(title, sidebarData)
        handleSidebarClick(item);
    }, []);

    const handleSidebarClick = (item: any) => {
        const title = hash(Buffer.from(item.name)).toString("hex")
        setSelected(item.name);
        setSpec(item.spec);
        router.push(`?title=${title}`);
    }

    return (
        <div className="grid grid-cols-12 min-h-screen">
            <div className="col-span-12 lg:col-span-3 border-r ml-4 mr-8">
                <div className="max-h-screen overflow-y-scroll scrollbar py-4">
                    {Object.entries(sidebarData).map(([category, { items }]) => (
                        <div key={category} >
                            <div className="text-slate-500 font-bold uppercase tracking-wider">{category}</div>
                            <ul>
                                {items.map((item, index) => (
                                    <li className={`my-2 px-4 h-11 flex items-center rounded-md hover:bg-gray-100 cursor-pointer
                                        ${(selected === item.name) && "bg-blue-100 text-primary font-bold"}`}
                                        key={index}
                                        onClick={() => handleSidebarClick(item)}
                                    >{item.name}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
            <div className="col-span-12 lg:col-span-9">
                <div className="max-h-screen overflow-y-scroll scrollbar">
                    <div className="px-16">
                        {spec ? spec : <Spinner />}
                    </div>
                </div>
            </div>
        </div >
    )
}