"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function PausedToast() {
  const router = useRouter()

  useEffect(() => {
    toast.info("Teste pausado com sucesso! Voce pode retoma-lo a qualquer momento.", {
      duration: 5000,
    })
    router.replace("/", { scroll: false })
  }, [router])

  return null
}
