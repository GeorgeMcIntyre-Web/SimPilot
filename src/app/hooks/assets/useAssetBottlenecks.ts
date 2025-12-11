import { useMemo } from 'react';
import { useToolingBottleneckState } from '../../../domain/toolingBottleneckStore';
import type { BottleneckSeverity, BottleneckReason, WorkflowStage } from '../../../domain/toolingBottleneckStore';
import type { AssetWithMetadata } from '../../../features/assets';

function extractMetadata<T>(asset: AssetWithMetadata, key: string): T | undefined {
  const value = asset.metadata?.[key];
  if (value === null || value === undefined) {
    return undefined;
  }
  return value as T;
}

export function useAssetBottlenecks(assets: AssetWithMetadata[]) {
  const toolingState = useToolingBottleneckState();

  const assetBottleneckMap = useMemo(() => {
    const map = new Map<string, { stage: WorkflowStage; reason: BottleneckReason; severity: BottleneckSeverity }>();

    if (toolingState.statuses.length === 0) {
      return map;
    }

    for (const asset of assets) {
      const toolingNumber = extractMetadata<string>(asset, 'toolingNumber');
      if (toolingNumber === undefined) {
        continue;
      }

      const bottleneck = toolingState.byToolingNumber[toolingNumber];
      if (bottleneck === undefined) {
        continue;
      }

      map.set(asset.id, {
        stage: bottleneck.dominantStage,
        reason: bottleneck.bottleneckReason,
        severity: bottleneck.severity,
      });
    }

    return map;
  }, [assets, toolingState]);

  return { assetBottleneckMap };
}
