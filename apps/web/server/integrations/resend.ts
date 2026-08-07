import { waitUntil } from "@vercel/functions"
import { Resend } from "resend"

import { env } from "@/server/env"

export const resend = new Resend(env.resendApiKey)

export async function sendEmail(input: {
  to: string
  subject: string
  html: string
}) {
  const { error } = await resend.emails.send({
    from: env.emailFrom,
    to: input.to,
    subject: input.subject,
    html: input.html,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export function sendEmailReliable(input: {
  to: string
  subject: string
  html: string
}) {
  waitUntil(
    sendEmail(input).catch((error: unknown) => {
      console.error("Failed to send email", error)
    })
  )
}
