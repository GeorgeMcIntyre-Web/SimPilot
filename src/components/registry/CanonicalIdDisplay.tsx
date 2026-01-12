import { useState } from 'react'
import { PlantKey } from '../../domain/uidTypes'
import { log } from '../../lib/log'

interface CanonicalIdDisplayProps {
  plantKey: PlantKey
  uid: string
  key: string
  className?: string
}

/**
 * Display canonical ID with copy-to-clipboard functionality
 * Format: PlantKey-UIDShort-Key
 */
export function CanonicalIdDisplay({ plantKey, uid, key, className = '' }: CanonicalIdDisplayProps) {
  const [copied, setCopied] = useState(false)

  // Extract short UID (last 8 chars of UUID part)
  const uidShort = uid.split('_')[1]?.slice(-8) || uid.slice(-8)
  const canonicalId = `${plantKey}-${uidShort}-${key}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(canonicalId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      log.error('Failed to copy canonical ID', err)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
        {canonicalId}
      </span>
      <button
        onClick={handleCopy}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        title="Copy to clipboard"
        aria-label="Copy canonical ID to clipboard"
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  )
}
