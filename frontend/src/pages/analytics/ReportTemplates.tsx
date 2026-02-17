import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReportTemplate, TemplateCategory } from '../../types/reportTemplate';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import api from '../../services/api';

const CATEGORIES: { value: TemplateCategory; label: string; icon: string }[] = [
    { value: 'fundraising', label: 'Fundraising', icon: '💰' },
    { value: 'engagement', label: 'Engagement', icon: '👥' },
    { value: 'operations', label: 'Operations', icon: '⚙️' },
    { value: 'finance', label: 'Finance', icon: '📊' },
    { value: 'compliance', label: 'Compliance', icon: '📋' },
    { value: 'custom', label: 'Custom', icon: '✨' },
];

function ReportTemplates() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | ''>('');

    useEffect(() => {
        fetchTemplates();
    }, [selectedCategory]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const params = selectedCategory ? { category: selectedCategory } : {};
            const response = await api.get('/reports/templates', { params });
            setTemplates(response.data);
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUseTemplate = async (template: ReportTemplate) => {
        // Navigate to report builder with template ID
        navigate(`/reports/builder?template=${template.id}`);
    };

    const filteredTemplates = selectedCategory
        ? templates.filter(t => t.category === selectedCategory)
        : templates;

    return (
        <NeoBrutalistLayout pageTitle="REPORT TEMPLATES">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-[var(--app-text)] uppercase mb-2">
                            Report Templates
                        </h1>
                        <p className="text-[var(--app-text-muted)]">
                            Start with pre-built templates for common reports
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/reports/builder')}
                        className="px-6 py-3 bg-[var(--loop-green)] text-black border-2 border-black shadow-[4px_4px_0px_0px_var(--shadow-color)] font-black uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                    >
                        Create Custom Report
                    </button>
                </div>

                {/* Category Filter */}
                <div className="mb-8 bg-[var(--app-surface)] border-2 border-black shadow-[4px_4px_0px_0px_var(--shadow-color)] p-6">
                    <h2 className="text-lg font-bold text-[var(--app-text)] mb-4 uppercase">Filter by Category</h2>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setSelectedCategory('')}
                            className={`px-4 py-2 border-2 border-black font-bold uppercase transition-all ${selectedCategory === ''
                                ? 'bg-black text-white'
                                : 'bg-white text-black hover:bg-[var(--loop-yellow)]'
                                }`}
                        >
                            All
                        </button>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setSelectedCategory(cat.value)}
                                className={`px-4 py-2 border-2 border-black font-bold uppercase transition-all ${selectedCategory === cat.value
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black hover:bg-[var(--loop-yellow)]'
                                    }`}
                            >
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Templates Grid */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
                        <p className="mt-4 text-[var(--app-text-muted)] font-bold uppercase">Loading Templates...</p>
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="bg-[var(--app-surface)] border-2 border-black shadow-[4px_4px_0px_0px_var(--shadow-color)] p-12 text-center">
                        <p className="text-xl font-bold text-[var(--app-text-muted)] uppercase">
                            No templates found in this category
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTemplates.map(template => {
                            const category = CATEGORIES.find(c => c.value === template.category);
                            return (
                                <div
                                    key={template.id}
                                    className="bg-[var(--app-surface)] border-2 border-black shadow-[4px_4px_0px_0px_var(--shadow-color)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                                >
                                    <div className="p-6">
                                        {/* Category Badge */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="px-3 py-1 bg-[var(--loop-yellow)] border-2 border-black text-xs font-black uppercase">
                                                {category?.icon} {category?.label}
                                            </span>
                                            {template.is_system && (
                                                <span className="px-2 py-1 bg-[var(--loop-blue)] border-2 border-black text-xs font-black uppercase">
                                                    System
                                                </span>
                                            )}
                                        </div>

                                        {/* Template Name */}
                                        <h3 className="text-xl font-black text-[var(--app-text)] mb-2 uppercase">
                                            {template.name}
                                        </h3>

                                        {/* Description */}
                                        <p className="text-[var(--app-text-muted)] mb-4 line-clamp-3">
                                            {template.description}
                                        </p>

                                        {/* Tags */}
                                        {template.tags && template.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {template.tags.map(tag => (
                                                    <span
                                                        key={tag}
                                                        className="px-2 py-1 bg-white border border-black text-xs font-bold uppercase"
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <button
                                            onClick={() => handleUseTemplate(template)}
                                            className="w-full px-4 py-3 bg-[var(--loop-green)] text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] font-black uppercase hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                                        >
                                            Use Template
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </NeoBrutalistLayout>
    );
}

export default ReportTemplates;
