/**
 * Event Attendance Widget
 * Overview of events and attendance
 */

import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';

interface EventAttendanceWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

const EventAttendanceWidget = ({ widget, editMode, onRemove }: EventAttendanceWidgetProps) => {
  return (
    <WidgetContainer widget={widget} editMode={editMode} onRemove={onRemove}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500">Upcoming Events</p>
          <p className="text-3xl font-bold text-gray-900">12</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Total This Month</p>
            <p className="text-xl font-semibold text-gray-900">24</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg. Attendance</p>
            <p className="text-xl font-semibold text-gray-900">45</p>
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
};

export default EventAttendanceWidget;
