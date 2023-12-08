"use client"

import { Button } from "@/components/shared/button"
import { ConnectWallet } from "@/components/shared/connect-wallet"
import { sidebarData } from "@/components/main/main"
import { NetworkButton } from "@/components/main/network-button"
import { Collapsible } from "../shared/collapsible"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { hash } from "stellar-sdk"

export interface NavBarProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const NavBar = ({ ...props }: NavBarProps) => {
    const router = useRouter();
    const [show, setShow] = useState<boolean>(false);
    const [forceHide, setForceHide] = useState<boolean>(true);

    useEffect(() => {
        const updateWindowDimensions = () => {
            // If not mobile, then force hide on nav sidebar
            // console.log(window.innerWidth);
            if (window.innerWidth >= 1024) {
                setForceHide(false);
            } else {
                setForceHide(true);
            }
        };

        window.addEventListener("resize", updateWindowDimensions);
        return () => window.removeEventListener("resize", updateWindowDimensions)
    }, []);

    const handleSidebarClick = (item: any) => {
        const title = hash(Buffer.from(item.name)).toString("hex")
        router.push(`/?title=${title}`);
        window.location.reload();
    }

    return (
        <nav className="bg-main z-50 border-b">
            <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto py-2">
                <a href="#" className="flex items-center rtl:space-x-reverse justify-center">
                    <span className="text-2xl font-bold text-main-secondary">Soroban Snippet</span>
                </a>

                <div className="inline-flex items-center justify-center lg:hidden">
                    <div className="flex items-center space-x-4">
                        <Button override={true} onClick={() => setShow(!show)}>Open</Button>
                        <NetworkButton />
                        <ConnectWallet />
                    </div>
                </div>
                <div className="hidden w-full lg:block md:w-auto" id="navbar-default">
                    <div className="flex items-center space-x-4">
                        <NetworkButton />
                        <ConnectWallet />
                    </div>
                </div>
            </div>
            <div className={`max-h-screen overflow-y-scroll scrollbar py-4 pb-32 text-red-500 ${(show && forceHide) ? "block" : "hidden"}`}>
                {Object.entries(sidebarData).map(([category, { items }], index) => (
                    <div key={category} >
                        <Collapsible
                            // checked={index === 0}
                            isSelected={"false"}
                            title={category}
                            items={items}
                            handleOnClick={handleSidebarClick} />
                    </div>
                ))}
            </div>
        </nav>
    )
}