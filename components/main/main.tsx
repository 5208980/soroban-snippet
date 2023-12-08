"use client";

import { useEffect, useState } from "react";
import { InvokeContractCall } from "@/components/contract/invoke-contract-call";
import { DeployYourFirstContract } from "@/components/contract/deploy-your-first-contract";
import { InstallingWasmToSoroban } from "@/components/contract/installing-wasm-to-soroban";
import { GasEstimation } from "@/components/basic/gas-estimation";
import { GetWasmFromContract } from "@/components/contract/get-wasm-from-contract";
import { GetAssetContract } from "@/components/asset/get-asset-contract";
import { GetContractStorage } from "@/components/contract/get-contract-storage";
import { ConvertCustomTypeToScVal } from "@/components/basic/convert-custom-types-to-sc-val";
import { GetContractABI } from "@/components/contract/get-contract-abi";
import { SubmitTransactionProcess } from "@/components/basic/submit-transaction-process";
import { ConnectToSoroban } from "@/components/basic/connecting-to-soroban";
import { ConvertXDRToTransactionEnvelope } from "@/components/basic/convert-xdr-to-transaction-envelope";
import { RestoreExpiredContractOrWasm } from "@/components/contract/restore-contract-or-wasm";
import { AuthorizeInvocation } from "@/components/basic/authorize-invocation";
import { ContractEvents } from "@/components/basic/contract-events";
import { CreateWrappedAsset } from "@/components/asset/create-wrapped-asset";
import { CreateStellarAsset } from "@/components/asset/create-stellar-asset";
import { useRouter, useSearchParams } from 'next/navigation'
import { hash } from "stellar-sdk";
import { Spinner } from "@/components/shared/spinner";
import { Collapsible } from "@/components/shared/collapsible";
import { ValidationStellarInformation } from "@/components/basic/validation-stellar-information";
import { ConvertClientSDK } from "../basic/convert-client-sdk";
import { PRNG } from "../basic/prng";
import { MnemonicWallet } from "../basic/key-phrase";
import { BumpingContract } from "../contract/bumping-contract";

export interface MainProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const sidebarData = {
    basic: {
        items: [
            { name: "Connecting to Soroban", spec: <ConnectToSoroban /> },
            { name: "Gas Estimation on Soroban", spec: <GasEstimation /> },
            { name: "Practical Guide Custom Types to xdr in JavaScript/TypeScript", spec: <ConvertCustomTypeToScVal /> },
            { name: "Submit Transaction Process", spec: <SubmitTransactionProcess /> },
            { name: "Difference Transaction and Transaction Envelope", spec: <ConvertXDRToTransactionEnvelope /> },

            { name: "Validating Stellar/Soroban Information", spec: <ValidationStellarInformation /> },
            { name: "Emitting and Retrieving Events", spec: <ContractEvents /> },
            { name: "soroban-client and stellar-sdk", spec: <ConvertClientSDK /> },
            { name: "RNG in Soroban contracts", spec: <PRNG /> },
            { name: "Generating and Deriving Stellar Accounts with Seed Phrases", spec: <MnemonicWallet />}
            // { name: "Authorise Invocation", spec: <AuthorizeInvocation /> },
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
            { name: "Bumping Contract", spec: <BumpingContract /> },

        ]
    },
    asset: {
        items: [
            { name: "Create Stellar Asset", spec: <CreateStellarAsset /> },
            { name: "Create Soroban Wrapped Asset", spec: <CreateWrappedAsset /> },
            { name: "Get Contract from Wrapped Asset", spec: <GetAssetContract /> },
        ]
    },
}

function searchByName(searchQuery: string, data: any): { name: string, spec: JSX.Element } {
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

export const Main = ({ children, }: MainProps) => {
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
            <div className="col-span-12 lg:col-span-3 border-r bg-main hidden lg:block">
                <div className="">
                    <div className="max-h-screen overflow-y-scroll scrollbar py-4 pb-32">
                        {Object.entries(sidebarData).map(([category, { items }], index) => (
                            <div key={category} >
                                <Collapsible
                                    // checked={index === 0}
                                    isSelected={selected}
                                    title={category}
                                    items={items}
                                    handleOnClick={handleSidebarClick} />
                            </div>
                        ))}
                    </div>
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