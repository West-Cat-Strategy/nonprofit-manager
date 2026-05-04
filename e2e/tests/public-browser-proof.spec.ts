import {
  expect,
  publicBrowserProofArtifacts,
  test,
} from '../fixtures/publicBrowserProof.fixture';

const unwrapBody = <T>(body: unknown): T =>
  ((body as { data?: T } | undefined)?.data ?? body) as T;

async function readSuccessBody<T>(response: import('@playwright/test').Response): Promise<T> {
  const raw = await response.text();
  expect(response.ok(), `Public submission failed (${response.status()}): ${raw}`).toBeTruthy();
  return unwrapBody<T>(JSON.parse(raw));
}

async function submitNamedPublicForm(input: {
  page: import('@playwright/test').Page;
  buttonName: RegExp;
  expectedUrlPart: string;
  fill: (form: import('@playwright/test').Locator) => Promise<void>;
}): Promise<import('@playwright/test').Response> {
  const form = input.page
    .locator('form[data-public-site-form="true"]')
    .filter({ has: input.page.getByRole('button', { name: input.buttonName }) });
  await expect(form).toHaveCount(1);
  await input.fill(form);

  const responsePromise = input.page.waitForResponse((response) => {
    return (
      response.request().method() === 'POST' &&
      response.url().includes(input.expectedUrlPart)
    );
  });
  await form.getByRole('button', { name: input.buttonName }).click();
  return responsePromise;
}

test.describe('Public browser proof coverage', () => {
  test('submits managed forms, event registration, donation checkout, and public action blocks from public pages', async ({
    authenticatedPage,
    publicBrowserProofSite,
  }) => {
    test.setTimeout(180000);

    await authenticatedPage.goto(`${publicBrowserProofSite.publicBase}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Public browser proof' })
    ).toBeVisible();

    const managedResponse = await submitNamedPublicForm({
      page: authenticatedPage,
      buttonName: /send proof message/i,
      expectedUrlPart: `/api/v2/public/forms/${publicBrowserProofSite.siteId}/managed-contact-proof/submit`,
      fill: async (form) => {
        await form.locator('input[name="first_name"]').fill('Morgan');
        await form.locator('input[name="last_name"]').fill('Bailey');
        await form.locator('input[name="email"]').fill(`managed-${Date.now()}@example.com`);
        await form.locator('input[name="phone"]').fill('(604) 555-0101');
        await form.locator('textarea[name="message"]').fill('Managed form browser proof.');
      },
    });
    const managedBody = await readSuccessBody<{ contactId?: string; message?: string }>(
      managedResponse
    );
    expect(managedBody.message).toBe('Managed form proof recorded.');
    expect(managedBody.contactId).toBeTruthy();
    if (managedBody.contactId) {
      publicBrowserProofArtifacts.contactIds.push(managedBody.contactId);
    }

    const donationResponse = await submitNamedPublicForm({
      page: authenticatedPage,
      buttonName: /start browser donation/i,
      expectedUrlPart: `/api/v2/public/forms/${publicBrowserProofSite.siteId}/donation-checkout-proof/submit`,
      fill: async (form) => {
        await form.locator('input[name="first_name"]').fill('Dana');
        await form.locator('input[name="last_name"]').fill('Nguyen');
        await form.locator('input[name="email"]').fill(`donor-${Date.now()}@example.com`);
        await form.locator('input[name="amount"]').fill('50');
      },
    });
    const donationBody = await readSuccessBody<{
      contactId?: string;
      donationId?: string;
      message?: string;
    }>(donationResponse);
    expect(donationBody.message).toBe('Donation checkout proof recorded.');
    expect(donationBody.donationId).toBeTruthy();
    if (donationBody.contactId) {
      publicBrowserProofArtifacts.contactIds.push(donationBody.contactId);
    }
    if (donationBody.donationId) {
      publicBrowserProofArtifacts.donationIds.push(donationBody.donationId);
    }

    const petitionResponse = await submitNamedPublicForm({
      page: authenticatedPage,
      buttonName: /add my public support/i,
      expectedUrlPart: `/api/v2/public/actions/${publicBrowserProofSite.siteId}/${publicBrowserProofSite.actionSlugs.petition}/submissions`,
      fill: async (form) => {
        await form.locator('input[name="first_name"]').fill('Riley');
        await form.locator('input[name="last_name"]').fill('Stone');
        await form.locator('input[name="email"]').fill(`petition-${Date.now()}@example.com`);
        await form.locator('input[name="phone"]').fill('(604) 555-0102');
        await form.locator('textarea[name="message"]').fill('Please keep this service open.');
        await form.locator('input[name="consent"]').check();
      },
    });
    const petitionBody = await readSuccessBody<{
      actionType?: string;
      contactId?: string;
      submissionId?: string;
    }>(petitionResponse);
    expect(petitionBody.actionType).toBe('petition_signature');
    expect(petitionBody.submissionId).toBeTruthy();
    if (petitionBody.contactId) {
      publicBrowserProofArtifacts.contactIds.push(petitionBody.contactId);
    }

    const pledgeResponse = await submitNamedPublicForm({
      page: authenticatedPage,
      buttonName: /record my pledge/i,
      expectedUrlPart: `/api/v2/public/actions/${publicBrowserProofSite.siteId}/${publicBrowserProofSite.actionSlugs.pledge}/submissions`,
      fill: async (form) => {
        await form.locator('input[name="first_name"]').fill('Jordan');
        await form.locator('input[name="last_name"]').fill('Lee');
        await form.locator('input[name="email"]').fill(`pledge-${Date.now()}@example.com`);
        await form.locator('input[name="amount"]').fill('75');
        await form.locator('select[name="schedule"]').selectOption('monthly');
        await form.locator('textarea[name="message"]').fill('I can pledge monthly support.');
        await form.locator('input[name="consent"]').check();
      },
    });
    const pledgeBody = await readSuccessBody<{
      actionType?: string;
      contactId?: string;
      pledgeId?: string;
    }>(pledgeResponse);
    expect(pledgeBody.actionType).toBe('donation_pledge');
    expect(pledgeBody.pledgeId).toBeTruthy();
    if (pledgeBody.contactId) {
      publicBrowserProofArtifacts.contactIds.push(pledgeBody.contactId);
    }

    const letterResponse = await submitNamedPublicForm({
      page: authenticatedPage,
      buttonName: /request support letter/i,
      expectedUrlPart: `/api/v2/public/actions/${publicBrowserProofSite.siteId}/${publicBrowserProofSite.actionSlugs.supportLetter}/submissions`,
      fill: async (form) => {
        await form.locator('input[name="first_name"]').fill('Taylor');
        await form.locator('input[name="last_name"]').fill('Chen');
        await form.locator('input[name="email"]').fill(`letter-${Date.now()}@example.com`);
        await form.locator('input[name="purpose"]').fill('Housing support');
        await form.locator('textarea[name="message"]').fill('Please draft a support letter.');
        await form.locator('input[name="consent"]').check();
      },
    });
    const letterBody = await readSuccessBody<{
      actionType?: string;
      contactId?: string;
      supportLetterId?: string;
    }>(letterResponse);
    expect(letterBody.actionType).toBe('support_letter_request');
    expect(letterBody.supportLetterId).toBeTruthy();
    if (letterBody.contactId) {
      publicBrowserProofArtifacts.contactIds.push(letterBody.contactId);
    }

    await authenticatedPage.goto(
      `${publicBrowserProofSite.publicBase}/events/${publicBrowserProofSite.eventSlug}`,
      { waitUntil: 'domcontentloaded' }
    );
    await expect(
      authenticatedPage.getByRole('heading', { name: /public browser event/i })
    ).toBeVisible();

    const registrationResponse = await submitNamedPublicForm({
      page: authenticatedPage,
      buttonName: /^register$/i,
      expectedUrlPart: `/api/v2/public/events/${publicBrowserProofSite.eventId}/registrations?site=${publicBrowserProofSite.siteId}`,
      fill: async (form) => {
        await form.locator('input[name="first_name"]').fill('Alex');
        await form.locator('input[name="last_name"]').fill('Patel');
        await form.locator('input[name="email"]').fill(`event-${Date.now()}@example.com`);
        await form.locator('input[name="phone"]').fill('(604) 555-0103');
        await form.locator('textarea[name="notes"]').fill('One seat please.');
      },
    });
    const registrationBody = await readSuccessBody<{
      contact_id?: string;
      contactId?: string;
      registration?: {
        registration_id?: string;
        registrationId?: string;
      };
      registration_id?: string;
      registrationId?: string;
    }>(registrationResponse);
    expect(
      registrationBody.registration_id ||
        registrationBody.registrationId ||
        registrationBody.registration?.registration_id ||
        registrationBody.registration?.registrationId
    ).toBeTruthy();
    const registrationContactId = registrationBody.contact_id || registrationBody.contactId;
    if (registrationContactId) {
      publicBrowserProofArtifacts.contactIds.push(registrationContactId);
    }
  });
});
