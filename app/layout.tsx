"use client"

import { Inter } from 'next/font/google'
import './globals.css'
import { anonik } from "./fonts"
import { SorosanProvider } from '@sorosan-sdk/react'
import { NetworkProvider, networkType, useSorosanNetwork } from '@/components/shared/network-provider'
import { useEffect, useState } from 'react'
import { NavBar } from '@/components/main/nav-bar'
import { Message } from '@/components/shared/message'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${anonik.variable} ${inter.className} max-h-screen overflow-y-hidden`}>
        <NetworkProvider>
          <WrapRoot>
            {children}
          </WrapRoot>
        </NetworkProvider>
      </body>
    </html>
  )
}


function WrapRoot({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState<number>(0);
  const network = useSorosanNetwork();

  useEffect(() => {
    console.log("WrapRoot Change Network to", network.selectedNetwork);
    setKey(key + 1);
  }, [network.selectedNetwork]);

  return (
    <div>
      <Message>(12/12/2023) Please not Soroban Upcoming Testnet reset will be on 18/12/2023. Contract interaction until then may be broken, but we&apos;ll fix it after the preview release and Testnet reset.</Message>
      <NavBar />
      <SorosanProvider key={key} network={(network.selectedNetwork as networkType) || "testnet"}>
        <div className="">
          {children}
        </div>
      </SorosanProvider>
    </div>
  )
}