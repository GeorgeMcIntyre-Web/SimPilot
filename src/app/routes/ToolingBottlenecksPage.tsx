import { PageHeader } from '../../ui/components/PageHeader';
import { PageHint } from '../../ui/components/PageHint';
import { DashboardBottlenecksPanel } from '../../features/dashboard/DashboardBottlenecksPanel';

export function ToolingBottlenecksPage() {
  return (
    <div className="space-y-6" data-testid="tooling-bottlenecks-page">
      <PageHeader
        title="Tooling Bottlenecks"
        subtitle={
          <PageHint
            standardText="Comprehensive view of all tooling workflow bottlenecks"
            flowerText="Your command center for identifying and resolving critical tooling blockers across all programs."
          />
        }
      />

      <DashboardBottlenecksPanel variant="standalone" />
    </div>
  );
}

export default ToolingBottlenecksPage;
