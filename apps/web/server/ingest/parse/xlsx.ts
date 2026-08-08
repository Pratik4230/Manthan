import ExcelJS from "exceljs"

import {
  joinSections,
  type ParsedDocument,
  type ParsedSection,
} from "@/server/ingest/parse/types"

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) {
    return ""
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text
  }
  if (typeof value === "object" && "result" in value) {
    return cellToString(value.result as ExcelJS.CellValue)
  }
  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join("")
  }
  return ""
}

export async function parseXlsx(data: Uint8Array): Promise<ParsedDocument> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(data) as unknown as ExcelJS.Buffer)

  const sections: ParsedSection[] = []
  let sectionIndex = 0

  workbook.eachSheet((sheet) => {
    const lines: string[] = []
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = []
      row.eachCell({ includeEmpty: true }, (cell) => {
        const text = cellToString(cell.value).trim()
        if (text) {
          cells.push(text)
        }
      })
      if (cells.length > 0) {
        lines.push(cells.join("\t"))
      }
    })

    const text = lines.join("\n").trim()
    if (!text) {
      return
    }

    sections.push({
      text,
      loc: {
        sheet: sheet.name,
        sectionIndex,
      },
    })
    sectionIndex += 1
  })

  if (sections.length === 0) {
    throw new Error("XLSX has no extractable text")
  }

  return {
    text: joinSections(sections),
    sections,
  }
}
