export type ParsedSectionLoc = {
  page?: number
  sheet?: string
  sectionIndex?: number
}

export type ParsedSection = {
  text: string
  loc: ParsedSectionLoc
}

export type ParsedDocument = {
  text: string
  sections: ParsedSection[]
}

export function joinSections(sections: ParsedSection[]): string {
  return sections
    .map((section) => section.text.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim()
}
