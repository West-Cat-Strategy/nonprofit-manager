import React from 'react';
import type { PageComponent } from '../../../../../types/websiteBuilder';
import type { PaymentProvider } from '../../../../../types/payment';

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
                  audienceMode: e.target.value as 'crm' | 'mailchimp' | 'mautic' | 'both',
                })
              }
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            >
              <option value="crm">CRM only</option>
              <option value="mautic">Mautic only</option>
              <option value="mailchimp">Mailchimp only</option>
              <option value="both">CRM + newsletter provider</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
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
              Donation Provider
            </label>
            <select
              value={selectedComponent.provider || 'stripe'}
              onChange={(e) =>
                update({
                  provider: e.target.value as PaymentProvider,
                })
              }
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            >
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="square">Square</option>
            </select>
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

    case 'referral-form':
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
              value={selectedComponent.submitText || 'Submit Referral'}
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

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Default Tags
            </label>
            <input
              type="text"
              value={(selectedComponent.defaultTags || []).join(', ')}
              onChange={(e) =>
                update({
                  defaultTags: e.target.value
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
              placeholder="intake, referral"
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Account ID
            </label>
            <input
              type="text"
              value={selectedComponent.accountId || ''}
              onChange={(e) => update({ accountId: e.target.value.trim() || undefined })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>
        </>
      );

    case 'petition-form':
    case 'donation-pledge-form':
    case 'support-letter-request': {
      const defaultSubmitText =
        selectedComponent.type === 'petition-form'
          ? 'Add my name'
          : selectedComponent.type === 'donation-pledge-form'
            ? 'Make pledge'
            : 'Request letter';

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
              Action Slug
            </label>
            <input
              type="text"
              value={selectedComponent.actionSlug || ''}
              onChange={(e) => update({ actionSlug: e.target.value.trim() || undefined })}
              placeholder="campaign-action"
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

          {selectedComponent.type === 'petition-form' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-app-text-muted">
                Petition Statement
              </label>
              <textarea
                value={selectedComponent.petitionStatement || ''}
                onChange={(e) => update({ petitionStatement: e.target.value || undefined })}
                rows={3}
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              />
            </div>
          ) : null}

          {selectedComponent.type === 'donation-pledge-form' ? (
            <>
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

              <div>
                <label className="mb-1 block text-sm font-medium text-app-text-muted">
                  Currency
                </label>
                <input
                  type="text"
                  value={selectedComponent.currency || 'CAD'}
                  onChange={(e) => update({ currency: e.target.value.trim().toUpperCase() || 'CAD' })}
                  className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : null}

          {selectedComponent.type === 'support-letter-request' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-app-text-muted">
                Letter Template
              </label>
              <textarea
                value={selectedComponent.letterTemplate || ''}
                onChange={(e) => update({ letterTemplate: e.target.value || undefined })}
                rows={5}
                placeholder="Use {{full_name}}, {{purpose}}, and {{organization_name}}"
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Submit Text
            </label>
            <input
              type="text"
              value={selectedComponent.submitText || defaultSubmitText}
              onChange={(e) => update({ submitText: e.target.value })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
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
    }

    default:
      return null;
  }
};

export default FormComponentPropertyEditor;
