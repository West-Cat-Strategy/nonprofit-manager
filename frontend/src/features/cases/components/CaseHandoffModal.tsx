import React from 'react';
import { BrutalCard, BrutalButton } from '../../../components/neo-brutalist';
import { CaseHandoffPacket } from './CaseHandoffPacket';
import type { CaseHandoffPacket as HandoffData } from '../../../types/case';

interface CaseHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: HandoffData | null;
}

export const CaseHandoffModal: React.FC<CaseHandoffModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[var(--app-overlay-scrim)] backdrop-blur-sm print:relative print:p-0 print:bg-app-surface print:z-0">
      <BrutalCard className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-app-surface print:max-h-none print:shadow-none print:border-0">
        <div className="p-2 flex justify-end print:hidden">
          <BrutalButton onClick={onClose} variant="secondary" size="sm">
            Close
          </BrutalButton>
        </div>
        <CaseHandoffPacket data={data} />
      </BrutalCard>
    </div>
  );
};
