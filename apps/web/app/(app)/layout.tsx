import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { SignOutButton } from "@/features/auth"
import { auth } from "@/server/auth/auth"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <p className="font-medium">Manthan</p>
          <p className="text-sm text-muted-foreground">{session.user.email}</p>
        </div>
        <SignOutButton />
      </header>
      <div className="p-6">{children}</div>
    </div>
  )
}
