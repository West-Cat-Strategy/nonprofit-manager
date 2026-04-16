import type { RoleSelectorItem } from '../types';
import PendingRegistrationsQueue from '../components/PendingRegistrationsQueue';
import RegistrationSettingsSection from './RegistrationSettingsSection';

interface ApprovalsSectionProps {
  roleOptions: RoleSelectorItem[];
}

export default function ApprovalsSection({ roleOptions }: ApprovalsSectionProps) {
  return (
    <div className="space-y-6">
      <PendingRegistrationsQueue />
      <RegistrationSettingsSection roleOptions={roleOptions} />
    </div>
  );
}
