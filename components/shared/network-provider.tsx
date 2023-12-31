"use client"

import React, { createContext, useContext, useState } from "react";

export type networkType = "testnet" | "mainnet";
export const NetworkProvider = ({ children }: NetworkProviderProps) => {
    const [selectedNetwork, setSelectedNetwork] = useState<networkType>("testnet");

    const changeSelectedNetwork = (network: networkType) => {
        setSelectedNetwork(network);
    }

    return (
        <NetworkContext.Provider value={{
            selectedNetwork,
            changeSelectedNetwork
        }}>
            {children}
        </NetworkContext.Provider>
    );
}

interface NetworkProviderProps extends
    React.HTMLAttributes<HTMLDivElement> {
}

export const NetworkContext = createContext({
    selectedNetwork: "testnet",
    changeSelectedNetwork: (network: networkType) => { }
});

export const useSorosanNetwork = () => useContext(NetworkContext);