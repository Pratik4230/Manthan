"use client"

import { useRouter } from "next/navigation"

import { authClient } from "@/features/auth/auth-client"
import { Button } from "@workspace/ui/components/button"

export function SignOutButton() {
  const router = useRouter()

  return (
    <Button
      variant="outline"
      onClick={async () => {
        await authClient.signOut()
        router.push("/login")
        router.refresh()
      }}
    >
      Log out
    </Button>
  )
}
