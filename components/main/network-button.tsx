"use client";

import { useEffect, useState } from "react"
import { networkType, useSorosanNetwork } from "@/components/shared/network-provider";

export interface NetworkButtonProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

const networkKey = "soroban-snippet-network"
export const NetworkButton = ({ children, ...props }: NetworkButtonProps) => {
    const network = useSorosanNetwork();

    const [selectedNetwork, setSelectedNetwork] = useState<string>("futurenet");
    const [open, setOpen] = useState(false)
    const toggle = () => {
        setOpen(!open)
    }

    const changeSelectedNetwork = (changedNetwork: string) => {
        const net: networkType = changedNetwork as networkType;
        setSelectedNetwork(net.toString());
        network.changeSelectedNetwork(net);
        window.localStorage.setItem(networkKey, net.toString());

        setOpen(false);
    }

    useEffect(() => {
        const net: any = window.localStorage.getItem(networkKey) || "futurenet";
        changeSelectedNetwork(net);
    }, []);
    
    return (
        <div className="relative inline-block text-left">
            <div>
                <button type="button"
                    onClick={toggle}
                    className="inline-flex w-full justify-center capitalize gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50" id="menu-button" aria-expanded="true" aria-haspopup="true">
                    {selectedNetwork}
                    <svg className="-mr-1 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {open &&
                <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" >
                    <div className="py-1" role="none">
                        <div onClick={() => changeSelectedNetwork("futurenet")} className="text-gray-700 block px-4 py-2 text-sm" role="menuitem" id="menu-item-0">Futurenet</div>
                        <div onClick={() => changeSelectedNetwork("testnet")} className="text-gray-700 block px-4 py-2 text-sm" role="menuitem" id="menu-item-1">Testnet</div>
                        <div className="text-gray-700 block px-4 py-2 text-sm cursor-not-allowed" role="menuitem" id="menu-item-1">Mainet (Coming Soon)</div>
                    </div>
                </div>}
        </div>
    )
}