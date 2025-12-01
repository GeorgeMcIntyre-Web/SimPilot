import * as XLSX from 'xlsx'

// Copy the exact sniffSheet logic inline
function normalizeText(text: string | null | undefined): string {
  if (text === null || text === undefined) return ''
  return String(text).toLowerCase().trim()
}

function containsKeyword(rowText: string[], keyword: string): boolean {
  const keywordLower = keyword.toLowerCase()
  for (const cellText of rowText) {
    if (cellText.includes(keywordLower)) {
      return true
    }
  }
  return false
}

const CATEGORY_KEYWORDS = {
  GUN_FORCE: {
    strong: ['Gun Force [N]', 'Gun Number', 'Gun Force'],
    medium: ['Quantity', 'Reserve', 'Old Line', 'Robot Number'],
    weak: ['Area', 'Gun', 'Force'],
    minScore: 5
  }
}

const workbook = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet([
  ['Gun Number', 'Gun Force [N]', 'Quantity', 'Reserve', 'Robot Number']
])
XLSX.utils.book_append_sheet(workbook, ws, 'Sheet2')

// Read the sheet
const sheet = workbook.Sheets['Sheet2']
const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null, raw: false })
console.log('Rows:', rows)

// Normalize
const allRowText: string[] = []
for (const row of rows) {
  if (!row) continue
  for (const cell of row) {
    const normalized = normalizeText(cell)
    if (normalized.length > 0) {
      allRowText.push(normalized)
    }
  }
}
console.log('All row text:', allRowText)

// Score
const category = CATEGORY_KEYWORDS.GUN_FORCE
let score = 0
const matched: string[] = []

for (const kw of category.strong) {
  if (containsKeyword(allRowText, kw)) {
    score += 3
    matched.push(kw)
  }
}
for (const kw of category.medium) {
  if (containsKeyword(allRowText, kw)) {
    score += 2
    matched.push(kw)
  }
}
for (const kw of category.weak) {
  if (containsKeyword(allRowText, kw)) {
    score += 1
    matched.push(kw)
  }
}

console.log('Score:', score, 'minScore:', category.minScore)
console.log('Matched:', matched)
console.log('Is above threshold?', score >= category.minScore)
