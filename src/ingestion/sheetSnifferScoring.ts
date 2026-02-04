/**
 * Sheet Sniffer Scoring
 * Scoring algorithms for sheet detection
 */

import { SheetCategory } from './sheetSnifferTypes'
import { CATEGORY_SIGNATURES } from './sheetSnifferPatterns'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize text for keyword matching (lowercase, trim, preserve original spacing)
 */
export function normalizeText(text: string | null | undefined): string {
    if (text === null || text === undefined) {
        return ''
    }

    return String(text).toLowerCase().trim()
}

/**
 * Check if row text contains a keyword (case-insensitive, partial match)
 */
export function containsKeyword(rowText: string[], keyword: string): boolean {
    const keywordLower = keyword.toLowerCase()

    for (const cellText of rowText) {
        if (cellText.includes(keywordLower)) {
            return true
        }
    }

    return false
}

/**
 * Calculate score for a category based on matched keywords
 * Strong match: +5 points
 * Weak match: +1 point
 */
export function calculateCategoryScore(
    rowText: string[],
    category: Exclude<SheetCategory, 'UNKNOWN'>
): { score: number; strongMatches: string[]; weakMatches: string[] } {
    const signatures = CATEGORY_SIGNATURES[category]
    const strongMatches: string[] = []
    const weakMatches: string[] = []
    let score = 0

    // Check strong keywords (+5 each)
    for (const keyword of signatures.strong) {
        if (containsKeyword(rowText, keyword)) {
            score += 5
            strongMatches.push(keyword)
        }
    }

    // Check weak keywords (+1 each)
    for (const keyword of signatures.weak) {
        if (containsKeyword(rowText, keyword)) {
            score += 1
            weakMatches.push(keyword)
        }
    }

    return { score, strongMatches, weakMatches }
}

/**
 * Calculate sheet name score bonus.
 * Prefer sheets with descriptive names over generic template sheets.
 *
 * Returns +10 points for ideal sheet names, +0 for neutral/unknown
 */
export function calculateSheetNameScore(
    sheetName: string,
    category: SheetCategory
): number {
    if (category === 'UNKNOWN') {
        return 0
    }

    const lower = sheetName.toLowerCase().trim()

    // SIMULATION_STATUS category preferences
    if (category === 'SIMULATION_STATUS') {
        // Ideal sheet names - exact match gets highest score
        if (lower === 'simulation') {
            return 20 // Increased from 10 to ensure name bonus can overcome keyword differences
        }
        // Contains "simulation" but not "data"
        if (lower.includes('simulation') && !lower.includes('data')) {
            return 20 // Increased from 10
        }
        // MRS_OLP, DOCUMENTATION, SAFETY_LAYOUT are valid simulation status sheets
        if (lower === 'mrs_olp' || lower === 'mrs olp' || lower.includes('mrs') && lower.includes('olp')) {
            return 15
        }
        if (lower === 'documentation') {
            return 15
        }
        if (lower === 'safety_layout' || lower === 'safety layout' || (lower.includes('safety') && lower.includes('layout'))) {
            return 15
        }
        // Avoid definition/legend sheets (e.g., "Boardroom_Status_Def")
        if (lower.includes('_def') || lower.endsWith('def') || lower.includes('definition') || lower.includes('legend')) {
            return -20 // Strong penalty for definition sheets
        }
        if (lower.startsWith('status_') || lower.endsWith('_status')) {
            return 15 // Increased from 8
        }
        // Avoid tiny template sheets
        if (lower === 'data' || lower === 'overview' || lower === 'summary' || lower.includes('boardroom')) {
            return -10 // Increased penalty from -5 to -10
        }
    }

    // ROBOT_SPECS category preferences
    if (category === 'ROBOT_SPECS') {
        if (lower.includes('robot') && lower.includes('list')) {
            return 10
        }
        if (lower.includes('robotlist')) {
            return 10
        }
        // Prefer sheets with "robot" in the name
        if (lower.includes('robot')) {
            return 8
        }
    }

    // IN_HOUSE_TOOLING category preferences
    if (category === 'IN_HOUSE_TOOLING') {
        if (lower === 'toollist' || lower === 'tool list') {
            return 10
        }
        if (lower.includes('equipment') && lower.includes('list')) {
            return 8
        }
        // Prefer sheets with "tool" in the name
        if (lower.includes('tool')) {
            return 8
        }
    }

    // ASSEMBLIES_LIST category preferences
    if (category === 'ASSEMBLIES_LIST') {
        if (lower.includes('assemblies') || lower === 'a_list') {
            return 10
        }
    }

    return 0
}
