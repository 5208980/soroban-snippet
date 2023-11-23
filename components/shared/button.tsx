"use client";

import { getPublicKey, getUserInfo, isAllowed, isConnected } from "@stellar/freighter-api";
import { ButtonHTMLAttributes, useEffect, useState } from "react";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    override?: boolean;
}

export const Button = ({ override, children, ...props }: ButtonProps) => {
    const [publicKey, setPublicKey] = useState<string>("");

    useEffect(() => {
        (async () => {
            const { publicKey } = await getUserInfo();
            setPublicKey(publicKey);
        })();
    }, [])

    return (
        <button className={`rounded-md px-4 py-2.5 text-white ${(override ? true : publicKey) ? "btn-primary": "bg-slate-300"} ${children}`}
            disabled={override ? false : !publicKey}
            {...props}>
            {!override
                ? <>
                    {!publicKey
                        ? `Connect Wallet to ${children}`
                        : children}
                </>
                : children
            }
        </button>
    )
}