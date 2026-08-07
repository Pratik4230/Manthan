import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { nextCookies } from "better-auth/next-js"

import {
  getDbSync,
  getMongoClientPromise,
  getMongoClientSync,
} from "@/server/db"
import { env } from "@/server/env"
import { sendEmailReliable } from "@/server/integrations/resend"

void getMongoClientPromise()

export const auth = betterAuth({
  appName: "Manthan",
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  database: mongodbAdapter(getDbSync(), {
    client: getMongoClientSync(),
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      sendEmailReliable({
        to: user.email,
        subject: "Verify your Manthan email",
        html: `<p>Hi ${user.name},</p><p><a href="${url}">Verify your email</a> to continue with Manthan.</p>`,
      })
    },
  },
  trustedOrigins: [env.betterAuthUrl, env.nextPublicAppUrl],
  plugins: [nextCookies()],
})
