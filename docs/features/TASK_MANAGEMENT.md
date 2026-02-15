# Advanced Task Management

The Task Management module provides sophisticated tools for planning, tracking, and executing complex projects within your nonprofit organization.

## Key Features

### Gantt Charts
- **Visual Timeline**: View tasks across a chronological timeline to identify overlaps and bottlenecks.
- **Drag-and-Drop**: Easily adjust task start dates and durations directly on the chart.
- **Filtering**: View Gantt charts by project, team, or individual assignee.

### Task Dependencies
- **Relationship Mapping**: Define `Finish-to-Start` and `Start-to-Start` relationships between tasks.
- **Automatic Rescheduling**: Adjusting a parent task's date automatically shifts dependent tasks (optional setting).
- **Conflict Detection**: Real-time alerts if dependencies create circular loops or impossible timelines.

### Subtasks
- **Hierarchical Breakdown**: Break down large tasks into smaller, manageable subtasks.
- **Progress Aggregation**: Parent task progress is automatically calculated based on subtask completion status.
- **Inheritance**: Subtasks can inherit project and organization tags from their parent.

## How to Use

### Managing Dependencies
1. Open a **Task Detail** view.
2. Navigate to the **Dependencies** tab.
3. Click **Add Dependency** and select the related task and relationship type.
4. View the results on the **Gantt Chart** view.

### Creating Subtasks
1. From any **Task Board** or **List**, click the **+ (Plus)** icon on an existing task.
2. Or, open a task and use the **Subtasks** section to add new ones.

## Technical Implementation

- **Backend Logic**: `backend/src/services/taskService.ts` manages the recursive logic for subtasks and dependency validation.
- **Frontend Components**:
    - `GanttChart`: Located in `frontend/src/components/GanttChart.tsx` (Integrated via standard task pages).
    - `TaskBoard`: Enhanced with subtask visual indicators.
- **Database Schema**: Optimized with parent-child relationships and dependency mapping tables.
