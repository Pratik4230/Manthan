function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

export const env = {
  get betterAuthSecret() {
    return required("BETTER_AUTH_SECRET")
  },
  get betterAuthUrl() {
    return required("BETTER_AUTH_URL")
  },
  get emailFrom() {
    return process.env.EMAIL_FROM?.trim() || "Manthan <noreply@aixpense.in>"
  },
  get imagekitPrivateKey() {
    return required("IMAGEKIT_PRIVATE_KEY")
  },
  get imagekitPublicKey() {
    return required("IMAGEKIT_PUBLIC_KEY")
  },
  get imagekitUrlEndpoint() {
    return required("IMAGEKIT_URL_ENDPOINT")
  },
  get mongoUri() {
    return required("MONGO_URI")
  },
  get nextPublicAppUrl() {
    return required("NEXT_PUBLIC_APP_URL")
  },
  get resendApiKey() {
    return required("RESEND_API_KEY")
  },
}
