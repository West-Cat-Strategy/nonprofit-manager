"use strict";
/**
 * Report Types
 * Type definitions for custom report generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVAILABLE_FIELDS = void 0;
// Available fields for each entity type
exports.AVAILABLE_FIELDS = {
    accounts: [
        { field: 'id', label: 'Account ID', type: 'string' },
        { field: 'account_name', label: 'Account Name', type: 'string' },
        { field: 'account_type', label: 'Type', type: 'string' },
        { field: 'category', label: 'Category', type: 'string' },
        { field: 'website', label: 'Website', type: 'string' },
        { field: 'phone', label: 'Phone', type: 'string' },
        { field: 'email', label: 'Email', type: 'string' },
        { field: 'is_active', label: 'Active', type: 'boolean' },
        { field: 'created_at', label: 'Created Date', type: 'date' },
        { field: 'updated_at', label: 'Updated Date', type: 'date' },
    ],
    contacts: [
        { field: 'id', label: 'Contact ID', type: 'string' },
        { field: 'first_name', label: 'First Name', type: 'string' },
        { field: 'last_name', label: 'Last Name', type: 'string' },
        { field: 'email', label: 'Email', type: 'string' },
        { field: 'phone', label: 'Phone', type: 'string' },
        { field: 'mobile_phone', label: 'Mobile Phone', type: 'string' },
        { field: 'job_title', label: 'Job Title', type: 'string' },
        { field: 'department', label: 'Department', type: 'string' },
        { field: 'preferred_contact_method', label: 'Preferred Contact Method', type: 'string' },
        { field: 'account_name', label: 'Account', type: 'string' },
        { field: 'is_active', label: 'Active', type: 'boolean' },
        { field: 'created_at', label: 'Created Date', type: 'date' },
        { field: 'updated_at', label: 'Updated Date', type: 'date' },
    ],
    donations: [
        { field: 'id', label: 'Donation ID', type: 'string' },
        { field: 'donation_number', label: 'Donation Number', type: 'string' },
        { field: 'amount', label: 'Amount', type: 'currency' },
        { field: 'payment_method', label: 'Payment Method', type: 'string' },
        { field: 'payment_status', label: 'Payment Status', type: 'string' },
        { field: 'campaign_name', label: 'Campaign', type: 'string' },
        { field: 'designation', label: 'Designation', type: 'string' },
        { field: 'is_recurring', label: 'Recurring', type: 'boolean' },
        { field: 'donation_date', label: 'Donation Date', type: 'date' },
        { field: 'created_at', label: 'Created Date', type: 'date' },
    ],
    events: [
        { field: 'id', label: 'Event ID', type: 'string' },
        { field: 'name', label: 'Event Name', type: 'string' },
        { field: 'event_type', label: 'Type', type: 'string' },
        { field: 'status', label: 'Status', type: 'string' },
        { field: 'location_name', label: 'Location', type: 'string' },
        { field: 'capacity', label: 'Capacity', type: 'number' },
        { field: 'start_date', label: 'Start Date', type: 'date' },
        { field: 'end_date', label: 'End Date', type: 'date' },
        { field: 'created_at', label: 'Created Date', type: 'date' },
    ],
    volunteers: [
        { field: 'id', label: 'Volunteer ID', type: 'string' },
        { field: 'first_name', label: 'First Name', type: 'string' },
        { field: 'last_name', label: 'Last Name', type: 'string' },
        { field: 'email', label: 'Email', type: 'string' },
        { field: 'phone', label: 'Phone', type: 'string' },
        { field: 'volunteer_status', label: 'Status', type: 'string' },
        { field: 'skills', label: 'Skills', type: 'string' },
        { field: 'availability', label: 'Availability', type: 'string' },
        { field: 'created_at', label: 'Created Date', type: 'date' },
    ],
    tasks: [
        { field: 'id', label: 'Task ID', type: 'string' },
        { field: 'subject', label: 'Subject', type: 'string' },
        { field: 'status', label: 'Status', type: 'string' },
        { field: 'priority', label: 'Priority', type: 'string' },
        { field: 'due_date', label: 'Due Date', type: 'date' },
        { field: 'completed_date', label: 'Completed Date', type: 'date' },
        { field: 'related_to_type', label: 'Related To', type: 'string' },
        { field: 'created_at', label: 'Created Date', type: 'date' },
    ],
};
exports.default = {
    ReportEntity: {},
    ReportFormat: {},
    ReportField: {},
    ReportFilter: {},
    ReportSort: {},
    ReportDefinition: {},
    ReportResult: {},
    AVAILABLE_FIELDS: exports.AVAILABLE_FIELDS,
};
//# sourceMappingURL=report.js.map