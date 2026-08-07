import Link from "next/link"
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
      <header className="flex h-17 items-center justify-between border-b px-6">
        <div>
          <Link href="/workspaces" className="font-medium">
            Manthan
          </Link>
          <p className="text-sm text-muted-foreground">{session.user.email}</p>
        </div>
        <SignOutButton />
      </header>
      <div>{children}</div>
    </div>
  )
}
