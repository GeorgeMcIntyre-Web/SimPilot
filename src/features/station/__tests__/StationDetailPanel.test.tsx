// StationDetailPanel Tests
// Tests for the station detail drawer component

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StationDetailPanel } from '../StationDetailPanel'
import { CellSnapshot, CrossRefFlag } from '../../../domain/crossRef/CrossRefTypes'

// ============================================================================
// TEST HELPERS
// ============================================================================

const createMockCell = (overrides: Partial<CellSnapshot> = {}): CellSnapshot => ({
  stationKey: 'TEST-001',
  areaKey: 'AREA-A',
  lineCode: 'LINE-1',
  simulationStatus: {
    stationKey: 'TEST-001',
    areaKey: 'AREA-A',
    lineCode: 'LINE-1',
    firstStageCompletion: 85,
    finalDeliverablesCompletion: 75,
    raw: {
      stageMetrics: {
        'ROBOT POSITION - STAGE 1': 90,
        'DCS CONFIGURED': 80,
        'DRESS PACK CONFIGURED': 70
      }
    }
  },
  tools: [],
  robots: [
    {
      stationKey: 'TEST-001',
      robotKey: 'R001',
      caption: 'Spot Welding Robot',
      hasDressPackInfo: true,
      raw: {}
    }
  ],
  weldGuns: [
    {
      stationKey: 'TEST-001',
      gunKey: 'G001',
      deviceName: 'Servo Gun A',
      raw: {}
    }
  ],
  gunForces: [
    {
      gunKey: 'G001',
      requiredForce: 4500,
      raw: {}
    }
  ],
  risers: [
    {
      stationKey: 'TEST-001',
      brand: 'KUKA',
      height: 250,
      raw: {}
    }
  ],
  flags: [],
  ...overrides
})

const createMockFlag = (severity: 'ERROR' | 'WARNING', type: CrossRefFlag['type']): CrossRefFlag => ({
  type,
  stationKey: 'TEST-001',
  message: `Mock ${severity.toLowerCase()} flag for ${type}`,
  severity
})

// ============================================================================
// TESTS
// ============================================================================

describe('StationDetailPanel', () => {
  describe('Null Cell Handling', () => {
    it('renders nothing when cell is null', () => {
      const onClose = vi.fn()
      const { container } = render(<StationDetailPanel cell={null} onClose={onClose} />)

      // Container should be empty
      expect(container.innerHTML).toBe('')
    })
  })

  describe('Basic Rendering', () => {
    it('renders the drawer when cell is provided', () => {
      const cell = createMockCell()
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByTestId('station-detail-drawer')).toBeInTheDocument()
      expect(screen.getByTestId('drawer-backdrop')).toBeInTheDocument()
    })

    it('displays station key and area in header', () => {
      const cell = createMockCell({
        stationKey: 'STA-123',
        areaKey: 'Underbody'
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('STA-123')).toBeInTheDocument()
      expect(screen.getByText(/Underbody/)).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
      const cell = createMockCell()
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('close-drawer-button'))
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('calls onClose when backdrop is clicked', () => {
      const cell = createMockCell()
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('drawer-backdrop'))
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  describe('Health Score and Traffic Light', () => {
    it('shows GREEN traffic light for high score (>= 80)', () => {
      const cell = createMockCell({
        simulationStatus: {
          stationKey: 'TEST-001',
          raw: {
            stageMetrics: {
              'STAGE 1': 90,
              'STAGE 2': 85,
              'STAGE 3': 88
            }
          }
        },
        flags: [] // No flags, so no penalty
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('GREEN')).toBeInTheDocument()
    })

    it('shows AMBER traffic light for medium score (50-79)', () => {
      const cell = createMockCell({
        simulationStatus: {
          stationKey: 'TEST-001',
          raw: {
            stageMetrics: {
              'STAGE 1': 70,
              'STAGE 2': 65,
              'STAGE 3': 60
            }
          }
        },
        flags: []
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('AMBER')).toBeInTheDocument()
    })

    it('shows RED traffic light for low score (< 50)', () => {
      const cell = createMockCell({
        simulationStatus: {
          stationKey: 'TEST-001',
          raw: {
            stageMetrics: {
              'STAGE 1': 30,
              'STAGE 2': 25,
              'STAGE 3': 20
            }
          }
        },
        flags: []
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('RED')).toBeInTheDocument()
    })

    it('reduces score for ERROR flags', () => {
      const cell = createMockCell({
        simulationStatus: {
          stationKey: 'TEST-001',
          raw: {
            stageMetrics: {
              'STAGE 1': 90 // Would be GREEN without penalty
            }
          }
        },
        flags: [
          createMockFlag('ERROR', 'MISSING_GUN_FORCE_FOR_WELD_GUN'),
          createMockFlag('ERROR', 'ROBOT_MISSING_DRESS_PACK_INFO')
        ] // 2 errors = 30 point penalty -> 60 score = AMBER
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('AMBER')).toBeInTheDocument()
    })
  })

  describe('Simulation Gates Filter', () => {
    it('shows all gates by default', () => {
      const cell = createMockCell({
        simulationStatus: {
          stationKey: 'TEST-001',
          raw: {
            stageMetrics: {
              'ROBOT POSITION': 100,
              'DCS CONFIGURED': 50,
              'DRESS PACK': 75
            }
          }
        }
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      // All gates should be visible
      expect(screen.getByText('Robot Position')).toBeInTheDocument()
      expect(screen.getByText('Dcs Configured')).toBeInTheDocument()
      expect(screen.getByText('Dress Pack')).toBeInTheDocument()
    })

    it('shows only incomplete gates when filter is active', () => {
      const cell = createMockCell({
        simulationStatus: {
          stationKey: 'TEST-001',
          raw: {
            stageMetrics: {
              'ROBOT POSITION': 100,
              'DCS CONFIGURED': 50,
              'DRESS PACK': 75
            }
          }
        }
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      // Toggle the filter
      const toggleLabel = screen.getByTestId('incomplete-only-toggle')
      const checkbox = toggleLabel.querySelector('input[type="checkbox"]')
      expect(checkbox).toBeInTheDocument()
      fireEvent.click(checkbox!)

      // Complete gate should be hidden
      expect(screen.queryByText('Robot Position')).not.toBeInTheDocument()

      // Incomplete gates should still be visible
      expect(screen.getByText('Dcs Configured')).toBeInTheDocument()
      expect(screen.getByText('Dress Pack')).toBeInTheDocument()
    })

    it('shows success message when all gates complete and filter active', () => {
      const cell = createMockCell({
        simulationStatus: {
          stationKey: 'TEST-001',
          raw: {
            stageMetrics: {
              'ROBOT POSITION': 100,
              'DCS CONFIGURED': 100,
              'DRESS PACK': 100
            }
          }
        }
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      // Toggle the filter
      const toggleLabel = screen.getByTestId('incomplete-only-toggle')
      const checkbox = toggleLabel.querySelector('input[type="checkbox"]')
      fireEvent.click(checkbox!)

      expect(screen.getByText('All gates are complete!')).toBeInTheDocument()
    })
  })

  describe('Flags Grouped by Severity', () => {
    it('shows errors before warnings', () => {
      const cell = createMockCell({
        flags: [
          createMockFlag('WARNING', 'TOOL_WITHOUT_OWNER'),
          createMockFlag('ERROR', 'MISSING_GUN_FORCE_FOR_WELD_GUN'),
          createMockFlag('WARNING', 'ROBOT_MISSING_DRESS_PACK_INFO'),
          createMockFlag('ERROR', 'STATION_WITHOUT_SIMULATION_STATUS')
        ]
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      // Check that errors section appears
      expect(screen.getByText('Errors (2)')).toBeInTheDocument()
      expect(screen.getByText('Warnings (2)')).toBeInTheDocument()

      // Verify error messages are shown (using getAllByText since the message may appear in multiple places)
      expect(screen.getAllByText(/Mock error flag for MISSING_GUN_FORCE_FOR_WELD_GUN/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Mock error flag for STATION_WITHOUT_SIMULATION_STATUS/).length).toBeGreaterThan(0)

      // Verify warning messages are shown
      expect(screen.getAllByText(/Mock warning flag for TOOL_WITHOUT_OWNER/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Mock warning flag for ROBOT_MISSING_DRESS_PACK_INFO/).length).toBeGreaterThan(0)
    })

    it('shows no issues message when no flags exist', () => {
      const cell = createMockCell({
        flags: []
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      // The Flags section is collapsed by default when there are no flags
      // Click to expand it
      const flagsSectionButton = screen.getByText('Flags & Issues')
      fireEvent.click(flagsSectionButton)

      expect(screen.getByText('No issues detected for this station.')).toBeInTheDocument()
    })

    it('shows only errors section when no warnings', () => {
      const cell = createMockCell({
        flags: [
          createMockFlag('ERROR', 'MISSING_GUN_FORCE_FOR_WELD_GUN')
        ]
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('Errors (1)')).toBeInTheDocument()
      expect(screen.queryByText(/Warnings/)).not.toBeInTheDocument()
    })

    it('shows only warnings section when no errors', () => {
      const cell = createMockCell({
        flags: [
          createMockFlag('WARNING', 'TOOL_WITHOUT_OWNER')
        ]
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('Warnings (1)')).toBeInTheDocument()
      expect(screen.queryByText(/Errors/)).not.toBeInTheDocument()
    })
  })

  describe('Assets Display', () => {
    it('shows robots with dress pack status', () => {
      const cell = createMockCell({
        robots: [
          { stationKey: 'TEST-001', robotKey: 'R001', caption: 'Robot 1', hasDressPackInfo: true, raw: {} },
          { stationKey: 'TEST-001', robotKey: 'R002', caption: 'Robot 2', hasDressPackInfo: false, raw: {} }
        ]
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('R001')).toBeInTheDocument()
      expect(screen.getByText('R002')).toBeInTheDocument()
      expect(screen.getByText('Dress Pack ✓')).toBeInTheDocument()
      expect(screen.getByText('No Dress Pack')).toBeInTheDocument()
    })

    it('shows weld guns with force status', () => {
      const cell = createMockCell({
        weldGuns: [
          { stationKey: 'TEST-001', gunKey: 'G001', deviceName: 'Gun 1', raw: {} },
          { stationKey: 'TEST-001', gunKey: 'G002', deviceName: 'Gun 2', raw: {} }
        ],
        gunForces: [
          { gunKey: 'G001', requiredForce: 4500, raw: {} }
          // G002 has no force data
        ]
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('G001')).toBeInTheDocument()
      expect(screen.getByText('G002')).toBeInTheDocument()
      expect(screen.getByText('Force ✓')).toBeInTheDocument()
      expect(screen.getByText('No Force Data')).toBeInTheDocument()
    })

    it('shows riser summary', () => {
      const cell = createMockCell({
        risers: [
          { stationKey: 'TEST-001', brand: 'KUKA', height: 250, raw: {} },
          { stationKey: 'TEST-001', brand: 'ABB', height: 300, raw: {} }
        ]
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('KUKA')).toBeInTheDocument()
      expect(screen.getByText(/Height: 250mm/)).toBeInTheDocument()
      expect(screen.getByText('ABB')).toBeInTheDocument()
      expect(screen.getByText(/Height: 300mm/)).toBeInTheDocument()
    })

    it('shows empty state for assets when none exist', () => {
      const cell = createMockCell({
        robots: [],
        weldGuns: [],
        risers: []
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('No robots assigned')).toBeInTheDocument()
      expect(screen.getByText('No weld guns assigned')).toBeInTheDocument()
      expect(screen.getByText('No risers assigned')).toBeInTheDocument()
    })
  })

  describe('Missing Simulation Status', () => {
    it('shows message when no simulation data available', () => {
      const cell = createMockCell({
        simulationStatus: undefined
      })
      const onClose = vi.fn()

      render(<StationDetailPanel cell={cell} onClose={onClose} />)

      expect(screen.getByText('No simulation status data available for this station.')).toBeInTheDocument()
    })
  })
})
