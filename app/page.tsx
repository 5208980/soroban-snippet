import { Main } from '@/components/main/main'
import { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Soroban Snippet',
}

export default function Home() {
  return (
    <main>
      <Main />
    </main>
  )
}
