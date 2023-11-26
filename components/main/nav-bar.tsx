import { ConnectWallet } from "../shared/connect-wallet"
import { NetworkButton } from "./network-button"

export interface NavBarProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const NavBar = ({ ...props }: NavBarProps) => {
    return (
        <nav className="bg-main z-50 border-b">
            <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto py-2">
                <a href="#" className="flex items-center rtl:space-x-reverse justify-center">
                    <span className="text-2xl font-bold text-main-secondary">Soroban Snippet</span>
                </a>
                <button data-collapse-toggle="navbar-default" type="button" className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200" aria-expanded="false">
                    <span className="sr-only">Open main menu</span>
                    <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h15M1 7h15M1 13h15" />
                    </svg>
                </button>
                <div className="hidden w-full md:block md:w-auto" id="navbar-default">
                    <div className="flex items-center space-x-4">
                        <NetworkButton />
                        <ConnectWallet />
                    </div>
                </div>
            </div>
        </nav>
    )
}