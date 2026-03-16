import PaymentHistory from '../../../components/PaymentHistory';

interface ContactPaymentsPanelProps {
  contactId: string;
}

export default function ContactPaymentsPanel({ contactId }: ContactPaymentsPanelProps) {
  return <PaymentHistory contactId={contactId} limit={20} showViewAll={false} />;
}
