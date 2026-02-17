# Report Generator Guide

The Nonprofit Manager includes a powerful Reporting Engine that allows users to generate, save, and export detailed reports across various entities.

## Features

- **Entity Support**: Generate reports for Volunteers, Donations, Events, Cases, and Tasks.
- **Advanced Aggregations**: Support for `SUM`, `AVG`, `MIN`, `MAX`, and `COUNT` on numeric fields.
- **Grouping**: Group results by specific fields (e.g., group donations by donor or month).
- **Filtering**: Flexible filtering logic including date ranges, status, and custom attributes.
- **Export Formats**:
    - **CSV**: Standard comma-separated values.
    - **Excel**: Formatted spreadsheets with multiple tabs if needed.
    - **PDF**: Professional, print-ready documents with branding.
- **Visualizations**: Integrated Recharts for bar, line, and pie charts within the Report Builder.

## Usage

### Building a Report
1. Navigate to **Reports** > **New Report**.
2. Select the **Primary Entity** (e.g., Donations).
3. Choose the **Columns** you want to include.
4. (Optional) Set **Aggregations** and **Grouping**.
5. Define **Filter Criteria**.
6. Click **Run Report** to preview the results.

### Saving and Exporting
- Use the **Save** button to store the report configuration for future use.
- Use the **Export** dropdown to download the report in your preferred format.

## Technical Details

### Backend Architecture
- **Service**: `backend/src/services/reportService.ts` handles the SQL generation and execution.
- **Export Engine**: `backend/src/services/exportService.ts` manages the conversion to different file formats.
- **Security**: Reports are scoped to the user's organization and respect Role-Based Access Control (RBAC).

### Frontend Components
- **ReportBuilder**: `frontend/src/pages/builder/ReportBuilder.tsx` provides the drag-and-drop interface.
- **DataGrid**: Optimized for rendering large datasets with sorting and pagination.
