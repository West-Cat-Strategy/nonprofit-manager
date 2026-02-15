import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    fetchCaseServices,
    createCaseService,
    updateCaseService,
    deleteCaseService,
} from '../../store/slices/casesSlice';
import { BrutalButton, BrutalCard, BrutalBadge } from '../neo-brutalist';
import type { ServiceStatus, CreateCaseServiceDTO, CaseService } from '../../types/case';

interface CaseServicesProps {
    caseId: string;
}

const CaseServices = ({ caseId }: CaseServicesProps) => {
    const dispatch = useAppDispatch();
    const { caseServices } = useAppSelector((state) => state.cases);
    const [isAdding, setIsAdding] = useState(false);
    const [editingService, setEditingService] = useState<CaseService | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<CreateCaseServiceDTO>>({
        service_name: '',
        service_type: 'other',
        service_provider: '',
        service_date: new Date().toISOString().split('T')[0],
        status: 'scheduled',
        notes: '',
    });

    useEffect(() => {
        if (caseId) {
            dispatch(fetchCaseServices(caseId));
        }
    }, [dispatch, caseId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!formData.service_name || !formData.service_date) return;

        try {
            if (editingService) {
                await dispatch(updateCaseService({ serviceId: editingService.id, data: formData })).unwrap();
            } else {
                await dispatch(createCaseService({ caseId, data: formData as CreateCaseServiceDTO })).unwrap();
            }
            setIsAdding(false);
            setEditingService(null);
            resetForm();
        } catch (error) {
            console.error('Failed to save service:', error);
        }
    };

    const handleEdit = (service: CaseService) => {
        setEditingService(service);
        setFormData({
            service_name: service.service_name,
            service_type: service.service_type || 'other',
            service_provider: service.service_provider || '',
            service_date: new Date(service.service_date).toISOString().split('T')[0],
            status: service.status,
            notes: service.notes || '',
        });
        setIsAdding(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this service record?')) {
            try {
                await dispatch(deleteCaseService(id)).unwrap();
            } catch (error) {
                console.error('Failed to delete service:', error);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            service_name: '',
            service_type: 'other',
            service_provider: '',
            service_date: new Date().toISOString().split('T')[0],
            status: 'scheduled',
            notes: '',
        });
    };

    const getStatusColor = (status: ServiceStatus): 'green' | 'red' | 'yellow' => {
        switch (status) {
            case 'completed': return 'green';
            case 'cancelled': return 'red';
            case 'no_show': return 'red';
            default: return 'yellow';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase text-black">Case Services</h3>
                {!isAdding && (
                    <BrutalButton onClick={() => { resetForm(); setIsAdding(true); }} variant="primary" size="sm">
                        Log Service
                    </BrutalButton>
                )}
            </div>

            {isAdding && (
                <BrutalCard color="white" className="p-4 border-2">
                    <div className="space-y-4">
                        <h4 className="font-black uppercase text-sm">
                            {editingService ? 'Edit Service Record' : 'Record New Service'}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Service Name *</label>
                                <input
                                    type="text"
                                    name="service_name"
                                    value={formData.service_name}
                                    onChange={handleChange}
                                    placeholder="e.g., Initial Assessment"
                                    className="w-full p-2 border-2 border-black font-bold focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Service Type</label>
                                <select
                                    name="service_type"
                                    value={formData.service_type}
                                    onChange={handleChange}
                                    className="w-full p-2 border-2 border-black font-bold focus:outline-none bg-white"
                                >
                                    <option value="counseling">Counseling</option>
                                    <option value="legal">Legal</option>
                                    <option value="financial">Financial</option>
                                    <option value="housing">Housing</option>
                                    <option value="healthcare">Healthcare</option>
                                    <option value="education">Education</option>
                                    <option value="employment">Employment</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Date *</label>
                                <input
                                    type="date"
                                    name="service_date"
                                    value={formData.service_date}
                                    onChange={handleChange}
                                    className="w-full p-2 border-2 border-black font-bold focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Provider</label>
                                <input
                                    type="text"
                                    name="service_provider"
                                    value={formData.service_provider}
                                    onChange={handleChange}
                                    placeholder="Organization or Individual"
                                    className="w-full p-2 border-2 border-black font-bold focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full p-2 border-2 border-black font-bold focus:outline-none bg-white"
                                >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="no_show">No Show</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Details about the service provided..."
                                rows={3}
                                className="w-full p-2 border-2 border-black font-bold focus:outline-none"
                            />
                        </div>

                        <div className="flex gap-2">
                            <BrutalButton
                                onClick={handleSave}
                                variant="primary"
                                size="sm"
                                className="flex-1"
                                disabled={!formData.service_name || !formData.service_date}
                            >
                                {editingService ? 'Update Record' : 'Save Record'}
                            </BrutalButton>
                            <BrutalButton
                                onClick={() => {
                                    setIsAdding(false);
                                    setEditingService(null);
                                }}
                                variant="secondary"
                                size="sm"
                                className="flex-1"
                            >
                                Cancel
                            </BrutalButton>
                        </div>
                    </div>
                </BrutalCard>
            )}

            <div className="space-y-4">
                {!caseServices || caseServices.length === 0 ? (
                    <div className="py-8 text-center text-black/50 font-bold uppercase">
                        No service records found.
                    </div>
                ) : (
                    caseServices.map((service) => (
                        <BrutalCard key={service.id} color="white" className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <BrutalBadge color={getStatusColor(service.status)}>
                                            {service.status}
                                        </BrutalBadge>
                                        <span className="text-xs font-black text-black/40">
                                            {new Date(service.service_date).toLocaleDateString()}
                                        </span>
                                        {service.service_type && (
                                            <BrutalBadge color="purple">
                                                {service.service_type as any}
                                            </BrutalBadge>
                                        )}
                                    </div>
                                    <h4 className="font-black uppercase text-black">{service.service_name}</h4>
                                    {service.service_provider && (
                                        <p className="text-xs font-bold text-black/60 italic">
                                            by {service.service_provider}
                                        </p>
                                    )}
                                    {service.notes && (
                                        <p className="mt-2 text-sm font-medium text-black/80 line-clamp-2">
                                            {service.notes}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2 self-end md:self-center">
                                    <button
                                        onClick={() => handleEdit(service)}
                                        className="p-1 hover:bg-yellow flex-shrink-0 border-2 border-transparent hover:border-black transition-colors"
                                        aria-label="Edit service"
                                    >
                                        <span className="text-xl">✏️</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(service.id)}
                                        className="p-1 hover:bg-pink flex-shrink-0 border-2 border-transparent hover:border-black transition-colors"
                                        aria-label="Delete service"
                                    >
                                        <span className="text-xl">🗑️</span>
                                    </button>
                                </div>
                            </div>
                        </BrutalCard>
                    ))
                )}
            </div>
        </div>
    );
};

export default CaseServices;
