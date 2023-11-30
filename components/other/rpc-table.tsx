"use client";

import { MAINNET_DETAILS, Network, NetworkDetails, RPC, TESTNET_DETAILS } from "@/utils/network";
import { useEffect, useState } from "react";
export const FUTURENET_DETAILS: any = {
    network: "FUTURENET",
    networkUrl: "https://rpc-futurenet.stellar.org:443",
    networkPassphrase: "Test SDF Future Network ; October 2022",
};

export interface RPCTableProps
    extends React.TableHTMLAttributes<HTMLTableElement> {
}

const data = [
    {
        networkDetails: FUTURENET_DETAILS,
        rpc: "https://rpc-futurenet.stellar.org/",
    },
    {
        networkDetails: TESTNET_DETAILS,
        rpc: RPC.Testnet,
    },
    {
        networkDetails: MAINNET_DETAILS,
        rpc: RPC.Mainnet,
    }
]
export const RPCTable = ({ children, ...props }: RPCTableProps) => {
    return (
        <div className="relative overflow-x-auto">
            <table className="w-full text-left rtl:text-right rounded">
                <thead className="text-main uppercase bg-main rounded">
                    <tr>
                        <th scope="col" className="px-6 py-3">
                            Network
                        </th>
                        <th scope="col" className="px-6 py-3">
                            RPC
                        </th>
                        <th scope="col" className="px-6 py-3">
                            Network Url
                        </th>
                        <th scope="col" className="px-6 py-3">
                            Network Passphrase
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(({ networkDetails, rpc }) => {
                        return (
                            <tr key={rpc} className="bg-white border-b ">
                                <th scope="row" className="px-6 py-4 font-medium text-main whitespace-nowrap ">
                                    {networkDetails.network}
                                </th>
                                <td className="px-6 py-4">
                                    {rpc}
                                </td>
                                <td className="px-6 py-4">
                                    {networkDetails.networkUrl}
                                </td>
                                <td className="px-6 py-4">
                                    {networkDetails.networkPassphrase}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>

    )
}