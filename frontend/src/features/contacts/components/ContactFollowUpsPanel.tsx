import FollowUpList from '../../../components/FollowUpList';

interface ContactFollowUpsPanelProps {
  contactId: string;
}

export default function ContactFollowUpsPanel({ contactId }: ContactFollowUpsPanelProps) {
  return <FollowUpList entityType="contact" entityId={contactId} />;
}
