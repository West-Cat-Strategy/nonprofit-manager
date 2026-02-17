import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from 'recharts';

interface ReportChartProps {
    data: any[];
    chartType: 'bar' | 'pie' | 'line';
    xAxisField: string;
    yAxisField: string;
    title?: string;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F1C', '#A06CD5', '#2CB67D', '#3498DB'];

const ReportChart: React.FC<ReportChartProps> = ({
    data,
    chartType,
    xAxisField,
    yAxisField,
    title,
}) => {
    if (!data || data.length === 0) {
        return <div className="p-4 text-center text-gray-500">No data available for chart</div>;
    }

    const renderChart = () => {
        switch (chartType) {
            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey={yAxisField}
                            nameKey={xAxisField}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                );
            case 'line':
                return (
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                            dataKey={xAxisField}
                            stroke="var(--app-text)"
                            tick={{ fontSize: 12, fontWeight: 'bold' }}
                        />
                        <YAxis
                            stroke="var(--app-text)"
                            tick={{ fontSize: 12, fontWeight: 'bold' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--app-surface)',
                                border: '2px solid var(--app-border)',
                                fontWeight: 'bold'
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey={yAxisField}
                            stroke="#4A90E2"
                            strokeWidth={4}
                            dot={{ r: 6, fill: '#4A90E2', stroke: 'black', strokeWidth: 2 }}
                            activeDot={{ r: 8, stroke: 'black', strokeWidth: 2 }}
                        />
                    </LineChart>
                );
            case 'bar':
            default:
                return (
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                            dataKey={xAxisField}
                            stroke="var(--app-text)"
                            tick={{ fontSize: 12, fontWeight: 'bold' }}
                        />
                        <YAxis
                            stroke="var(--app-text)"
                            tick={{ fontSize: 12, fontWeight: 'bold' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--app-surface)',
                                border: '2px solid var(--app-border)',
                                fontWeight: 'bold'
                            }}
                        />
                        <Legend />
                        <Bar
                            dataKey={yAxisField}
                            fill="#F7D046"
                            stroke="black"
                            strokeWidth={2}
                        />
                    </BarChart>
                );
        }
    };

    return (
        <div className="w-full h-80 bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-4">
            {title && <h3 className="text-lg font-bold mb-4 uppercase">{title}</h3>}
            <ResponsiveContainer width="100%" height="90%">
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
};

export default ReportChart;
