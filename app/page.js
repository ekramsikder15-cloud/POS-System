'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/pos')
  }, [router])
  
  return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto"></div>
        <p className="mt-4 text-[#1e3a5f] font-medium">Loading RIWA POS...</p>
      </div>
    </div>
  )
}
