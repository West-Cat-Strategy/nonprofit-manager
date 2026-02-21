import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    fetchCaseRelationships,
    createCaseRelationship,
    deleteCaseRelationship,
} from '../../features/cases/state';
import { BrutalButton, BrutalCard, BrutalBadge } from '../neo-brutalist';
import type { RelationshipType, CreateCaseRelationshipDTO } from '../../types/case';
import api from '../../services/api';
import ConfirmDialog from '../ConfirmDialog';
import useConfirmDialog, { confirmPresets } from '../../hooks/useConfirmDialog';

interface CaseRelationshipsProps {
    caseId: string;
}

interface CaseSearchResult {
    id: string;
    case_number?: string;
    title: string;
}

const CaseRelationships = ({ caseId }: CaseRelationshipsProps) => {
    const dispatch = useAppDispatch();
    const { caseRelationships } = useAppSelector((state) => state.casesV2);
    const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<CaseSearchResult[]>([]);
    const [selectedCase, setSelectedCase] = useState<CaseSearchResult | null>(null);
    const [relationshipType, setRelationshipType] = useState<RelationshipType>('related');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (caseId) {
            dispatch(fetchCaseRelationships(caseId));
        }
    }, [dispatch, caseId]);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await api.get(`/cases?search=${term}&limit=5`);
            // Filter out current case
            setSearchResults((response.data.cases as CaseSearchResult[]).filter((c) => c.id !== caseId));
        } catch (error) {
            console.error('Failed to search cases:', error);
        }
    };

    const handleAdd = async () => {
        if (!selectedCase) return;

        const data: CreateCaseRelationshipDTO = {
            related_case_id: selectedCase.id,
            relationship_type: relationshipType,
            description: description || undefined,
        };

        try {
            await dispatch(createCaseRelationship({ caseId, data })).unwrap();
            setIsAdding(false);
            setSelectedCase(null);
            setSearchTerm('');
            setSearchResults([]);
            setDescription('');
        } catch (error) {
            console.error('Failed to create relationship:', error);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm(confirmPresets.delete('Relationship'));
        if (!confirmed) return;
        try {
            await dispatch(deleteCaseRelationship(id)).unwrap();
        } catch (error) {
            console.error('Failed to delete relationship:', error);
        }
    };

    const getRelationshipColor = (type: RelationshipType) => {
        switch (type) {
            case 'parent': return 'purple';
            case 'child': return 'blue';
            case 'duplicate': return 'red';
            case 'blocks': return 'red';
            case 'blocked_by': return 'yellow';
            default: return 'green';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase text-black">Related Cases</h3>
                {!isAdding && (
                    <BrutalButton onClick={() => setIsAdding(true)} variant="primary" size="sm">
                        Add Relationship
                    </BrutalButton>
                )}
            </div>

            {isAdding && (
                <BrutalCard color="yellow" className="p-4 border-2">
                    <div className="space-y-4">
                        <h4 className="font-black uppercase text-sm">Add New Relationship</h4>

                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Search Case</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Case # or Title..."
                                    className="w-full p-2 border-2 border-black font-bold focus:outline-none"
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border-2 border-black max-h-40 overflow-y-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        {searchResults.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCase(c);
                                                    setSearchTerm(`${c.case_number} - ${c.title}`);
                                                    setSearchResults([]);
                                                }}
                                                className="w-full text-left p-2 hover:bg-black hover:text-white border-b-2 border-black last:border-0 font-bold text-sm"
                                            >
                                                <span className="opacity-70">{c.case_number}</span> - {c.title}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Type</label>
                                <select
                                    value={relationshipType}
                                    onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                                    className="w-full p-2 border-2 border-black font-bold focus:outline-none bg-white"
                                >
                                    <option value="related">Related</option>
                                    <option value="parent">Parent</option>
                                    <option value="child">Child</option>
                                    <option value="duplicate">Duplicate</option>
                                    <option value="blocks">Blocks</option>
                                    <option value="blocked_by">Blocked By</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Description</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Optional notes..."
                                    className="w-full p-2 border-2 border-black font-bold focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <BrutalButton
                                onClick={handleAdd}
                                variant="primary"
                                size="sm"
                                className="flex-1"
                                disabled={!selectedCase}
                            >
                                Link Case
                            </BrutalButton>
                            <BrutalButton
                                onClick={() => {
                                    setIsAdding(false);
                                    setSelectedCase(null);
                                    setSearchTerm('');
                                    setSearchResults([]);
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!caseRelationships || caseRelationships.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-black/50 font-bold uppercase">
                        No related cases found.
                    </div>
                ) : (
                    caseRelationships.map((rel) => (
                        <BrutalCard key={rel.id} color="white" className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BrutalBadge color={getRelationshipColor(rel.relationship_type)}>
                                            {rel.relationship_type}
                                        </BrutalBadge>
                                        <span className="text-xs font-black text-black/40">
                                            {new Date(rel.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <a
                                        href={`/cases/${rel.related_case_id}`}
                                        className="block font-black uppercase text-black hover:underline truncate"
                                    >
                                        {rel.related_case_number}
                                    </a>
                                    <p className="font-bold text-sm text-black/70 truncate">
                                        {rel.related_case_title}
                                    </p>
                                    {rel.description && (
                                        <p className="mt-2 text-xs font-medium italic text-black/60">
                                            "{rel.description}"
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(rel.id)}
                                    className="p-1 hover:bg-pink flex-shrink-0 border-2 border-transparent hover:border-black transition-colors"
                                    aria-label="Remove relationship"
                                >
                                    <span className="text-xl">🗑️</span>
                                </button>
                            </div>
                        </BrutalCard>
                    ))
                )}
            </div>
            <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
        </div>
    );
};

export default CaseRelationships;
