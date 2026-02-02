# Dashboard Customization Feature

## Overview

This document describes the customizable dashboard feature implementation with drag-and-drop widgets. The feature allows users to personalize their dashboard by adding, removing, rearranging, and resizing widgets.

## Implementation Status

### ✅ Completed Components

1. **Type Definitions** ([frontend/src/types/dashboard.ts](../frontend/src/types/dashboard.ts))
   - WidgetType enum with 10 widget types
   - DashboardConfig interface
   - DashboardWidget interface
   - WidgetLayout interface
   - WIDGET_TEMPLATES array with default configurations
   - DEFAULT_DASHBOARD_CONFIG with default layout

2. **Redux State Management** ([frontend/src/store/slices/dashboardSlice.ts](../frontend/src/store/slices/dashboardSlice.ts))
   - Dashboard state management
   - Async thunks for CRUD operations
   - Layout update actions
   - Widget management actions

3. **Widget Components** ([frontend/src/components/dashboard/](../frontend/src/components/dashboard/))
   - WidgetContainer: Base wrapper component
   - QuickActionsWidget: Shortcuts to common tasks
   - DonationSummaryWidget: Donation metrics overview
   - RecentDonationsWidget: List of recent donations
   - DonationTrendsWidget: Chart placeholder for trends
   - VolunteerHoursWidget: Volunteer metrics
   - EventAttendanceWidget: Event statistics
   - CaseSummaryWidget: Case management overview
   - ActivityFeedWidget: Recent activity feed

4. **Main Dashboard Page** ([frontend/src/pages/CustomDashboard.tsx](../frontend/src/pages/CustomDashboard.tsx))
   - Drag-and-drop grid layout
   - Edit/view mode toggle
   - Add widget modal
   - Save/cancel layout changes
   - Reset to default functionality

### ⚠️ Pending Tasks

1. **Fix TypeScript Compilation Issues**
   - react-grid-layout type compatibility with WidgetLayout
   - Layout prop configuration for GridLayout component
   - Recommended solution: Use ResponsiveReactGridLayout or cast types appropriately

2. **Backend API Implementation**
   - Create dashboard configuration endpoints:
     ```
     GET    /api/dashboard/configs         # List user's dashboards
     GET    /api/dashboard/configs/:id     # Get specific dashboard
     POST   /api/dashboard/configs         # Create new dashboard
     PUT    /api/dashboard/configs/:id     # Update dashboard
     DELETE /api/dashboard/configs/:id     # Delete dashboard
     PUT    /api/dashboard/configs/:id/layout  # Save layout changes
     ```

3. **Database Schema**
   ```sql
   CREATE TABLE dashboard_configs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name VARCHAR(255) NOT NULL,
     is_default BOOLEAN DEFAULT false,
     widgets JSONB NOT NULL,
     layout JSONB NOT NULL,
     breakpoints JSONB,
     cols JSONB,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT unique_user_default UNIQUE (user_id, is_default) WHERE is_default = true
   );

   CREATE INDEX idx_dashboard_configs_user_id ON dashboard_configs(user_id);
   ```

4. **Widget Data Integration**
   - Connect widgets to real API endpoints
   - Implement error handling and loading states
   - Add data refresh mechanisms
   - Implement caching for widget data

5. **Testing**
   - Unit tests for widget components
   - Integration tests for dashboard state management
   - End-to-end tests for drag-and-drop functionality

## Architecture

### State Flow

```
User Action → Component → Redux Action → Async Thunk → API Call
                ↓                                          ↓
          Local State Update ←← Redux Reducer ←← API Response
```

### Widget System

Each widget follows a consistent pattern:
1. Receives standard props (widget, editMode, onRemove)
2. Fetches its own data using React hooks
3. Renders using WidgetContainer wrapper
4. Handles loading and error states

### Layout System

- Grid system: 12 columns
- Row height: 80px
- Widgets defined with position (x, y) and size (w, h)
- Responsive breakpoints for different screen sizes

## Usage Guide

### For Developers

1. **Adding a New Widget Type**:
   ```typescript
   // 1. Add type to WidgetType union in types/dashboard.ts
   export type WidgetType =
     | 'existing_types'
     | 'new_widget_type';

   // 2. Add template to WIDGET_TEMPLATES array
   {
     type: 'new_widget_type',
     title: 'New Widget',
     description: 'Widget description',
     icon: '📊',
     defaultSize: 'medium',
     defaultLayout: { x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
     category: 'analytics',
   }

   // 3. Create widget component in components/dashboard/
   // 4. Add case to renderWidget() in CustomDashboard.tsx
   ```

2. **Widget Component Structure**:
   ```typescript
   import { useEffect, useState } from 'react';
   import WidgetContainer from './WidgetContainer';
   import type { DashboardWidget } from '../../types/dashboard';
   import api from '../../services/api';

   interface Props {
     widget: DashboardWidget;
     editMode: boolean;
     onRemove: () => void;
   }

   const MyWidget = ({ widget, editMode, onRemove }: Props) => {
     const [data, setData] = useState(null);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);

     useEffect(() => {
       fetchData();
     }, []);

     const fetchData = async () => {
       try {
         setLoading(true);
         const response = await api.get('/my-endpoint');
         setData(response.data);
       } catch (err) {
         setError('Failed to load data');
       } finally {
         setLoading(false);
       }
     };

     return (
       <WidgetContainer
         widget={widget}
         editMode={editMode}
         onRemove={onRemove}
         loading={loading}
         error={error}
       >
         {data && <div>{/* Your widget content */}</div>}
       </WidgetContainer>
     );
   };

   export default MyWidget;
   ```

### For Users

1. **Customizing Dashboard**:
   - Click "Customize Dashboard" button
   - Drag widgets to rearrange
   - Resize widgets by dragging corners
   - Click "Add Widget" to add new widgets
   - Click "Save Layout" to persist changes

2. **Managing Widgets**:
   - Remove widgets by clicking the X icon (edit mode only)
   - Reset to default layout using "Reset to Default" button
   - Changes are saved per user

## Dependencies

- **react-grid-layout**: Drag-and-drop grid layout library
- **@reduxjs/toolkit**: State management
- **react-router-dom**: Navigation for quick actions

## Performance Considerations

1. **Lazy Loading**: Widgets should lazy load their data
2. **Caching**: Implement caching for frequently accessed data
3. **Debouncing**: Debounce layout change events during drag operations
4. **Virtualization**: Consider virtualization for widgets with long lists

## Accessibility

- Keyboard navigation for widget management
- ARIA labels for drag-and-drop operations
- Screen reader announcements for layout changes
- Focus management during modal interactions

## Future Enhancements

1. **Multiple Dashboards**: Allow users to create multiple dashboard configurations
2. **Dashboard Sharing**: Share dashboard layouts with team members
3. **Widget Settings**: Allow per-widget configuration options
4. **Export/Import**: Export and import dashboard configurations
5. **Responsive Layouts**: Different layouts for mobile/tablet/desktop
6. **Widget Marketplace**: Library of additional widget types
7. **Real-time Updates**: WebSocket integration for live data updates
8. **Dark Mode**: Theme support for widgets

## Troubleshooting

### Common Issues

1. **Widgets Not Updating**: Check Redux DevTools for state changes
2. **Layout Not Saving**: Verify API endpoints are implemented
3. **Drag Not Working**: Ensure editMode is true and draggableHandle is set
4. **Type Errors**: Check TypeScript version compatibility with react-grid-layout

## Resources

- [react-grid-layout Documentation](https://github.com/react-grid-layout/react-grid-layout)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Dashboard Design Best Practices](https://www.nngroup.com/articles/dashboard-design/)
