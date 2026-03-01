import { AppHeader } from "@/components/app-header"
import { TestForm } from "@/components/test-form"
import { PendingTests } from "@/components/pending-tests"
import { SuccessToast } from "@/components/success-toast"
import { PausedToast } from "@/components/paused-toast"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ finished?: string; paused?: string }>
}) {
  const { finished, paused } = await searchParams

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        <PendingTests />
        <TestForm />
      </main>
      {finished === "true" && <SuccessToast />}
      {paused === "true" && <PausedToast />}
    </div>
  )
}
