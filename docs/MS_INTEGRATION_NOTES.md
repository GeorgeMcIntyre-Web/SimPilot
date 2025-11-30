# Microsoft Integration Notes

## Architecture Overview

SimPilot's architecture maintains clear separation between authentication/storage and domain logic:

```
┌─────────────────────────────────────────────────────────────┐
│                    Outer Gate                                │
│              Cloudflare Access (Enterprise SSO)              │
│         Controls access to the entire application            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  UI Layer (Agent 2)                          │
│                 src/app/**, src/ui/**                        │
│                                                              │
│  Optional Features (UI only):                                │
│  - Microsoft login via MSAL (Sign in with Microsoft)        │
│  - SharePoint/OneDrive file picker via Microsoft Graph      │
│  - User profile display                                     │
│                                                              │
│  Dependencies: @azure/msal-browser, @microsoft/mgt-*        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (File objects)
┌─────────────────────────────────────────────────────────────┐
│            Domain/Ingestion Layer (Agent 1)                  │
│            src/domain/**, src/ingestion/**                   │
│                                                              │
│  Storage-agnostic ingestion API:                             │
│  - ingestFiles(input: IngestFilesInput)                     │
│  - Accepts File objects from ANY source                      │
│  - No MSAL, Graph, or cloud provider dependencies           │
│  - No authentication logic                                   │
│                                                              │
│  Dependencies: xlsx (SheetJS), react (hooks only)           │
└─────────────────────────────────────────────────────────────┘
```

## Separation of Responsibilities

### Outer Gate: Cloudflare Access
- **Purpose**: Enterprise-grade access control for the entire application
- **Scope**: All routes, all users
- **Configuration**: Managed in Cloudflare dashboard
- **Authentication**: Handled by Cloudflare before requests reach the app

### UI Layer: Optional Microsoft Integration
- **Location**: `src/app/**`, `src/ui/**` (owned by Agent 2)
- **Purpose**: Optional convenience features for Microsoft 365 users
- **Features**:
  - "Sign in with Microsoft" button for user profile/preferences
  - SharePoint/OneDrive file picker for easy file selection
  - Display user's Microsoft profile information
- **Dependencies**:
  - `@azure/msal-browser` - Microsoft Authentication Library
  - `@microsoft/mgt-*` - Microsoft Graph Toolkit (optional)
  - Microsoft Graph API calls
- **Important**: These features are **optional**. The app works perfectly without them using local file uploads.

### Domain/Ingestion Layer: Storage-Agnostic
- **Location**: `src/domain/**`, `src/ingestion/**` (owned by Agent 1)
- **Purpose**: Parse Excel files and manage domain entities
- **API**: `ingestFiles(input: IngestFilesInput): Promise<IngestFilesResult>`
- **Constraints**:
  - ❌ **MUST NOT** import MSAL, Microsoft Graph, or any cloud provider SDKs
  - ❌ **MUST NOT** contain authentication or authorization logic
  - ❌ **MUST NOT** make HTTP requests to cloud storage APIs
  - ✅ **MUST** accept File objects from any source
  - ✅ **MUST** work identically regardless of File origin
- **Dependencies**: Only `xlsx` (SheetJS) for Excel parsing

## File Object Sources

The domain/ingestion layer accepts standard JavaScript `File` objects, which can be created from:

### 1. Local File Upload (Native)
```typescript
// Traditional file input
<input type="file" onChange={handleFileChange} />

const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || [])
  const result = await ingestFiles({
    simulationFiles: files,
    equipmentFiles: []
  })
}
```

### 2. HTTP Download (fetch, axios, etc.)
```typescript
// Download from any HTTP endpoint
const blob = await fetch('https://example.com/data.xlsx')
  .then(r => r.blob())

const file = new File([blob], 'Simulation_Status.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
})

await ingestFiles({ simulationFiles: [file], equipmentFiles: [] })
```

### 3. Microsoft Graph (SharePoint/OneDrive)
```typescript
// Download from Microsoft Graph API
// NOTE: This code belongs in the UI layer (Agent 2), NOT the domain layer

// Get file content from SharePoint
const graphClient = getGraphClient() // from MSAL/Graph SDK
const blob = await graphClient
  .api(`/sites/{siteId}/drive/items/{itemId}/content`)
  .get()

// Create File from downloaded blob
const file = new File([blob], fileName, {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
})

// Pass to domain layer (same API as local upload!)
await ingestFiles({
  simulationFiles: [file],
  equipmentFiles: [],
  fileSources: { [fileName]: 'remote' } // Optional metadata
})
```

### 4. Other Cloud Providers
The same pattern works for AWS S3, Google Drive, Azure Blob Storage, etc.:

```typescript
// Download from any cloud provider
const blob = await cloudProvider.downloadFile(fileId)
const file = new File([blob], fileName)
await ingestFiles({ simulationFiles: [file], equipmentFiles: [] })
```

## Critical Rules

### For Agent 1 (Domain/Ingestion Layer):

1. **Never import cloud provider SDKs**:
   ```typescript
   // ❌ NEVER DO THIS in src/domain/** or src/ingestion/**
   import { PublicClientApplication } from '@azure/msal-browser'
   import { Client } from '@microsoft/microsoft-graph-client'
   ```

2. **Never add authentication logic**:
   ```typescript
   // ❌ NEVER DO THIS
   async function ingestFiles(input: IngestFilesInput) {
     const token = await getMsalToken() // NO!
     // ...
   }
   ```

3. **Never make HTTP requests to cloud APIs**:
   ```typescript
   // ❌ NEVER DO THIS
   async function downloadFromSharePoint(url: string) {
     const response = await fetch(`https://graph.microsoft.com/...`) // NO!
     // ...
   }
   ```

4. **Always accept File objects as-is**:
   ```typescript
   // ✅ CORRECT - Accept File, don't care where it came from
   export async function ingestFiles(
     input: IngestFilesInput
   ): Promise<IngestFilesResult> {
     // File objects work the same regardless of source
     for (const file of input.simulationFiles) {
       const workbook = await readWorkbook(file)
       // ...
     }
   }
   ```

### For Agent 2 (UI Layer):

1. **All cloud integration stays in UI layer**:
   - MSAL configuration and login flow
   - Microsoft Graph API calls
   - File picker UI components
   - User profile display

2. **Convert cloud files to File objects before calling domain layer**:
   ```typescript
   // ✅ CORRECT pattern
   const blob = await downloadFromSharePoint(fileUrl) // UI layer
   const file = new File([blob], fileName)          // UI layer
   await ingestFiles({ simulationFiles: [file] })   // Domain layer
   ```

3. **Use fileSources metadata for diagnostics** (optional):
   ```typescript
   await ingestFiles({
     simulationFiles: [localFile, remoteFile],
     equipmentFiles: [],
     fileSources: {
       'local-data.xlsx': 'local',
       'sharepoint-data.xlsx': 'remote'
     }
   })
   ```

## Testing Philosophy

The domain layer must prove it works with Files from any source:

### 1. File-from-Blob Tests
```typescript
// Simulate cloud download scenario
const blob = await createExcelBlob()
const file = new File([blob], 'data.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
})

const result = await ingestFiles({ simulationFiles: [file] })
expect(result.projectsCount).toBeGreaterThan(0)
```

### 2. Corrupted File Tests
```typescript
// Prove graceful handling of bad downloads
const corruptedBlob = createInvalidBlob()
const file = new File([corruptedBlob], 'bad.xlsx')

await expect(ingestFiles({ simulationFiles: [file] }))
  .rejects.toThrow(/Failed to parse/)
```

## Benefits of This Architecture

1. **No vendor lock-in**: Domain logic is independent of any cloud provider
2. **Easier testing**: Domain layer doesn't need mocked authentication
3. **Flexibility**: UI can switch cloud providers without touching domain code
4. **Security**: Authentication concerns isolated to UI layer
5. **Simplicity**: Domain layer focuses on one job: parsing Excel files

## Future Extensibility

Want to add Google Drive integration? Box? Dropbox?

**UI Layer Changes**:
- Add new SDK dependency
- Add new file picker component
- Download blob from new provider
- Create File object from blob

**Domain Layer Changes**:
- **NONE** ✅

The domain layer continues to work with the same `ingestFiles` API because it only cares about File objects, not where they came from.

## Summary

- **Cloudflare Access**: Outer gate protecting the entire app
- **MSAL/Graph (UI layer)**: Optional Microsoft convenience features
- **Domain/Ingestion layer**: Storage-agnostic Excel parser
- **Boundary**: File objects are the clean interface between layers
- **Rule**: Never mix authentication logic with domain logic

This separation ensures SimPilot remains maintainable, testable, and cloud-provider agnostic while still offering seamless Microsoft 365 integration for users who want it.
