import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    })
  } catch (error) {
    console.error("Erro ao obter sessão:", error)
    return NextResponse.json({ user: null })
  }
}
