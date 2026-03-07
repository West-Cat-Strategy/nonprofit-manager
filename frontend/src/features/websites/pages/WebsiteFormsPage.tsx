import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { WebsiteConsoleLayout, WebsiteConsoleNotice } from '../components';
import useWebsiteOverviewLoader from '../hooks/useWebsiteOverviewLoader';
import { clearWebsitesError, fetchWebsiteForms, updateWebsiteForm } from '../state';
import type { WebsiteFormDefinition, WebsiteFormOperationalConfig } from '../types';

const WebsiteFormsPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const dispatch = useAppDispatch();
  const overview = useWebsiteOverviewLoader(siteId, 30);
  const { forms, isSaving, isLoading, error } = useAppSelector((state) => state.websites);
  const [drafts, setDrafts] = useState<Record<string, WebsiteFormOperationalConfig>>({});
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!siteId) return;
    void dispatch(fetchWebsiteForms(siteId));
  }, [dispatch, siteId]);

  useEffect(() => {
    const nextDrafts = Object.fromEntries(
      forms.map((form) => [form.formKey, { ...form.operationalSettings }])
    );
    setDrafts(nextDrafts);
  }, [forms]);

  const groupedForms = useMemo(() => {
    const groups = new Map<string, WebsiteFormDefinition[]>();
    forms.forEach((form) => {
      const key = form.pageName;
      groups.set(key, [...(groups.get(key) || []), form]);
    });
    return Array.from(groups.entries());
  }, [forms]);

  const updateDraft = (
    formKey: string,
    patch: Partial<WebsiteFormOperationalConfig>
  ) => {
    setDrafts((current) => ({
      ...current,
      [formKey]: {
        ...(current[formKey] || {}),
        ...patch,
      },
    }));
  };

  const saveForm = async (formKey: string) => {
    if (!siteId) return;
    setNotice(null);
    const result = await dispatch(
      updateWebsiteForm({
        siteId,
        formKey,
        data: drafts[formKey] || {},
      })
    );
    if (updateWebsiteForm.fulfilled.match(result)) {
      await dispatch(fetchWebsiteForms(siteId));
      setNotice({ tone: 'success', message: 'Form settings saved.' });
    } else {
      setNotice({
        tone: 'error',
        message: typeof result.payload === 'string' ? result.payload : 'Failed to save form settings.',
      });
    }
  };

  if (!siteId) {
    return null;
  }

  return (
    <WebsiteConsoleLayout
      siteId={siteId}
      overview={overview}
      title="Manage connected public form blocks discovered from the linked template."
      subtitle="Changes here merge over the builder-authored component config and affect public submissions immediately."
    >
      <div className="space-y-6">
        {error ? (
          <WebsiteConsoleNotice
            tone="error"
            message={error}
            onDismiss={() => dispatch(clearWebsitesError())}
          />
        ) : null}
        {notice ? (
          <WebsiteConsoleNotice
            tone={notice.tone}
            message={notice.message}
            onDismiss={() => setNotice(null)}
          />
        ) : null}

        {isLoading && forms.length === 0 ? (
          <div className="rounded-3xl border border-app-border bg-app-surface p-8 text-center text-app-text-muted">
            Loading connected forms...
          </div>
        ) : null}

        {!isLoading && groupedForms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-app-border bg-app-surface p-8 text-center text-app-text-muted">
            No connected website forms were discovered in the linked template yet.
          </div>
        ) : null}

        {groupedForms.map(([pageName, pageForms]) => (
          <section
            key={pageName}
            className="rounded-3xl border border-app-border bg-app-surface p-5"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-app-text">{pageName}</h2>
              <p className="text-sm text-app-text-muted">
                {pageForms.length} connected surface{pageForms.length === 1 ? '' : 's'} on this page
              </p>
            </div>

            <div className="space-y-4">
              {pageForms.map((form) => {
                const draft = drafts[form.formKey] || {};
                const tagsValue = (draft.defaultTags || []).join(', ');

                return (
                  <article
                    key={form.formKey}
                    className="rounded-2xl border border-app-border bg-app-surface-muted p-4"
                  >
                    <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-app-text">{form.title}</div>
                        <div className="text-sm text-app-text-muted">
                          {form.formType} • {form.path}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isSaving || Boolean(form.blocked)}
                        onClick={() => saveForm(form.formKey)}
                        className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Save form settings
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        type="text"
                        value={draft.heading || ''}
                        onChange={(event) =>
                          updateDraft(form.formKey, { heading: event.target.value })
                        }
                        placeholder="Heading override"
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                      />
                      <input
                        type="text"
                        value={draft.successMessage || ''}
                        onChange={(event) =>
                          updateDraft(form.formKey, { successMessage: event.target.value })
                        }
                        placeholder="Success message"
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                      />
                      <input
                        type="text"
                        value={draft.submitText || draft.buttonText || ''}
                        onChange={(event) =>
                          updateDraft(form.formKey, {
                            submitText: event.target.value,
                            buttonText: event.target.value,
                          })
                        }
                        placeholder="Primary button text"
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                      />
                      <input
                        type="text"
                        value={draft.accountId || ''}
                        onChange={(event) =>
                          updateDraft(form.formKey, { accountId: event.target.value || null })
                        }
                        placeholder="Destination account ID"
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                      />
                      <input
                        type="text"
                        value={tagsValue}
                        onChange={(event) =>
                          updateDraft(form.formKey, {
                            defaultTags: event.target.value
                              .split(',')
                              .map((value) => value.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Default tags (comma separated)"
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm md:col-span-2"
                      />
                      <textarea
                        value={draft.description || ''}
                        onChange={(event) =>
                          updateDraft(form.formKey, { description: event.target.value })
                        }
                        placeholder="Operational description or helper copy"
                        rows={3}
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm md:col-span-2"
                      />
                    </div>

                    {form.formType === 'newsletter-signup' ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <input
                          type="text"
                          value={draft.mailchimpListId || ''}
                          onChange={(event) =>
                            updateDraft(form.formKey, {
                              mailchimpListId: event.target.value || null,
                            })
                          }
                          placeholder="Mailchimp audience ID"
                          className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                        />
                        <select
                          value={draft.audienceMode || 'crm'}
                          onChange={(event) =>
                            updateDraft(form.formKey, {
                              audienceMode: event.target.value as 'crm' | 'mailchimp' | 'both',
                            })
                          }
                          className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                        >
                          <option value="crm">CRM only</option>
                          <option value="mailchimp">Mailchimp only</option>
                          <option value="both">CRM + Mailchimp</option>
                        </select>
                      </div>
                    ) : null}

                    {form.formType === 'donation-form' ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <input
                          type="text"
                          value={draft.currency || ''}
                          onChange={(event) =>
                            updateDraft(form.formKey, { currency: event.target.value })
                          }
                          placeholder="Currency (USD, CAD)"
                          className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                        />
                        <input
                          type="text"
                          value={draft.campaignId || ''}
                          onChange={(event) =>
                            updateDraft(form.formKey, { campaignId: event.target.value || null })
                          }
                          placeholder="Campaign identifier"
                          className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                        />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </WebsiteConsoleLayout>
  );
};

export default WebsiteFormsPage;
