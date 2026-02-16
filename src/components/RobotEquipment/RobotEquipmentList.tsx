/**
 * Robot Equipment List Component
 *
 * Displays robot equipment data with filtering, grouping, and search capabilities.
 */

import React, { useState, useMemo } from 'react'
import {
  useRobotEquipmentEntities,
  useRobotEquipmentStats,
  useRobotEquipmentAreas,
  useRobotEquipmentRobotTypes,
} from '../../domain/robotEquipmentStore'
import {
  RobotEquipmentEntity,
  RobotApplicationType,
} from '../../ingestion/robotEquipmentList/robotEquipmentListTypes'
import './RobotEquipmentList.css'

// ============================================================================
// TYPES
// ============================================================================

interface RobotEquipmentFilters {
  searchTerm: string
  selectedAreas: Set<string>
  selectedRobotTypes: Set<string>
  selectedApplications: Set<RobotApplicationType>
  showNotDelivered: boolean
  showDelivered: boolean
  showESOWConcerns: boolean
  showRemoved: boolean // Show struck-through (removed/cancelled) robots
  installStatus: string | null
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RobotEquipmentList: React.FC = () => {
  const entities = useRobotEquipmentEntities()
  const stats = useRobotEquipmentStats()
  const areas = useRobotEquipmentAreas()
  const robotTypes = useRobotEquipmentRobotTypes()

  const [filters, setFilters] = useState<RobotEquipmentFilters>({
    searchTerm: '',
    selectedAreas: new Set(),
    selectedRobotTypes: new Set(),
    selectedApplications: new Set(),
    showNotDelivered: true,
    showDelivered: true,
    showESOWConcerns: false,
    showRemoved: false, // Hide removed robots by default
    installStatus: null,
  })

  const [groupBy, setGroupBy] = useState<
    'none' | 'area' | 'station' | 'application' | 'robotType' | 'status'
  >('area')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Filter entities
  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      // Search term
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        const searchableText = [
          entity.robotId,
          entity.station,
          entity.area,
          entity.robotType,
          entity.application,
          entity.serialNumber,
          entity.personResponsible,
        ]
          .join(' ')
          .toLowerCase()

        if (!searchableText.includes(term)) return false
      }

      // Area filter
      if (filters.selectedAreas.size > 0 && !filters.selectedAreas.has(entity.area)) {
        return false
      }

      // Robot type filter
      if (
        filters.selectedRobotTypes.size > 0 &&
        !filters.selectedRobotTypes.has(entity.robotType)
      ) {
        return false
      }

      // Application filter
      if (
        filters.selectedApplications.size > 0 &&
        !filters.selectedApplications.has(entity.application)
      ) {
        return false
      }

      // Delivery status filter
      const isDelivered = entity.serialNumber !== 'Not Delivered' && entity.serialNumber !== null
      if (!filters.showDelivered && isDelivered) return false
      if (!filters.showNotDelivered && !isDelivered) return false

      // ESOW concerns filter
      if (filters.showESOWConcerns) {
        const hasConcern =
          entity.differsFromESOW || entity.applicationConcern !== null || !entity.ftfApprovedESOW
        if (!hasConcern) return false
      }

      // Install status filter
      if (filters.installStatus && entity.installStatus !== filters.installStatus) {
        return false
      }

      // Removed robots filter
      if (!filters.showRemoved && entity.isRemoved) {
        return false
      }

      return true
    })
  }, [entities, filters])

  // Group entities
  const groupedEntities = useMemo(() => {
    if (groupBy === 'none') {
      return new Map([['All Robots', filteredEntities]])
    }

    const groups = new Map<string, RobotEquipmentEntity[]>()

    for (const entity of filteredEntities) {
      let key: string
      switch (groupBy) {
        case 'area':
          key = entity.area
          break
        case 'station':
          key = entity.station
          break
        case 'application':
          key = entity.application
          break
        case 'robotType':
          key = entity.robotType
          break
        case 'status':
          key = entity.installStatus || 'Unknown'
          break
        default:
          key = 'All'
      }

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(entity)
    }

    return groups
  }, [filteredEntities, groupBy])

  // Toggle filter
  const toggleAreaFilter = (area: string) => {
    const newSet = new Set(filters.selectedAreas)
    if (newSet.has(area)) {
      newSet.delete(area)
    } else {
      newSet.add(area)
    }
    setFilters({ ...filters, selectedAreas: newSet })
  }

  const toggleRobotTypeFilter = (type: string) => {
    const newSet = new Set(filters.selectedRobotTypes)
    if (newSet.has(type)) {
      newSet.delete(type)
    } else {
      newSet.add(type)
    }
    setFilters({ ...filters, selectedRobotTypes: newSet })
  }

  const toggleGroup = (groupKey: string) => {
    const newSet = new Set(expandedGroups)
    if (newSet.has(groupKey)) {
      newSet.delete(groupKey)
    } else {
      newSet.add(groupKey)
    }
    setExpandedGroups(newSet)
  }

  const expandAll = () => {
    setExpandedGroups(new Set(Array.from(groupedEntities.keys())))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  return (
    <div className="robot-equipment-list">
      {/* Header */}
      <div className="robot-equipment-header">
        <h1>Robot Equipment List</h1>
        <div className="robot-equipment-stats">
          <div className="stat-item">
            <span className="stat-label">Total Robots:</span>
            <span className="stat-value">{stats.totalRobots}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Delivered:</span>
            <span className="stat-value delivered">{stats.delivered}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Not Delivered:</span>
            <span className="stat-value not-delivered">{stats.notDelivered}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Powered On:</span>
            <span className="stat-value powered-on">{stats.poweredOn}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Filtered:</span>
            <span className="stat-value">{filteredEntities.length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="robot-equipment-filters">
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search robots (ID, station, type, serial...)"
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="search-input"
          />
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label className="filter-label">Areas:</label>
            <div className="filter-chips">
              {areas.map((area) => (
                <button
                  key={area}
                  className={`filter-chip ${filters.selectedAreas.has(area) ? 'active' : ''}`}
                  onClick={() => toggleAreaFilter(area)}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label className="filter-label">Robot Types:</label>
            <div className="filter-chips">
              {robotTypes.slice(0, 10).map((type) => (
                <button
                  key={type}
                  className={`filter-chip ${filters.selectedRobotTypes.has(type) ? 'active' : ''}`}
                  onClick={() => toggleRobotTypeFilter(type)}
                >
                  {type}
                </button>
              ))}
              {robotTypes.length > 10 && (
                <span className="filter-more">+{robotTypes.length - 10} more</span>
              )}
            </div>
          </div>
        </div>

        <div className="filter-row">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showDelivered}
              onChange={(e) => setFilters({ ...filters, showDelivered: e.target.checked })}
            />
            Show Delivered
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showNotDelivered}
              onChange={(e) => setFilters({ ...filters, showNotDelivered: e.target.checked })}
            />
            Show Not Delivered
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showESOWConcerns}
              onChange={(e) => setFilters({ ...filters, showESOWConcerns: e.target.checked })}
            />
            ESOW Concerns Only
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showRemoved}
              onChange={(e) => setFilters({ ...filters, showRemoved: e.target.checked })}
            />
            Show Removed (Struck-through)
          </label>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label className="filter-label">Group By:</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="group-select"
            >
              <option value="none">No Grouping</option>
              <option value="area">Area</option>
              <option value="station">Station</option>
              <option value="application">Application</option>
              <option value="robotType">Robot Type</option>
              <option value="status">Install Status</option>
            </select>
          </div>

          {groupBy !== 'none' && (
            <div className="expand-collapse-buttons">
              <button onClick={expandAll} className="btn-expand">
                Expand All
              </button>
              <button onClick={collapseAll} className="btn-collapse">
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Robot List */}
      <div className="robot-equipment-content">
        {Array.from(groupedEntities.entries()).map(([groupKey, robots]) => (
          <div key={groupKey} className="robot-group">
            {groupBy !== 'none' && (
              <div className="robot-group-header" onClick={() => toggleGroup(groupKey)}>
                <span className="group-toggle">{expandedGroups.has(groupKey) ? '▼' : '▶'}</span>
                <span className="group-title">{groupKey}</span>
                <span className="group-count">({robots.length})</span>
              </div>
            )}

            {(groupBy === 'none' || expandedGroups.has(groupKey)) && (
              <div className="robot-cards">
                {robots.map((robot) => (
                  <RobotEquipmentCard key={robot.canonicalKey} robot={robot} />
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredEntities.length === 0 && (
          <div className="no-results">
            <p>No robots match the current filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// ROBOT CARD COMPONENT
// ============================================================================

interface RobotEquipmentCardProps {
  robot: RobotEquipmentEntity
}

const RobotEquipmentCard: React.FC<RobotEquipmentCardProps> = ({ robot }) => {
  const [expanded, setExpanded] = useState(false)

  const isDelivered = robot.serialNumber !== 'Not Delivered' && robot.serialNumber !== null
  const hasESOWConcern = robot.differsFromESOW || robot.applicationConcern !== null

  return (
    <div
      className={`robot-card ${!isDelivered ? 'not-delivered' : ''} ${hasESOWConcern ? 'esow-concern' : ''} ${robot.isRemoved ? 'removed' : ''}`}
    >
      <div className="robot-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="robot-card-title">
          <span className="robot-id">{robot.robotId}</span>
          <span className="robot-station">{robot.station}</span>
        </div>
        <div className="robot-card-badges">
          {robot.isRemoved && <span className="badge badge-removed">Removed</span>}
          {!isDelivered && <span className="badge badge-warning">Not Delivered</span>}
          {hasESOWConcern && <span className="badge badge-alert">ESOW</span>}
          {robot.installStatus && <span className="badge badge-status">{robot.installStatus}</span>}
        </div>
      </div>

      <div className="robot-card-body">
        <div className="robot-info-grid">
          <div className="info-item">
            <span className="info-label">Type:</span>
            <span className="info-value">{robot.robotType}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Application:</span>
            <span className="info-value">{robot.application}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Serial:</span>
            <span className="info-value">{robot.serialNumber || 'N/A'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Area:</span>
            <span className="info-value">{robot.area}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Bundle:</span>
            <span className="info-value">{robot.bundle}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Responsible:</span>
            <span className="info-value">{robot.personResponsible}</span>
          </div>
        </div>

        {expanded && (
          <div className="robot-details">
            {/* Equipment Details */}
            <div className="details-section">
              <h4>Equipment</h4>
              <div className="details-grid">
                {robot.weldguns && (
                  <div className="detail-item">
                    <span className="detail-label">Weldguns:</span>
                    <span className="detail-value">
                      {robot.weldguns.numberOfGuns} × {robot.weldguns.gunType} (
                      {robot.weldguns.gunSize})
                    </span>
                  </div>
                )}
                {robot.sealing && (
                  <div className="detail-item">
                    <span className="detail-label">Sealing:</span>
                    <span className="detail-value">
                      {robot.sealing.robotSealer ? 'Robot Sealer' : ''}
                      {robot.sealing.sealer ? ', Sealer' : ''}
                      {robot.sealing.adhesive ? ', Adhesive' : ''}
                    </span>
                  </div>
                )}
                {robot.track && (
                  <div className="detail-item">
                    <span className="detail-label">Track (7th Axis):</span>
                    <span className="detail-value">{robot.track.length}mm</span>
                  </div>
                )}
                {robot.bases && (
                  <div className="detail-item">
                    <span className="detail-label">Base:</span>
                    <span className="detail-value">
                      {robot.bases.baseCode || robot.bases.height}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Cable Specs */}
            {(robot.mainCable || robot.tipdressCable || robot.teachPendantCable) && (
              <div className="details-section">
                <h4>Cables</h4>
                <div className="details-grid">
                  {robot.mainCable && (
                    <div className="detail-item">
                      <span className="detail-label">Main Cable:</span>
                      <span className="detail-value">{robot.mainCable.total}mm total</span>
                    </div>
                  )}
                  {robot.tipdressCable && (
                    <div className="detail-item">
                      <span className="detail-label">Tipdress Cable:</span>
                      <span className="detail-value">{robot.tipdressCable.total}mm total</span>
                    </div>
                  )}
                  {robot.teachPendantCable && (
                    <div className="detail-item">
                      <span className="detail-label">Teach Pendant:</span>
                      <span className="detail-value">{robot.teachPendantCable.total}mm total</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ESOW Compliance */}
            <div className="details-section">
              <h4>ESOW Compliance</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">FTF Approved:</span>
                  <span className="detail-value">{robot.ftfApprovedDesignList ? 'Yes' : 'No'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">ESOW Robot Type:</span>
                  <span className="detail-value">{robot.esowRobotType || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Differs from ESOW:</span>
                  <span className={`detail-value ${robot.differsFromESOW ? 'warning' : ''}`}>
                    {robot.differsFromESOW ? 'Yes' : 'No'}
                  </span>
                </div>
                {robot.applicationConcern && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Concern:</span>
                    <span className="detail-value warning">{robot.applicationConcern}</span>
                  </div>
                )}
                {robot.esowComment && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Comment:</span>
                    <span className="detail-value">{robot.esowComment}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
