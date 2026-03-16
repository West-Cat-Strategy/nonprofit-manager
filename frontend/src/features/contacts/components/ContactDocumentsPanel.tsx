import ContactDocuments from '../../../components/ContactDocuments';

interface ContactDocumentsPanelProps {
  contactId: string;
}

export default function ContactDocumentsPanel({ contactId }: ContactDocumentsPanelProps) {
  return <ContactDocuments contactId={contactId} />;
}
