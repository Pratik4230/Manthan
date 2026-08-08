import { Firecrawl } from "firecrawl"

import { env } from "@/server/env"

let client: Firecrawl | null = null

function getFirecrawl() {
  if (!client) {
    client = new Firecrawl({ apiKey: env.firecrawlApiKey })
  }
  return client
}

export async function scrapeWebPage(url: string): Promise<string> {
  const doc = await getFirecrawl().scrape(url, {
    formats: ["markdown"],
  })

  const markdown = doc.markdown?.trim()
  if (!markdown) {
    throw new Error("Firecrawl returned empty content")
  }

  return markdown
}
