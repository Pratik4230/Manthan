"use client"

import { makeAssistantDataUI } from "@assistant-ui/react"
import { Badge } from "@workspace/ui/components/badge"

import {
  CITATIONS_DATA_NAME,
  type CitationChip,
} from "@/features/chat/citations"

function CitationChips({ data }: { data: CitationChip[] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return null
  }

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {data.map((citation) => {
        const label = [
          `[${citation.index}]`,
          citation.title,
          citation.locLabel,
        ]
          .filter(Boolean)
          .join(" · ")

        if (citation.url) {
          return (
            <a
              key={`${citation.sourceId}-${citation.index}`}
              href={citation.url}
              target="_blank"
              rel="noreferrer"
              title={citation.excerpt}
              className="inline-flex"
            >
              <Badge variant="secondary" className="max-w-56 truncate font-normal">
                {label}
              </Badge>
            </a>
          )
        }

        return (
          <Badge
            key={`${citation.sourceId}-${citation.index}`}
            variant="secondary"
            className="max-w-56 truncate font-normal"
            title={citation.excerpt}
          >
            {label}
          </Badge>
        )
      })}
    </div>
  )
}

export const CitationsDataUI = makeAssistantDataUI<CitationChip[]>({
  name: CITATIONS_DATA_NAME,
  render: ({ data }) => <CitationChips data={data} />,
})
