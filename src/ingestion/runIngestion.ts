export interface IngestionWarning {
    id: string;
    fileName: string;
    message: string;
}

export interface IngestFilesInput {
    simulationFiles: File[];
    equipmentFiles: File[];
}

export interface IngestFilesResult {
    projectsCount: number;
    areasCount: number;
    cellsCount: number;
    robotsCount: number;
    toolsCount: number;
    warnings: IngestionWarning[];
}

export async function ingestFiles(input: IngestFilesInput): Promise<IngestFilesResult> {
    console.log('Ingesting files:', input);
    // TODO(Agent1): Implement real ingestion logic

    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
        projectsCount: 2,
        areasCount: 5,
        cellsCount: 12,
        robotsCount: 45,
        toolsCount: 120,
        warnings: [
            { id: '1', fileName: 'status.xlsx', message: 'Row 45: Missing cell name' }
        ]
    };
}
