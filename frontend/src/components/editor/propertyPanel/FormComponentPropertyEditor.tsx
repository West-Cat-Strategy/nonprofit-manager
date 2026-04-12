import React from 'react';
import type { PageComponent } from '../../../types/websiteBuilder';

interface FormComponentPropertyEditorProps {
  selectedComponent: PageComponent;
  onUpdateComponent: (id: string, updates: Partial<PageComponent>) => void;
}

const FormComponentPropertyEditor: React.FC<FormComponentPropertyEditorProps> = ({
  selectedComponent,
  onUpdateComponent,
}) => {
  const update = (updates: Partial<PageComponent>) =>
    onUpdateComponent(selectedComponent.id, updates);

  switch (selectedComponent.type) {
    case 'contact-form':
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Heading</label>
            <input
              type="text"
              value={selectedComponent.heading || ''}
              onChange={(e) => update({ heading: e.target.value || undefined })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Description
            </label>
            <textarea
              value={selectedComponent.description || ''}
              onChange={(e) => update({ description: e.target.value || undefined })}
              rows={3}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Submit Text
            </label>
            <input
              type="text"
              value={selectedComponent.submitText || 'Send Message'}
              onChange={(e) => update({ submitText: e.target.value })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Form Mode</label>
            <select
              value={selectedComponent.formMode || 'contact'}
              onChange={(e) =>
                update({
                  formMode: e.target.value as 'contact' | 'supporter',
                })
              }
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            >
              <option value="contact">Contact / inquiry</option>
              <option value="supporter">Add your name / supporter</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.includePhone !== false}
                onChange={(e) => update({ includePhone: e.target.checked })}
                className="rounded border-app-input-border"
              />
              Include phone field
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.includeMessage !== false}
                onChange={(e) => update({ includeMessage: e.target.checked })}
                className="rounded border-app-input-border"
              />
              Include message field
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Success Message
            </label>
            <input
              type="text"
              value={selectedComponent.successMessage || ''}
              onChange={(e) => update({ successMessage: e.target.value || undefined })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>
        </>
      );

    case 'newsletter-signup':
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Heading</label>
            <input
              type="text"
              value={selectedComponent.heading || ''}
              onChange={(e) => update({ heading: e.target.value || undefined })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Description
            </label>
            <textarea
              value={selectedComponent.description || ''}
              onChange={(e) => update({ description: e.target.value || undefined })}
              rows={3}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Button Text
            </label>
            <input
              type="text"
              value={selectedComponent.buttonText || 'Subscribe'}
              onChange={(e) => update({ buttonText: e.target.value })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Audience Mode
            </label>
            <select
              value={selectedComponent.audienceMode || 'crm'}
              onChange={(e) =>
                update({
<<<<<<< HEAD
                  audienceMode: e.target.value as 'crm' | 'mailchimp' | 'mautic' | 'both',
=======
                  audienceMode: e.target.value as 'crm' | 'mailchimp' | 'both',
>>>>>>> origin/main
                })
              }
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            >
              <option value="crm">CRM only</option>
<<<<<<< HEAD
              <option value="mautic">Mautic only</option>
              <option value="mailchimp">Mailchimp only</option>
              <option value="both">CRM + newsletter provider</option>
=======
              <option value="mailchimp">Mailchimp only</option>
              <option value="both">CRM + Mailchimp</option>
>>>>>>> origin/main
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
<<<<<<< HEAD
              Audience ID
            </label>
            <input
              type="text"
              value={selectedComponent.mailchimpListId || selectedComponent.mauticSegmentId || ''}
              onChange={(e) =>
                update({
                  mailchimpListId: e.target.value.trim() || undefined,
                  mauticSegmentId: e.target.value.trim() || undefined,
                })
              }
=======
              Mailchimp List ID
            </label>
            <input
              type="text"
              value={selectedComponent.mailchimpListId || ''}
              onChange={(e) => update({ mailchimpListId: e.target.value.trim() || undefined })}
>>>>>>> origin/main
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>
        </>
      );

    case 'donation-form':
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Heading</label>
            <input
              type="text"
              value={selectedComponent.heading || ''}
              onChange={(e) => update({ heading: e.target.value || undefined })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Description
            </label>
            <textarea
              value={selectedComponent.description || ''}
              onChange={(e) => update({ description: e.target.value || undefined })}
              rows={3}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Suggested Amounts
            </label>
            <input
              type="text"
              value={(selectedComponent.suggestedAmounts || []).join(', ')}
              onChange={(e) =>
                update({
                  suggestedAmounts: e.target.value
                    .split(',')
                    .map((value) => Number.parseFloat(value.trim()))
                    .filter((value) => Number.isFinite(value) && value > 0),
                })
              }
              placeholder="25, 50, 100, 250"
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.allowCustomAmount !== false}
                onChange={(e) => update({ allowCustomAmount: e.target.checked })}
                className="rounded border-app-input-border"
              />
              Allow custom amount
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.recurringOption === true}
                onChange={(e) => update({ recurringOption: e.target.checked })}
                className="rounded border-app-input-border"
              />
              Offer monthly recurring option
            </label>
          </div>
        </>
      );

    case 'newsletter-archive':
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Max Items</label>
            <input
              type="number"
              min={1}
              max={30}
              value={selectedComponent.maxItems || 10}
              onChange={(e) =>
                update({
                  maxItems: Math.max(
                    1,
                    Math.min(30, Number.parseInt(e.target.value || '10', 10) || 10)
                  ),
                })
              }
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Empty Message
            </label>
            <input
              type="text"
              value={selectedComponent.emptyMessage || ''}
              onChange={(e) => update({ emptyMessage: e.target.value || undefined })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Source Filter
            </label>
            <select
              value={selectedComponent.sourceFilter || 'all'}
              onChange={(e) =>
                update({
                  sourceFilter: e.target.value as 'native' | 'mailchimp' | 'all',
                })
              }
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            >
              <option value="all">Native + Mailchimp</option>
              <option value="native">Native only</option>
              <option value="mailchimp">Mailchimp only</option>
            </select>
          </div>
        </>
      );

    case 'volunteer-interest-form':
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Heading</label>
            <input
              type="text"
              value={selectedComponent.heading || ''}
              onChange={(e) => update({ heading: e.target.value || undefined })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Description
            </label>
            <textarea
              value={selectedComponent.description || ''}
              onChange={(e) => update({ description: e.target.value || undefined })}
              rows={3}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Submit Text
            </label>
            <input
              type="text"
              value={selectedComponent.submitText || 'Share Interest'}
              onChange={(e) => update({ submitText: e.target.value })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedComponent.includePhone !== false}
              onChange={(e) => update({ includePhone: e.target.checked })}
              className="rounded border-app-input-border"
            />
            Include phone field
          </label>
        </>
      );

    default:
      return null;
  }
};

export default FormComponentPropertyEditor;
