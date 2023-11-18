"use client";

import { FUTURENET_DETAILS, MAINNET_DETAILS, RPC, TESTNET_DETAILS } from "@/utils/network";
import { useEffect, useState } from "react";

export interface RPCTableProps
    extends React.TableHTMLAttributes<HTMLTableElement> {
}

const data = [
    {
        networkDetails: FUTURENET_DETAILS,
        rpc: RPC.Futurenet,
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
            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 rounded">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 rounded">
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
                            <tr key={rpc} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
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