import { coreStore } from '../../coreStore'
import { Project, Area, Cell } from '../../core'

export const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  name: 'Test Project',
  customer: 'Test Customer',
  status: 'Running',
  ...overrides,
})

export const makeArea = (overrides: Partial<Area> = {}): Area => ({
  id: 'area-1',
  projectId: 'proj-1',
  name: 'Test Area',
  ...overrides,
})

export const makeCell = (overrides: Partial<Cell> = {}): Cell => ({
  id: 'cell-1',
  projectId: 'proj-1',
  areaId: 'area-1',
  name: 'Cell 1',
  code: '010',
  status: 'InProgress',
  ...overrides,
})

export const seedStore = ({
  projects = [makeProject()],
  areas = [makeArea()],
  cells = [],
}: {
  projects?: Project[]
  areas?: Area[]
  cells?: Cell[]
}) => {
  coreStore.setData({
    projects,
    areas,
    cells,
    robots: [],
    tools: [],
    warnings: [],
  })
}

export const clearStore = () => coreStore.clear()
