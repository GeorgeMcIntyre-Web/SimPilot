import { ChangeRecord, summarizeChange } from '../domain/changeLog'

/**
 * Convert change log to CSV string
 */
export function generateChangesCsv(changes: ChangeRecord[]): string {
    if (changes.length === 0) return ''

    const header = 'Date,Change ID,Kind,Cell ID,Previous Engineer,New Engineer,Summary\n'

    const rows = changes.map(change => {
        const date = new Date(change.createdAt).toLocaleString()
        const summary = summarizeChange(change).replace(/,/g, ';') // Escape commas in summary

        // Specific fields for cell assignment
        const prevEng = change.previousEngineer || ''
        const newEng = change.newEngineer || ''

        return `${date},${change.id},${change.kind},${change.cellId},${prevEng},${newEng},${summary}`
    })

    return header + rows.join('\n')
}

/**
 * Trigger browser download of CSV
 */
export function downloadChangesAsCsv(changes: ChangeRecord[]): void {
    if (changes.length === 0) return

    const csvContent = generateChangesCsv(changes)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `simpilot_changes_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
