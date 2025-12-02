/**
 * Assets Page Tests
 *
 * Component tests for the Assets Tab / Page:
 * - Filtering by Program + REUSE shows expected subset
 * - Summary cards reflect filtered data
 * - "Open in Simulation Status" calls the correct navigation hook/route
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../ui/ThemeContext';
import { AssetsPage } from '../../../app/routes/AssetsPage';
import { coreStore } from '../../../domain/coreStore';
import type { UnifiedAsset } from '../../../domain/UnifiedModel';
import { toolingBottleneckStore } from '../../../domain/toolingBottleneckStore';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockAsset(overrides: Partial<UnifiedAsset> & { id: string }): UnifiedAsset {
  return {
    name: `Asset ${overrides.id}`,
    kind: 'ROBOT',
    sourcing: 'UNKNOWN',
    metadata: {},
    sourceFile: 'test.xlsx',
    sheetName: 'Sheet1',
    rowIndex: 1,
    ...overrides,
  };
}

function renderAssetsPage() {
  return render(
    <ThemeProvider>
      <BrowserRouter>
        <AssetsPage />
      </BrowserRouter>
    </ThemeProvider>
  );
}

// Mock navigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ============================================================================
// TEST DATA
// ============================================================================

const testAssets: UnifiedAsset[] = [
  createMockAsset({
    id: 'robot-1',
    name: 'Robot R01',
    kind: 'ROBOT',
    sourcing: 'REUSE',
    areaName: 'Underbody',
    stationNumber: '010',
    metadata: {
      projectCode: 'STLA-S',
      lineCode: 'BN_B05',
      detailedKind: 'Robot',
      reuseAllocationStatus: 'AVAILABLE',
      toolingNumber: 'T-ROBOT-1',
    },
  }),
  createMockAsset({
    id: 'robot-2',
    name: 'Robot R02',
    kind: 'ROBOT',
    sourcing: 'REUSE',
    areaName: 'Underbody',
    stationNumber: '020',
    metadata: {
      projectCode: 'STLA-S',
      lineCode: 'BN_B05',
      detailedKind: 'Robot',
      reuseAllocationStatus: 'ALLOCATED',
    },
  }),
  createMockAsset({
    id: 'robot-3',
    name: 'Robot R03',
    kind: 'ROBOT',
    sourcing: 'NEW_BUY',
    areaName: 'Rear Unit',
    stationNumber: '030',
    metadata: {
      projectCode: 'P1MX',
      lineCode: 'BC_B04',
      detailedKind: 'Robot',
    },
  }),
  createMockAsset({
    id: 'gun-1',
    name: 'Weld Gun WG01',
    kind: 'GUN',
    sourcing: 'REUSE',
    areaName: 'Underbody',
    stationNumber: '010',
    metadata: {
      projectCode: 'STLA-S',
      lineCode: 'BN_B05',
      detailedKind: 'WeldGun',
      reuseAllocationStatus: 'IN_USE',
      gunId: 'WG01',
    },
  }),
  createMockAsset({
    id: 'riser-1',
    name: 'Riser RSR01',
    kind: 'TOOL',
    sourcing: 'UNKNOWN',
    areaName: 'Underbody',
    stationNumber: '010',
    metadata: {
      projectCode: 'STLA-S',
      detailedKind: 'Riser',
    },
  }),
];

// ============================================================================
// TESTS
// ============================================================================

describe('AssetsPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    coreStore.clear();
    toolingBottleneckStore.clear();
  });

  describe('Empty state', () => {
    it('shows empty state when no assets are loaded', () => {
      renderAssetsPage();

      expect(screen.getByText('No Assets Found')).toBeInTheDocument();
      expect(screen.getByText('Go to Data Loader')).toBeInTheDocument();
    });

    it('navigates to data loader when CTA is clicked', () => {
      renderAssetsPage();

      const ctaButton = screen.getByText('Go to Data Loader');
      fireEvent.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('/data-loader');
    });
  });

  describe('With data', () => {
    beforeEach(() => {
      coreStore.setData({
        projects: [],
        areas: [],
        cells: [],
        robots: testAssets.filter((a) => a.kind === 'ROBOT') as never[],
        tools: testAssets.filter((a) => a.kind !== 'ROBOT') as never[],
        warnings: [],
      });
    });

    it('renders the assets page with data', () => {
      renderAssetsPage();

      expect(screen.getByTestId('assets-page')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
    });

    it('shows total asset count in summary cards', () => {
      renderAssetsPage();

      const totalCard = screen.getByTestId('assets-total-count');
      expect(totalCard).toBeInTheDocument();
      expect(within(totalCard).getByText('5')).toBeInTheDocument();
    });

    it('shows unknown sourcing count with warning', () => {
      renderAssetsPage();

      const unknownCard = screen.getByTestId('assets-unknown-sourcing');
      expect(unknownCard).toBeInTheDocument();
      expect(within(unknownCard).getByText('1')).toBeInTheDocument();
    });

    it('renders all assets in the table', () => {
      renderAssetsPage();

      expect(screen.getByText('Robot R01')).toBeInTheDocument();
      expect(screen.getByText('Robot R02')).toBeInTheDocument();
      expect(screen.getByText('Robot R03')).toBeInTheDocument();
      expect(screen.getByText('Weld Gun WG01')).toBeInTheDocument();
      expect(screen.getByText('Riser RSR01')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      coreStore.setData({
        projects: [],
        areas: [],
        cells: [],
        robots: testAssets.filter((a) => a.kind === 'ROBOT') as never[],
        tools: testAssets.filter((a) => a.kind !== 'ROBOT') as never[],
        warnings: [],
      });
    });

    it('shows bottleneck badge when tooling snapshot matches asset', () => {
      toolingBottleneckStore.loadSnapshot({
        statuses: [
          {
            toolingNumber: 'T-ROBOT-1',
            toolType: 'Robot',
            stationKey: 'program|plant|unit|line|010',
            stationNumber: '010',
            dominantStage: 'DESIGN',
            bottleneckReason: 'BUILD_AHEAD_OF_SIM',
            severity: 'critical',
            designStage: { stage: 'DESIGN', status: 'BLOCKED' },
            simulationStage: { stage: 'SIMULATION', status: 'ON_TRACK' },
          },
        ],
      });

      coreStore.setData({
        projects: [],
        areas: [],
        cells: [],
        robots: testAssets.filter((a) => a.id === 'robot-1') as never[],
        tools: [] as never[],
        warnings: [],
      });

      renderAssetsPage();

      expect(screen.getByText(/Blocked \(DESIGN\)/i)).toBeInTheDocument();
    });

    it('filters to bottleneck assets when toggle enabled', () => {
      toolingBottleneckStore.loadSnapshot({
        statuses: [
          {
            toolingNumber: 'T-ROBOT-1',
            toolType: 'Robot',
            stationKey: 'program|plant|unit|line|010',
            stationNumber: '010',
            dominantStage: 'DESIGN',
            bottleneckReason: 'BUILD_AHEAD_OF_SIM',
            severity: 'critical',
            designStage: { stage: 'DESIGN', status: 'BLOCKED' },
            simulationStage: { stage: 'SIMULATION', status: 'ON_TRACK' },
          },
        ],
      });

      renderAssetsPage();

      const toggle = screen.getByTestId('bottleneck-only-filter');
      fireEvent.click(toggle);

      expect(screen.getByText('Robot R01')).toBeInTheDocument();
      expect(screen.queryByText('Robot R02')).not.toBeInTheDocument();
      expect(screen.queryByText('Robot R03')).not.toBeInTheDocument();
    });

    it('filters by asset type', () => {
      renderAssetsPage();

      const typeSelect = screen.getByTestId('asset-type-filter');
      fireEvent.change(typeSelect, { target: { value: 'ROBOT' } });

      // Should show only robots
      expect(screen.getByText('Robot R01')).toBeInTheDocument();
      expect(screen.getByText('Robot R02')).toBeInTheDocument();
      expect(screen.getByText('Robot R03')).toBeInTheDocument();
      expect(screen.queryByText('Weld Gun WG01')).not.toBeInTheDocument();
      expect(screen.queryByText('Riser RSR01')).not.toBeInTheDocument();
    });

    it('filters by sourcing type', () => {
      renderAssetsPage();

      const sourcingSelect = screen.getByTestId('sourcing-filter');
      fireEvent.change(sourcingSelect, { target: { value: 'REUSE' } });

      // Should show only REUSE assets (3 total)
      expect(screen.getByText('Robot R01')).toBeInTheDocument();
      expect(screen.getByText('Robot R02')).toBeInTheDocument();
      expect(screen.getByText('Weld Gun WG01')).toBeInTheDocument();
      expect(screen.queryByText('Robot R03')).not.toBeInTheDocument(); // NEW_BUY
      expect(screen.queryByText('Riser RSR01')).not.toBeInTheDocument(); // UNKNOWN
    });

    it('filters by Program + REUSE and shows expected subset', () => {
      renderAssetsPage();

      // First filter by program
      const programSelect = screen.getByTestId('program-filter');
      fireEvent.change(programSelect, { target: { value: 'STLA-S' } });

      // Then filter by sourcing
      const sourcingSelect = screen.getByTestId('sourcing-filter');
      fireEvent.change(sourcingSelect, { target: { value: 'REUSE' } });

      // Should show only STLA-S REUSE assets
      expect(screen.getByText('Robot R01')).toBeInTheDocument();
      expect(screen.getByText('Robot R02')).toBeInTheDocument();
      expect(screen.getByText('Weld Gun WG01')).toBeInTheDocument();
      expect(screen.queryByText('Robot R03')).not.toBeInTheDocument(); // P1MX
      expect(screen.queryByText('Riser RSR01')).not.toBeInTheDocument(); // UNKNOWN sourcing
    });

    it('filters by reuse allocation status', () => {
      renderAssetsPage();

      // First filter by REUSE sourcing
      const sourcingSelect = screen.getByTestId('sourcing-filter');
      fireEvent.change(sourcingSelect, { target: { value: 'REUSE' } });

      // Then filter by AVAILABLE status
      const statusSelect = screen.getByTestId('reuse-status-filter');
      fireEvent.change(statusSelect, { target: { value: 'AVAILABLE' } });

      // Should show only AVAILABLE reuse assets
      expect(screen.getByText('Robot R01')).toBeInTheDocument();
      expect(screen.queryByText('Robot R02')).not.toBeInTheDocument(); // ALLOCATED
      expect(screen.queryByText('Weld Gun WG01')).not.toBeInTheDocument(); // IN_USE
    });

    it('can search by name', () => {
      renderAssetsPage();

      const searchInput = screen.getByPlaceholderText('Search by name, station, area, model...');
      fireEvent.change(searchInput, { target: { value: 'Weld' } });

      // Should show only the weld gun
      expect(screen.getByText('Weld Gun WG01')).toBeInTheDocument();
      expect(screen.queryByText('Robot R01')).not.toBeInTheDocument();
    });

    it('summary cards update to reflect filtered data', () => {
      renderAssetsPage();

      // Filter to REUSE only
      const sourcingSelect = screen.getByTestId('sourcing-filter');
      fireEvent.change(sourcingSelect, { target: { value: 'REUSE' } });

      // Total should now be 3 (the REUSE assets)
      const totalCard = screen.getByTestId('assets-total-count');
      expect(within(totalCard).getByText('3')).toBeInTheDocument();
    });

    it('clears filters when clear button is clicked', () => {
      renderAssetsPage();

      // Apply a filter
      const typeSelect = screen.getByTestId('asset-type-filter');
      fireEvent.change(typeSelect, { target: { value: 'ROBOT' } });

      // Click clear filters
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);

      // All assets should be visible again
      expect(screen.getByText('Robot R01')).toBeInTheDocument();
      expect(screen.getByText('Weld Gun WG01')).toBeInTheDocument();
      expect(screen.getByText('Riser RSR01')).toBeInTheDocument();
    });
  });

  describe('Row interaction', () => {
    beforeEach(() => {
      coreStore.setData({
        projects: [],
        areas: [],
        cells: [],
        robots: testAssets.filter((a) => a.kind === 'ROBOT') as never[],
        tools: testAssets.filter((a) => a.kind !== 'ROBOT') as never[],
        warnings: [],
      });
    });

    it('opens detail panel when row is clicked', () => {
      renderAssetsPage();

      // Click on a row
      const robotRow = screen.getByText('Robot R01');
      fireEvent.click(robotRow);

      // Detail panel should open
      expect(screen.getByText('Simulation Context')).toBeInTheDocument();
      expect(screen.getByText('Open in Simulation Status')).toBeInTheDocument();
    });
  });

  describe('Open in Simulation Status navigation', () => {
    beforeEach(() => {
      coreStore.setData({
        projects: [],
        areas: [],
        cells: [],
        robots: testAssets.filter((a) => a.kind === 'ROBOT') as never[],
        tools: testAssets.filter((a) => a.kind !== 'ROBOT') as never[],
        warnings: [],
      });
    });

    it('navigates to dashboard with filter params when "Open in Simulation Status" is clicked', () => {
      renderAssetsPage();

      // Open detail panel by clicking a row
      const robotRow = screen.getByText('Robot R01');
      fireEvent.click(robotRow);

      // Click the navigation button
      const navButton = screen.getByText('Open in Simulation Status');
      fireEvent.click(navButton);

      // Should navigate to dashboard with params
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard')
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('area=Underbody')
      );
    });

    it('includes line and station in navigation params', () => {
      renderAssetsPage();

      // Open detail panel
      const robotRow = screen.getByText('Robot R01');
      fireEvent.click(robotRow);

      // Click navigation button
      const navButton = screen.getByText('Open in Simulation Status');
      fireEvent.click(navButton);

      // Check that navigation includes all params
      const callArg = mockNavigate.mock.calls[0][0];
      expect(callArg).toContain('line=BN_B05');
      expect(callArg).toContain('station=010');
    });
  });

  describe('Visual cues for reuse', () => {
    beforeEach(() => {
      coreStore.setData({
        projects: [],
        areas: [],
        cells: [],
        robots: testAssets.filter((a) => a.kind === 'ROBOT') as never[],
        tools: testAssets.filter((a) => a.kind !== 'ROBOT') as never[],
        warnings: [],
      });
    });

    it('shows Reuse badge for REUSE assets', () => {
      renderAssetsPage();

      // Should have Reuse badges visible (multiple due to table cells and summary cards)
      const reuseBadges = screen.getAllByText('Reuse');
      expect(reuseBadges.length).toBeGreaterThan(0);
    });

    it('shows allocation status badges for REUSE assets', () => {
      renderAssetsPage();

      // Should show various allocation statuses in table
      const availableBadges = screen.getAllByText('Available');
      expect(availableBadges.length).toBeGreaterThan(0);

      const allocatedBadges = screen.getAllByText('Allocated');
      expect(allocatedBadges.length).toBeGreaterThan(0);

      const inUseBadges = screen.getAllByText('In Use');
      expect(inUseBadges.length).toBeGreaterThan(0);
    });

    it('shows New Buy badge for NEW_BUY assets', () => {
      renderAssetsPage();

      // Multiple "New Buy" texts exist: dropdown option, summary card, and table badge
      const newBuyElements = screen.getAllByText('New Buy');
      expect(newBuyElements.length).toBeGreaterThan(0);
    });
  });
});
