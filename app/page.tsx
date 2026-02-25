import { AppHeader } from "@/components/app-header"
import { TestForm } from "@/components/test-form"
import { SuccessToast } from "@/components/success-toast"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ finished?: string }>
}) {
  const { finished } = await searchParams

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <TestForm />
      </main>
      {finished === "true" && <SuccessToast />}
    </div>
  )
}
