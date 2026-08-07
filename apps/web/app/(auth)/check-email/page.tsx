import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          {email
            ? `We sent a verification link to ${email}.`
            : "We sent a verification link to your email."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Open the link to verify your account, then log in.
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline">
          <Link href="/login">Back to log in</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
