/**
 * File type detection utilities for the Data Loader.
 * These patterns match the detection logic in ingestionCoordinator.ts
 */

export type DetectedFileType =
  | 'SimulationStatus'
  | 'RobotList'
  | 'ToolList'
  | 'AssembliesList'
  | 'Unknown';

export interface FileTypeInfo {
  type: DetectedFileType;
  confidence: 'high' | 'medium' | 'low';
  suggestedCategory: 'simulation' | 'equipment' | 'toollist' | 'assemblies' | null;
  description: string;
}

/**
 * Detect file type based on filename patterns.
 * Mirrors the logic in ingestionCoordinator.ts detectFileKind()
 */
export function detectFileType(fileName: string): FileTypeInfo {
  const name = fileName.toLowerCase();

  // Simulation Status files
  if (name.includes('simulation') && name.includes('status')) {
    return {
      type: 'SimulationStatus',
      confidence: 'high',
      suggestedCategory: 'simulation',
      description: 'Simulation status file with station progress data'
    };
  }

  // Assemblies List files
  if (name.includes('assemblies') && name.includes('list')) {
    return {
      type: 'AssembliesList',
      confidence: 'high',
      suggestedCategory: 'assemblies',
      description: 'Assembly configurations and tool assignments'
    };
  }

  // Robot List files - multiple patterns
  if (name.includes('robot') && name.includes('list')) {
    return {
      type: 'RobotList',
      confidence: 'high',
      suggestedCategory: 'equipment',
      description: 'Robot equipment inventory and specifications'
    };
  }

  if (name.startsWith('robotlist') || name.includes('robotlist_')) {
    return {
      type: 'RobotList',
      confidence: 'high',
      suggestedCategory: 'equipment',
      description: 'Robot equipment inventory and specifications'
    };
  }

  // Tool List files
  if (name.includes('tool') && name.includes('list')) {
    return {
      type: 'ToolList',
      confidence: 'high',
      suggestedCategory: 'toollist',
      description: 'Tool inventory and specifications'
    };
  }

  if (name.includes('toollist')) {
    return {
      type: 'ToolList',
      confidence: 'high',
      suggestedCategory: 'toollist',
      description: 'Tool inventory and specifications'
    };
  }

  // Medium confidence patterns - partial matches
  if (name.includes('simulation') || name.includes('status')) {
    return {
      type: 'SimulationStatus',
      confidence: 'medium',
      suggestedCategory: 'simulation',
      description: 'Possibly simulation status file'
    };
  }

  if (name.includes('robot') || name.includes('equipment')) {
    return {
      type: 'RobotList',
      confidence: 'medium',
      suggestedCategory: 'equipment',
      description: 'Possibly robot equipment file'
    };
  }

  if (name.includes('tool')) {
    return {
      type: 'ToolList',
      confidence: 'medium',
      suggestedCategory: 'toollist',
      description: 'Possibly tool list file'
    };
  }

  if (name.includes('assembl')) {
    return {
      type: 'AssembliesList',
      confidence: 'medium',
      suggestedCategory: 'assemblies',
      description: 'Possibly assemblies list file'
    };
  }

  // Unknown file type
  return {
    type: 'Unknown',
    confidence: 'low',
    suggestedCategory: null,
    description: 'File type could not be determined from filename'
  };
}

/**
 * Get a color scheme for the detected file type
 */
export function getFileTypeColor(type: DetectedFileType): {
  bg: string;
  text: string;
  border: string;
} {
  switch (type) {
    case 'SimulationStatus':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/40',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-700'
      };
    case 'RobotList':
      return {
        bg: 'bg-purple-100 dark:bg-purple-900/40',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-300 dark:border-purple-700'
      };
    case 'ToolList':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/40',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-300 dark:border-amber-700'
      };
    case 'AssembliesList':
      return {
        bg: 'bg-teal-100 dark:bg-teal-900/40',
        text: 'text-teal-700 dark:text-teal-300',
        border: 'border-teal-300 dark:border-teal-700'
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-300 dark:border-gray-600'
      };
  }
}

/**
 * Get a short label for the file type
 */
export function getFileTypeLabel(type: DetectedFileType): string {
  switch (type) {
    case 'SimulationStatus':
      return 'Sim Status';
    case 'RobotList':
      return 'Robot List';
    case 'ToolList':
      return 'Tool List';
    case 'AssembliesList':
      return 'Assemblies';
    default:
      return 'Unknown';
  }
}

/**
 * Check if a file has a valid Excel extension
 */
export function isValidExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xlsm') || lower.endsWith('.xls');
}
