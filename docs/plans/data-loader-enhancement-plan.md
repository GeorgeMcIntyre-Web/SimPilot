# Data Loader Tab Enhancement Plan

## Overview

This document outlines the step-by-step plan to revamp the Data Loader tab. Each step is designed to be reviewed independently before proceeding to the next.

---

## Current State Analysis

The Data Loader tab currently consists of:
- **5 tabs**: Local Files, Microsoft 365, SimBridge, Import History, Data Health
- **DemoScenarioSection**: Quick start with demo data loading and data persistence (export/import snapshots)
- **File upload**: 4 separate FileDropzone components for different file types
- **Results display**: IngestionResults component shown after successful import
- **Version comparison modal**: For previewing changes before applying

### Current Pain Points
1. The UI is functional but cluttered with multiple concerns on one page
2. Demo scenario and data persistence are bundled together at the top
3. File dropzones take significant vertical space even when not all are needed
4. No clear visual hierarchy or guided workflow
5. Tab navigation could be more intuitive

---

## Enhancement Steps

### Step 1: Create a New Branch and Reorganize Page Layout Structure

**Objective**: Create a cleaner, more organized page layout with clear visual sections.

**Changes**:
- Create a new feature branch `feature/data-loader-revamp`
- Split the page into distinct visual sections:
  1. **Header Section**: Page title and subtitle
  2. **Quick Actions Bar**: Compact row with Demo Load, Clear Data, Export/Import buttons
  3. **Main Content Area**: Tabbed interface for data sources
  4. **Results Section**: Displayed conditionally after ingestion

**Files to modify**:
- `src/app/routes/DataLoaderPage.tsx`
- `src/app/components/dataLoader/sections/DemoScenarioSection.tsx`

---

### Step 2: Create a Compact QuickActionsBar Component

**Objective**: Replace the large DemoScenarioSection with a compact, horizontal action bar.

**Changes**:
- Create new `QuickActionsBar.tsx` component
- Horizontal layout with:
  - Demo scenario dropdown + Load button (grouped)
  - Divider
  - Clear Data button
  - Divider
  - Export/Import Snapshot buttons (grouped)
- More compact design that doesn't dominate the page

**Files to create**:
- `src/app/components/dataLoader/sections/QuickActionsBar.tsx`

**Files to modify**:
- `src/app/routes/DataLoaderPage.tsx` (use new component)

---

### Step 3: Redesign the LocalFilesTab with Collapsible File Sections

**Objective**: Make the Local Files tab more compact and user-friendly.

**Changes**:
- Replace 4 separate full-height dropzones with a collapsible accordion-style layout
- Each file category is a collapsible section showing:
  - Label + file count badge
  - Expand to show dropzone and selected files
- Add "Clear" button for each file category to remove selected files
- Visual indicators for which sections have files selected

**Files to modify**:
- `src/app/components/dataLoader/tabs/LocalFilesTab.tsx`
- `src/app/components/dataLoader/FileDropzone.tsx` (make more compact)

---

### Step 4: Add File Type Auto-Detection Indicator

**Objective**: Provide visual feedback about detected file types.

**Changes**:
- When files are added, show detected file type badges (e.g., "Simulation Status", "Robot List")
- Add a small info section explaining what each file type contains
- Show validation status for each file (valid Excel, correct format, etc.)

**Files to modify**:
- `src/app/components/dataLoader/tabs/LocalFilesTab.tsx`
- `src/app/components/dataLoader/FileDropzone.tsx`

---

### Step 5: Enhance the Ingestion Results Display

**Objective**: Make the results more informative and actionable.

**Changes**:
- Add a summary card at the top with key metrics
- Reorganize the grid layout for better readability
- Add expandable details for warnings
- Add quick navigation links to relevant pages (Dashboard, specific areas, etc.)
- Improve the linking statistics visualization

**Files to modify**:
- `src/app/components/dataLoader/sections/IngestionResults.tsx`

---

### Step 6: Improve Tab Navigation with Icons and Badges

**Objective**: Make tab navigation more intuitive with visual cues.

**Changes**:
- Add icons to each tab:
  - Local Files: `FolderOpen` icon
  - Microsoft 365: `Cloud` icon
  - SimBridge: `Link` icon
  - Import History: `History` icon
  - Data Health: `Activity` icon
- Add badges showing:
  - Number of files selected (Local Files, M365)
  - Number of history entries (Import History)
  - Error count (Data Health)
- Improve active/inactive tab styling

**Files to modify**:
- `src/app/routes/DataLoaderPage.tsx`

---

### Step 7: Add a Guided Workflow Mode (Optional First-Time Experience)

**Objective**: Help new users understand the data loading process.

**Changes**:
- Add a "Getting Started" panel for users with no data
- Step-by-step guided flow:
  1. Select data source
  2. Upload/select files
  3. Review & confirm
  4. View results
- Can be dismissed/hidden for experienced users
- Store preference in localStorage

**Files to create**:
- `src/app/components/dataLoader/GuidedWorkflow.tsx`

**Files to modify**:
- `src/app/routes/DataLoaderPage.tsx`

---

### Step 8: Improve Error Handling and User Feedback

**Objective**: Provide clearer error messages and recovery options.

**Changes**:
- Add toast notifications for success/error states
- Improve inline error display with actionable suggestions
- Add retry functionality for failed operations
- Better loading states with progress indication

**Files to modify**:
- `src/app/routes/DataLoaderPage.tsx`
- `src/app/hooks/useLocalFileIngest.ts`
- `src/app/components/dataLoader/tabs/LocalFilesTab.tsx`

---

### Step 9: Add Drag-and-Drop Multi-File Support

**Objective**: Allow users to drag multiple files at once with smart categorization.

**Changes**:
- Create a unified drop zone that accepts all file types
- Auto-categorize files based on filename patterns and content
- Show categorization preview before confirming
- Allow manual re-categorization if auto-detection is wrong

**Files to create**:
- `src/app/components/dataLoader/UnifiedDropZone.tsx`

**Files to modify**:
- `src/app/components/dataLoader/tabs/LocalFilesTab.tsx`

---

### Step 10: Final Polish and Testing

**Objective**: Ensure all changes work together smoothly.

**Changes**:
- Review all component interactions
- Test dark mode compatibility
- Ensure responsive design works on all screen sizes
- Update any tests that may have broken
- Clean up any unused code

**Files to review**:
- All modified files
- Test files in `src/app/components/dataLoader/__tests__/`

---

## Implementation Order

The steps are designed to be implemented sequentially, with each step building on the previous:

| Step | Priority | Dependencies |
|------|----------|--------------|
| 1    | High     | None         |
| 2    | High     | Step 1       |
| 3    | High     | Step 1       |
| 4    | Medium   | Step 3       |
| 5    | Medium   | Step 1       |
| 6    | Medium   | Step 1       |
| 7    | Low      | Steps 1-6    |
| 8    | Medium   | Step 1       |
| 9    | Low      | Steps 3, 4   |
| 10   | High     | All steps    |

---

## Review Checkpoints

After each step:
1. Verify the changes render correctly
2. Test both light and dark modes
3. Verify no regressions in existing functionality
4. Check console for any errors or warnings
5. Get user approval before proceeding to next step

---

## Notes

- Each step should be committed separately for easy rollback if needed
- Steps 7 and 9 are marked as optional/low priority - can be skipped if time is limited
- Focus on maintaining existing functionality while improving UX
