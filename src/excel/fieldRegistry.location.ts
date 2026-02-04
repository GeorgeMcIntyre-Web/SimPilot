import { FieldDescriptor } from './fieldRegistry.types'

export const locationFieldDescriptors: FieldDescriptor[] = [
  {
    id: 'project_id',
    canonicalName: 'Project',
    synonyms: ['project', 'project name', 'project code', 'proyect', 'program'],
    description: 'Project identifier or name',
    expectedType: 'string',
    headerRegexes: [/proyect/i, /project\s*(code|name|id)?/i, /program/i],
    importance: 'high'
  },
  {
    id: 'area_name',
    canonicalName: 'Area',
    synonyms: ['area', 'area name', 'area code', 'sector', 'gewerk'],
    description: 'Work area or sector within the project',
    expectedType: 'string',
    headerRegexes: [/^area$/i, /area\s*(name|code)?/i, /gewerk/i],
    importance: 'high'
  },
  {
    id: 'cell_id',
    canonicalName: 'Cell',
    synonyms: ['cell', 'cell id', 'cell code', 'cell name', 'vc cell'],
    description: 'Work cell identifier',
    expectedType: 'string',
    headerRegexes: [/cell\s*(id|code|name)?/i, /vc\s*cell/i],
    importance: 'high'
  },
  {
    id: 'assembly_line',
    canonicalName: 'Assembly Line',
    synonyms: ['assembly line', 'line', 'line code', 'assembly'],
    description: 'Assembly line identifier',
    expectedType: 'string',
    headerRegexes: [/assembly\s*line/i, /^line$/i, /line\s*(code)?/i],
    importance: 'high'
  },
  {
    id: 'station_name',
    canonicalName: 'Station',
    synonyms: ['station', 'station number', 'station code', 'station no'],
    description: 'Work station identifier',
    expectedType: 'string',
    headerRegexes: [/^station$/i, /station\s*(number|code|no|#)/i],
    importance: 'high'
  },
  {
    id: 'zone',
    canonicalName: 'Zone',
    synonyms: ['zone', 'location', 'position', 'zone/subzone'],
    description: 'Zone or location within area',
    expectedType: 'string',
    headerRegexes: [/zone/i, /location/i, /position/i],
    importance: 'medium'
  },
  {
    id: 'sector',
    canonicalName: 'Sector',
    synonyms: ['sector', 'sub-sector', 'sous-secteur', 'new sector'],
    description: 'Sector within project',
    expectedType: 'string',
    headerRegexes: [/secteur?/i, /sub.?sector/i],
    importance: 'medium'
  },
  {
    id: 'old_project',
    canonicalName: 'Old Project',
    synonyms: ['old project', 'from project', 'source project', 'proyect'],
    description: 'Source project for reused equipment',
    expectedType: 'string',
    headerRegexes: [/old\s*project/i, /from\s*project/i, /source\s*project/i],
    importance: 'medium'
  },
  {
    id: 'old_line',
    canonicalName: 'Old Line',
    synonyms: ['old line', 'from line', 'source line'],
    description: 'Source assembly line for reused equipment',
    expectedType: 'string',
    headerRegexes: [/^old\s*line$/i, /from\s*line/i, /source\s*line/i],
    importance: 'high'
  },
  {
    id: 'old_station',
    canonicalName: 'Old Station',
    synonyms: ['old station', 'from station', 'source station'],
    description: 'Source station for reused equipment',
    expectedType: 'string',
    headerRegexes: [/^old\s*station$/i, /from\s*station/i, /source\s*station/i],
    importance: 'high'
  },
  {
    id: 'old_area',
    canonicalName: 'Old Area',
    synonyms: ['old area', 'from area', 'source area'],
    description: 'Source area for reused equipment',
    expectedType: 'string',
    headerRegexes: [/old\s*area/i, /from\s*area/i],
    importance: 'low'
  },
  {
    id: 'target_project',
    canonicalName: 'Target Project',
    synonyms: ['target project', 'new project', 'to project', 'stla/p1h/o1h/lpm'],
    description: 'Target project for equipment allocation',
    expectedType: 'string',
    headerRegexes: [/target\s*project/i, /new\s*project/i, /stla.*p1h.*o1h/i],
    importance: 'medium'
  },
  {
    id: 'target_line',
    canonicalName: 'Target Line',
    synonyms: ['target line', 'new line', 'to line'],
    description: 'Target assembly line for equipment allocation',
    expectedType: 'string',
    headerRegexes: [/^new\s*line$/i, /target\s*line/i, /to\s*line/i],
    importance: 'high'
  },
  {
    id: 'target_station',
    canonicalName: 'Target Station',
    synonyms: ['target station', 'new station', 'to station'],
    description: 'Target station for equipment allocation',
    expectedType: 'string',
    headerRegexes: [/^new\s*station$/i, /target\s*station/i, /to\s*station/i],
    importance: 'high'
  },
  {
    id: 'target_sector',
    canonicalName: 'Target Sector',
    synonyms: ['target sector', 'new sector', 'to sector'],
    description: 'Target sector for equipment allocation',
    expectedType: 'string',
    headerRegexes: [/target\s*sector/i, /new\s*sector/i, /to\s*sector/i],
    importance: 'low'
  }
]
