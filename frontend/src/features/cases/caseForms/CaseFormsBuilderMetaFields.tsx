import { builderFieldId } from './caseFormBuilderIds';

interface CaseFormsBuilderMetaFieldsProps {
  editorDescription: string;
  editorDueAt: string;
  editorRecipientEmail: string;
  editorRecipientPhone: string;
  editorTitle: string;
  sendExpiryDays: string;
  setEditorDescription: (value: string) => void;
  setEditorDueAt: (value: string) => void;
  setEditorRecipientEmail: (value: string) => void;
  setEditorRecipientPhone: (value: string) => void;
  setEditorTitle: (value: string) => void;
  setSendExpiryDays: (value: string) => void;
}

function BuilderLabel({ field, children }: { field: string; children: string }) {
  return (
    <label
      htmlFor={builderFieldId(field)}
      className="mb-1 block text-xs font-black uppercase text-black/70"
    >
      {children}
    </label>
  );
}

export function CaseFormsBuilderMetaFields({
  editorDescription,
  editorDueAt,
  editorRecipientEmail,
  editorRecipientPhone,
  editorTitle,
  sendExpiryDays,
  setEditorDescription,
  setEditorDueAt,
  setEditorRecipientEmail,
  setEditorRecipientPhone,
  setEditorTitle,
  setSendExpiryDays,
}: CaseFormsBuilderMetaFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <BuilderLabel field="title">Title</BuilderLabel>
        <input
          id={builderFieldId('title')}
          value={editorTitle}
          onChange={(event) => setEditorTitle(event.target.value)}
          className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
        />
      </div>
      <div>
        <BuilderLabel field="recipient-email">Recipient Email</BuilderLabel>
        <input
          id={builderFieldId('recipient-email')}
          type="email"
          value={editorRecipientEmail}
          onChange={(event) => setEditorRecipientEmail(event.target.value)}
          className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
        />
      </div>
      <div>
        <BuilderLabel field="recipient-phone">Recipient Phone</BuilderLabel>
        <input
          id={builderFieldId('recipient-phone')}
          type="tel"
          value={editorRecipientPhone}
          onChange={(event) => setEditorRecipientPhone(event.target.value)}
          className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
        />
      </div>
      <div className="md:col-span-2">
        <BuilderLabel field="description">Description</BuilderLabel>
        <textarea
          id={builderFieldId('description')}
          value={editorDescription}
          onChange={(event) => setEditorDescription(event.target.value)}
          rows={3}
          className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
        />
      </div>
      <div>
        <BuilderLabel field="due-at">Due At</BuilderLabel>
        <input
          id={builderFieldId('due-at')}
          type="datetime-local"
          value={editorDueAt}
          onChange={(event) => setEditorDueAt(event.target.value)}
          className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
        />
      </div>
      <div>
        <BuilderLabel field="email-link-expiry-days">Email Link Expiry (days)</BuilderLabel>
        <input
          id={builderFieldId('email-link-expiry-days')}
          type="number"
          min={1}
          max={30}
          value={sendExpiryDays}
          onChange={(event) => setSendExpiryDays(event.target.value)}
          className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
