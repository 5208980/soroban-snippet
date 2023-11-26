import { useSorosanSDK } from "@sorosan-sdk/react";
import { useEffect, useState } from "react";
import { getPublicKey } from "@stellar/freighter-api";
import { Button } from "./button";

export interface ConnectWalletProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const ConnectWallet = ({ }: ConnectWalletProps) => {
    const { sdk } = useSorosanSDK();

    const [address, setAddress] = useState<string>("");

    useEffect(() => {
        (async () => {
            await sdk.login();  // Attempt to restore login 
            const address = await sdk.publicKey;
            setAddress(address);
        })();
    }, []);

    const handleConnect = async () => {
        try {
            const publicKey  = await getPublicKey();
            if (!publicKey) {
                return;
            }

            const address = await sdk.publicKey || publicKey;
            console.log(address);
            setAddress(address);
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <Button override={true} onClick={handleConnect}>
            {address ? sdk.util.mask(address) : "Connect Wallet"}
        </Button>
    )
}