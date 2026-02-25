import { TestSession } from "@/components/test-session"

export default async function TestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const testId = Number(id)

  return <TestSession testId={testId} />
}
