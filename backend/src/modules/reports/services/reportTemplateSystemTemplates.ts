import type { ReportTemplate } from '@app-types/reportTemplate';

export type SystemReportTemplateSeed = Omit<
  ReportTemplate,
  'id' | 'created_at' | 'updated_at' | 'is_system'
>;

export function getSystemReportTemplates(): SystemReportTemplateSeed[] {
  return [
    {
      name: 'Executive Board Pack Fundraising Snapshot',
      description:
        'Board-ready fundraising totals with campaign, designation, and recurring-giving context',
      category: 'fundraising',
      tags: ['board-pack', 'executive', 'board', 'fundraising', 'summary'],
      entity: 'donations',
      template_definition: {
        name: 'Executive Board Pack Fundraising Snapshot',
        entity: 'donations',
        fields: ['campaign_name', 'designation', 'payment_status', 'is_recurring'],
        groupBy: ['campaign_name', 'designation', 'payment_status', 'is_recurring'],
        aggregations: [
          { field: 'amount', function: 'sum', alias: 'total_raised' },
          { field: 'amount', function: 'count', alias: 'gift_count' },
        ],
        filters: [
          {
            field: 'donation_date',
            operator: 'gte',
            value: '{{start_date}}',
          },
          {
            field: 'donation_date',
            operator: 'lte',
            value: '{{end_date}}',
          },
        ],
        sort: [{ field: 'total_raised', direction: 'desc' }],
      },
      parameters: [
        {
          name: 'start_date',
          label: 'Start Date',
          type: 'date',
          required: true,
          description: 'Opening date for the board-pack window',
        },
        {
          name: 'end_date',
          label: 'End Date',
          type: 'date',
          required: true,
          description: 'Closing date for the board-pack window',
        },
      ],
    },
    {
      name: 'Board Reporting Calendar',
      description:
        'Upcoming grant reporting and closeout deadlines for board and leadership review',
      category: 'compliance',
      tags: ['board-pack', 'executive', 'board', 'reporting', 'deadline'],
      entity: 'grants',
      template_definition: {
        name: 'Board Reporting Calendar',
        entity: 'grants',
        fields: [
          'title',
          'funder_name',
          'status',
          'fiscal_year',
          'next_report_due_at',
          'closeout_due_at',
          'outstanding_amount',
        ],
        sort: [{ field: 'next_report_due_at', direction: 'asc' }],
      },
    },
    {
      name: 'Fundraiser Stewardship Cadence Queue',
      description: 'Scheduled donor stewardship follow-ups for weekly and monthly cadence review',
      category: 'fundraising',
      tags: ['fundraising-cadence', 'stewardship', 'follow-up'],
      entity: 'follow_ups',
      template_definition: {
        name: 'Fundraiser Stewardship Cadence Queue',
        entity: 'follow_ups',
        fields: [
          'contact_name',
          'assigned_to_name',
          'method',
          'frequency',
          'scheduled_date',
          'completed_date',
          'status',
          'has_reminder',
        ],
        filters: [
          {
            field: 'entity_type',
            operator: 'eq',
            value: 'contact',
          },
          {
            field: 'scheduled_date',
            operator: 'gte',
            value: '{{start_date}}',
          },
          {
            field: 'scheduled_date',
            operator: 'lte',
            value: '{{end_date}}',
          },
        ],
        sort: [{ field: 'scheduled_date', direction: 'asc' }],
      },
      parameters: [
        {
          name: 'start_date',
          label: 'Start Date',
          type: 'date',
          required: true,
          description: 'First stewardship date to include',
        },
        {
          name: 'end_date',
          label: 'End Date',
          type: 'date',
          required: true,
          description: 'Last stewardship date to include',
        },
      ],
    },
    {
      name: 'Fundraiser Impact Update Gifts',
      description:
        'Recent donor gifts that should feed impact communications and stewardship updates',
      category: 'fundraising',
      tags: ['fundraising-cadence', 'stewardship', 'impact', 'donor-updates'],
      entity: 'donations',
      template_definition: {
        name: 'Fundraiser Impact Update Gifts',
        entity: 'donations',
        fields: [
          'donor_name',
          'campaign_name',
          'designation',
          'amount',
          'payment_status',
          'is_recurring',
          'donation_date',
        ],
        filters: [
          {
            field: 'donation_date',
            operator: 'gte',
            value: '{{start_date}}',
          },
          {
            field: 'donation_date',
            operator: 'lte',
            value: '{{end_date}}',
          },
        ],
        sort: [{ field: 'donation_date', direction: 'desc' }],
      },
      parameters: [
        {
          name: 'start_date',
          label: 'Start Date',
          type: 'date',
          required: true,
          description: 'First gift date to include',
        },
        {
          name: 'end_date',
          label: 'End Date',
          type: 'date',
          required: true,
          description: 'Last gift date to include',
        },
      ],
    },
    {
      name: 'Monthly Donor Summary',
      description: 'Summary of all donations received in a specific month',
      category: 'fundraising',
      tags: ['donations', 'monthly', 'summary'],
      entity: 'donations',
      template_definition: {
        name: 'Monthly Donor Summary',
        entity: 'donations',
        fields: ['donor_name', 'donation_date', 'amount', 'payment_method'],
        groupBy: ['donor_name'],
        aggregations: [
          { field: 'amount', function: 'sum', alias: 'total_donated' },
          { field: 'amount', function: 'count', alias: 'donation_count' },
        ],
        filters: [
          {
            field: 'donation_date',
            operator: 'gte',
            value: '{{start_date}}',
          },
          {
            field: 'donation_date',
            operator: 'lte',
            value: '{{end_date}}',
          },
        ],
        sort: [{ field: 'total_donated', direction: 'desc' }],
      },
      parameters: [
        {
          name: 'start_date',
          label: 'Start Date',
          type: 'date',
          required: true,
          description: 'First day of the month',
        },
        {
          name: 'end_date',
          label: 'End Date',
          type: 'date',
          required: true,
          description: 'Last day of the month',
        },
      ],
    },
    {
      name: 'Event Attendance Report',
      description: 'List of volunteers who attended events',
      category: 'engagement',
      tags: ['events', 'volunteers', 'attendance'],
      entity: 'volunteers',
      template_definition: {
        name: 'Event Attendance Report',
        entity: 'volunteers',
        fields: ['first_name', 'last_name', 'email', 'status'],
        filters: [
          {
            field: 'status',
            operator: 'eq',
            value: 'active',
          },
        ],
        sort: [{ field: 'last_name', direction: 'asc' }],
      },
    },
    {
      name: 'Volunteer Hours Summary',
      description: 'Total hours contributed by volunteers in a time period',
      category: 'operations',
      tags: ['volunteers', 'hours', 'summary'],
      entity: 'volunteers',
      template_definition: {
        name: 'Volunteer Hours Summary',
        entity: 'volunteers',
        fields: ['first_name', 'last_name', 'total_hours'],
        sort: [{ field: 'total_hours', direction: 'desc' }],
      },
    },
    {
      name: 'Active Accounts by Type',
      description: 'Breakdown of active accounts by account type',
      category: 'operations',
      tags: ['accounts', 'active', 'breakdown'],
      entity: 'accounts',
      template_definition: {
        name: 'Active Accounts by Type',
        entity: 'accounts',
        fields: ['account_type'],
        groupBy: ['account_type'],
        aggregations: [{ field: 'id', function: 'count', alias: 'account_count' }],
        filters: [
          {
            field: 'is_active',
            operator: 'eq',
            value: true,
          },
        ],
        sort: [{ field: 'account_count', direction: 'desc' }],
      },
    },
    {
      name: 'Expense Report by Category',
      description: 'Total expenses grouped by category',
      category: 'finance',
      tags: ['expenses', 'category', 'summary'],
      entity: 'expenses',
      template_definition: {
        name: 'Expense Report by Category',
        entity: 'expenses',
        fields: ['category'],
        groupBy: ['category'],
        aggregations: [
          { field: 'amount', function: 'sum', alias: 'total_amount' },
          { field: 'amount', function: 'count', alias: 'expense_count' },
        ],
        sort: [{ field: 'total_amount', direction: 'desc' }],
      },
    },
    {
      name: 'Grant Status Overview',
      description: 'Overview of grants with funder, program, recipient, and balance details',
      category: 'finance',
      tags: ['grants', 'status', 'overview'],
      entity: 'grants',
      template_definition: {
        name: 'Grant Status Overview',
        entity: 'grants',
        fields: [
          'grant_number',
          'title',
          'funder_name',
          'program_name',
          'recipient_name',
          'status',
          'amount',
          'disbursed_amount',
          'outstanding_amount',
          'next_report_due_at',
        ],
        sort: [{ field: 'next_report_due_at', direction: 'asc' }],
      },
    },
    {
      name: 'Case Workload Core KPI',
      description: 'Case workload split by assignee, status, and aging bucket',
      category: 'operations',
      tags: ['cases', 'kpi', 'workload'],
      entity: 'cases',
      template_definition: {
        name: 'Case Workload Core KPI',
        entity: 'cases',
        fields: [
          'assigned_to_name',
          'status_name',
          'age_bucket',
          'open_flag',
          'overdue_flag',
          'unassigned_flag',
        ],
        groupBy: [
          'assigned_to_name',
          'status_name',
          'age_bucket',
          'open_flag',
          'overdue_flag',
          'unassigned_flag',
        ],
        aggregations: [{ field: 'id', function: 'count', alias: 'case_count' }],
        sort: [{ field: 'assigned_to_name', direction: 'asc' }],
      },
    },
    {
      name: 'Opportunity Pipeline Core KPI',
      description: 'Pipeline volume and weighted value by stage',
      category: 'fundraising',
      tags: ['opportunities', 'pipeline', 'kpi'],
      entity: 'opportunities',
      template_definition: {
        name: 'Opportunity Pipeline Core KPI',
        entity: 'opportunities',
        fields: ['stage_name', 'stage_order'],
        groupBy: ['stage_name', 'stage_order'],
        aggregations: [
          { field: 'id', function: 'count', alias: 'opportunity_count' },
          { field: 'amount', function: 'sum', alias: 'pipeline_amount' },
          { field: 'weighted_amount', function: 'sum', alias: 'pipeline_weighted_amount' },
        ],
        sort: [{ field: 'stage_order', direction: 'asc' }],
      },
    },
    {
      name: 'Opportunity Closed Win-Rate KPI',
      description: 'Closed pipeline split for win-rate tracking',
      category: 'fundraising',
      tags: ['opportunities', 'win-rate', 'kpi'],
      entity: 'opportunities',
      template_definition: {
        name: 'Opportunity Closed Win-Rate KPI',
        entity: 'opportunities',
        fields: ['status', 'won_flag', 'lost_flag', 'closed_flag'],
        groupBy: ['status', 'won_flag', 'lost_flag', 'closed_flag'],
        aggregations: [
          { field: 'id', function: 'count', alias: 'closed_count' },
          { field: 'amount', function: 'sum', alias: 'closed_amount' },
        ],
        filters: [
          {
            field: 'closed_flag',
            operator: 'eq',
            value: true,
          },
        ],
        sort: [{ field: 'status', direction: 'asc' }],
      },
    },
  ];
}
