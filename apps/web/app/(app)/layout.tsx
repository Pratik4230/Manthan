import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { AppNavActions } from "@/features/auth"
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
      <header className="flex h-12 items-center justify-between gap-4 border-b px-4">
        <Link href="/workspaces" className="font-medium tracking-tight">
          Manthan
        </Link>
        <AppNavActions />
      </header>
      <div>{children}</div>
    </div>
  )
}
