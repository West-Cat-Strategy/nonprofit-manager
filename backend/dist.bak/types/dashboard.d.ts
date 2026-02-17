/**
 * Dashboard Configuration Types (Backend)
 * Type definitions for customizable dashboard backend
 */
/**
 * Widget layout position
 */
export interface WidgetLayout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
}
/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
    id: string;
    type: string;
    title: string;
    enabled: boolean;
    layout: WidgetLayout;
    settings?: Record<string, any>;
}
/**
 * Dashboard configuration
 */
export interface DashboardConfig {
    id: string;
    user_id: string;
    name: string;
    is_default: boolean;
    widgets: DashboardWidget[];
    layout: WidgetLayout[];
    breakpoints?: {
        lg: number;
        md: number;
        sm: number;
        xs: number;
    };
    cols?: {
        lg: number;
        md: number;
        sm: number;
        xs: number;
    };
    created_at: Date;
    updated_at: Date;
}
/**
 * Create dashboard DTO
 */
export interface CreateDashboardDTO {
    user_id: string;
    name: string;
    is_default: boolean;
    widgets: DashboardWidget[];
    layout: WidgetLayout[];
    breakpoints?: Record<string, number>;
    cols?: Record<string, number>;
}
/**
 * Update dashboard DTO
 */
export interface UpdateDashboardDTO {
    name?: string;
    is_default?: boolean;
    widgets?: DashboardWidget[];
    layout?: WidgetLayout[];
    breakpoints?: Record<string, number>;
    cols?: Record<string, number>;
}
declare const _default: {
    WidgetLayout: WidgetLayout;
    DashboardWidget: DashboardWidget;
    DashboardConfig: DashboardConfig;
    CreateDashboardDTO: CreateDashboardDTO;
    UpdateDashboardDTO: UpdateDashboardDTO;
};
export default _default;
//# sourceMappingURL=dashboard.d.ts.map