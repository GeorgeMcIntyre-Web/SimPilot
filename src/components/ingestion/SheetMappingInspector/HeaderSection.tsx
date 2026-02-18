import { Edit2, Sparkles, Zap } from 'lucide-react'

type HeaderSectionProps = {
  embeddingsEnabled: boolean
  llmAssistEnabled: boolean
  overrideCount: number
}

export function HeaderSection({
  embeddingsEnabled,
  llmAssistEnabled,
  overrideCount,
}: HeaderSectionProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Column Mappings</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Inspect and override how columns map to fields
        </p>
      </div>

      <div className="flex items-center space-x-2">
        {embeddingsEnabled && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            <Sparkles className="w-3 h-3 mr-1" />
            Embeddings
          </span>
        )}

        {llmAssistEnabled && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <Zap className="w-3 h-3 mr-1" />
            LLM Assist
          </span>
        )}

        {overrideCount > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            <Edit2 className="w-3 h-3 mr-1" />
            {overrideCount} override{overrideCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
