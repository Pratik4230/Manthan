"use client"

import { LogOutIcon, UserRoundIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { authClient } from "@/features/auth/auth-client"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

export function AppNavActions() {
  const router = useRouter()

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            aria-label="Profile"
          >
            <Link href="/profile">
              <UserRoundIcon className="size-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Profile</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Log out"
            onClick={async () => {
              await authClient.signOut()
              router.push("/login")
              router.refresh()
            }}
          >
            <LogOutIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Log out</TooltipContent>
      </Tooltip>
    </div>
  )
}
