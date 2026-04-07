import { NextResponse } from "next/server"

export async function POST() {
  try {
    const response = NextResponse.json({ success: true })
    
    // Deletar cookie setando maxAge para 0
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 0,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Erro no logout:", error)
    return NextResponse.json(
      { error: "Erro ao fazer logout" },
      { status: 500 }
    )
  }
}
