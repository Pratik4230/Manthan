import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/server/auth/auth"

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your account details for this workspace.
        </p>
      </div>
      <dl className="space-y-4 rounded-xl border p-4">
        <div className="space-y-1">
          <dt className="text-xs font-medium text-muted-foreground">Name</dt>
          <dd className="text-sm">{session.user.name || "—"}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-medium text-muted-foreground">Email</dt>
          <dd className="text-sm">{session.user.email}</dd>
        </div>
      </dl>
    </div>
  )
}
