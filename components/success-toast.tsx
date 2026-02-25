"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function SuccessToast() {
  const router = useRouter()

  useEffect(() => {
    toast.success("Teste encerrado com sucesso!", {
      description: "Os dados foram salvos no banco de dados.",
    })
    // Clean up the URL param
    router.replace("/")
  }, [router])

  return null
}
