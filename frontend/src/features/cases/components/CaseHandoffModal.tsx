import React from 'react';
import { BrutalCard, BrutalButton } from '../../../components/neo-brutalist';
import { FocusTrapDialog } from '../../../components/ui';
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
    <FocusTrapDialog
      isOpen={isOpen}
      labelledBy="case-handoff-modal-title"
      onClose={onClose}
      overlayClassName="fixed inset-0 z-[60] overflow-y-auto print:relative print:z-0"
      backdropClassName="fixed inset-0 bg-app-text/50 backdrop-blur-sm print:hidden"
      containerClassName="flex min-h-full items-center justify-center p-4 print:block print:min-h-0 print:p-0"
      panelClassName="w-full max-w-5xl print:max-w-none"
    >
      <BrutalCard className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-app-surface print:max-h-none print:shadow-none print:border-0">
        <div className="p-2 flex justify-end print:hidden">
          <h2 id="case-handoff-modal-title" className="sr-only">
            Case handoff packet
          </h2>
          <BrutalButton onClick={onClose} variant="secondary" size="sm">
            Close
          </BrutalButton>
        </div>
        <CaseHandoffPacket data={data} />
      </BrutalCard>
    </FocusTrapDialog>
  );
};
