/**
 * Activities Feature Route Components
 * Exports route-level components for the activities feature
 */

import { lazy } from 'react';

export const ActivitiesDashboard = lazy(() => import('./pages/ActivitiesDashboardPage').then(m => ({ default: m.ActivitiesDashboardPage })));
