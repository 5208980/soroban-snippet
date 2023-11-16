"use client";

import { useState } from "react";
import { InvokeContractCall } from "@/components/contract/invoke-contract-call";
import { CreateContractOperation } from "@/components/operation/create-contract-operation";

export interface MainProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

const sidebarData = {
    contract: {
        items: [
            { name: "Invoke Contract Transaction", spec: <InvokeContractCall /> },
            { name: "Create Contract 2", spec: <InvokeContractCall /> }
        ]
    },
    operation: {
        items: [
            { name: "Create Contract Operation", spec: <CreateContractOperation /> },
            { name: "TODO", spec: <>TODO</> },
        ]
    }
}

export const Main = ({ children, ...props }: MainProps) => {
    const [spec, setSpec] = useState<JSX.Element>(<></>);
    const [selected, setSelected] = useState<string>("");

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