import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';

export interface CalendarVisibleRange {
  startDate: string;
  endDate: string;
}

export const getVisibleMonthRange = (month: Date): CalendarVisibleRange => {
  const activeMonth = startOfMonth(month);

  return {
    startDate: startOfWeek(activeMonth).toISOString(),
    endDate: endOfWeek(endOfMonth(activeMonth)).toISOString(),
  };
};
