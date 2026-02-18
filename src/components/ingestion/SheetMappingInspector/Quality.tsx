import { Info } from 'lucide-react'
import {
  SheetQualityScore,
  QualityTier,
  getTierColorClass,
} from '../../../ingestion/dataQualityScoring'
import { cn } from '../../../ui/lib/utils'

export function QualityBadge({ tier, quality }: { tier: QualityTier; quality: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        getTierColorClass(tier),
      )}
    >
      {tier} ({(quality * 100).toFixed(0)}%)
    </span>
  )
}

export function QualityDetails({ score }: { score: SheetQualityScore }) {
  return (
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-700">
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Quality Metrics
      </h4>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricItem
          label="Avg Confidence"
          value={`${(score.metrics.averageConfidence * 100).toFixed(0)}%`}
          isGood={score.metrics.averageConfidence >= 0.7}
        />
        <MetricItem
          label="High Confidence"
          value={`${(score.metrics.highConfidenceRatio * 100).toFixed(0)}%`}
          isGood={score.metrics.highConfidenceRatio >= 0.7}
        />
        <MetricItem
          label="Unknown Columns"
          value={`${(score.metrics.unknownColumnRatio * 100).toFixed(0)}%`}
          isGood={score.metrics.unknownColumnRatio <= 0.2}
        />
        <MetricItem
          label="Empty Cells"
          value={`${(score.metrics.emptyRatio * 100).toFixed(0)}%`}
          isGood={score.metrics.emptyRatio <= 0.1}
        />
      </div>

      {score.reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          {score.reasons.map((reason, i) => (
            <div key={i} className="text-xs text-gray-600 dark:text-gray-300 flex items-start">
              <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
              {reason}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricItem({ label, value, isGood }: { label: string; value: string; isGood: boolean }) {
  return (
    <div className="text-center">
      <div
        className={cn(
          'text-lg font-semibold',
          isGood ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400',
        )}
      >
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}
