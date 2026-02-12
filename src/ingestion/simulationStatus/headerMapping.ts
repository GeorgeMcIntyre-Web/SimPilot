// Column name aliases for flexible matching
export const COLUMN_ALIASES: Record<string, string[]> = {
  AREA_CODE: ['AREA', 'AREA CODE', 'ZONE', 'SHORT NAME'],
  AREA_NAME: ['AREA NAME', 'AREA DESCRIPTION', 'FULL NAME'],
  'ASSEMBLY LINE': ['ASSEMBLY LINE', 'LINE', 'LINE CODE'],
  STATION: ['STATION NO. NEW', 'STATION', 'STATION CODE', 'STATION KEY', 'STATION NO.'],
  ROBOT: ['ROBOT', 'ROBOT CAPTION', 'ROBOT NAME'],
  APPLICATION: ['APPLICATION', 'APP'],
  'PERSONS RESPONSIBLE': [
    'PERSONS RESPONSIBLE',
    'PERSON RESPONSIBLE',
    'PERS. RESPONSIBLE',
    'PERS RESPONSIBLE',
    'ENGINEER',
    'RESPONSIBLE',
  ],
}

// Required headers for finding the header row
// AREA and ASSEMBLY LINE are optional - can be derived or missing
export const REQUIRED_HEADERS = ['STATION', 'ROBOT']
