'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useAuthGuard() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('sunat_token')
    if (!token) {
      router.replace('/')
    }
  }, [router])
}
