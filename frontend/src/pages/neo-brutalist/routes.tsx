/**
 * Neo-Brutalist Demo Routes
 * Add these routes to App.tsx to view the new UI
 * 
 * USAGE:
 * Import this file and add <NeoBrutalistRoutes /> to your router
 * 
 * Example routes:
 * - /demo/dashboard
 * - /demo/linking
 * - /demo/operations
 * - /demo/outreach
 * - /demo/people
 */

import { Routes, Route } from 'react-router-dom';
import {
    NeoBrutalistDashboard,
    LinkingModule,
    OperationsBoard,
    OutreachCenter,
    PeopleDirectory,
} from './index';

export default function NeoBrutalistRoutes() {
    return (
        <Routes>
            <Route path="/demo/dashboard" element={<NeoBrutalistDashboard />} />
            <Route path="/demo/linking" element={<LinkingModule />} />
            <Route path="/demo/operations" element={<OperationsBoard />} />
            <Route path="/demo/outreach" element={<OutreachCenter />} />
            <Route path="/demo/people" element={<PeopleDirectory />} />
        </Routes>
    );
}
