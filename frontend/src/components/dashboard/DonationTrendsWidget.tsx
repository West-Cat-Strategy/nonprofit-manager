/**
 * Donation Trends Widget
 * Chart showing donation trends
 */

import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';

interface DonationTrendsWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

const DonationTrendsWidget = ({ widget, editMode, onRemove }: DonationTrendsWidgetProps) => {
  return (
    <WidgetContainer widget={widget} editMode={editMode} onRemove={onRemove}>
      <div className="flex items-center justify-center h-full text-app-text-subtle">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="text-sm">Chart will be displayed here</p>
          <p className="text-xs mt-1">Integrate with charting library</p>
        </div>
      </div>
    </WidgetContainer>
  );
};

export default DonationTrendsWidget;
