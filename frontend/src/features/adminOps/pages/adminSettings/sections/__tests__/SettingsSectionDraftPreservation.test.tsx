import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmailSettingsSection from '../EmailSettingsSection';
import TwilioSettingsSection from '../TwilioSettingsSection';
import api from '../../../../../../services/api';

const { mockedApi, toastSpy } = vi.hoisted(() => ({
  mockedApi: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
  toastSpy: {
    showSuccess: vi.fn(),
    showError: vi.fn(),
  },
}));

vi.mock('../../../../../../services/api', () => ({
  default: mockedApi,
}));

vi.mock('../../../../../../contexts/useToast', () => ({
  useToast: () => toastSpy,
}));

vi.mock('../../../../../../hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}));

const mockedApiClient = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const seedCache = (key: string, value: unknown) => {
  sessionStorage.setItem(
    key,
    JSON.stringify({
      ...value,
      cachedAt: Date.now(),
    })
  );
};

const buildFreshInstallEmailSettings = () => ({
  id: 'email-settings',
  smtpHost: null,
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: null,
  smtpFromAddress: null,
  smtpFromName: null,
  imapHost: null,
  imapPort: 993,
  imapSecure: true,
  imapUser: null,
  isConfigured: false,
  lastTestedAt: null,
  lastTestSuccess: null,
});

describe('settings section draft preservation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('renders safer SMTP defaults and guidance for the seeded fresh-install row', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        data: buildFreshInstallEmailSettings(),
        credentials: {
          smtp: false,
          imap: false,
        },
      },
    });

    render(<EmailSettingsSection />);

    await screen.findByText('Email is not configured');

    expect(screen.getByDisplayValue('587')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/use tls \/ ssl/i)[0]).not.toBeChecked();
    expect(
      screen.getByText(/Ports 587, 25, and 2525 usually use STARTTLS with TLS \/ SSL unchecked\./i)
    ).toBeInTheDocument();
  });

  it('shows non-blocking warnings for risky SMTP port and TLS combinations', async () => {
    const user = userEvent.setup();

    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        data: buildFreshInstallEmailSettings(),
        credentials: {
          smtp: false,
          imap: false,
        },
      },
    });

    render(<EmailSettingsSection />);

    await screen.findByText('Email is not configured');

    const smtpPortInput = screen.getByDisplayValue('587');
    const secureToggle = screen.getAllByLabelText(/use tls \/ ssl/i)[0];

    expect(screen.queryByText(/check this smtp pairing\./i)).not.toBeInTheDocument();

    await user.click(secureToggle);
    expect(screen.getByText(/check this smtp pairing\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/Port 587 usually uses STARTTLS, so leave TLS \/ SSL unchecked/i)
    ).toBeInTheDocument();

    await user.click(secureToggle);
    expect(screen.queryByText(/check this smtp pairing\./i)).not.toBeInTheDocument();

    await user.clear(smtpPortInput);
    await user.type(smtpPortInput, '465');
    expect(screen.getByText(/check this smtp pairing\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/Port 465 usually expects an implicit TLS connection/i)
    ).toBeInTheDocument();

    await user.click(secureToggle);
    expect(screen.queryByText(/check this smtp pairing\./i)).not.toBeInTheDocument();
  });

  it('preserves email drafts during background refresh and rehydrates after save', async () => {
    const user = userEvent.setup();
    const backgroundFetch = createDeferred<{
      data: {
        data: {
          id: string;
          smtpHost: string;
          smtpPort: number;
          smtpSecure: boolean;
          smtpUser: string;
          smtpFromAddress: string;
          smtpFromName: string;
          imapHost: string;
          imapPort: number;
          imapSecure: boolean;
          imapUser: string;
          isConfigured: boolean;
          lastTestedAt: string;
          lastTestSuccess: boolean;
        };
        credentials: {
          smtp: boolean;
          imap: boolean;
        };
      };
    }>();

    seedCache('admin_email_settings_cache_v1', {
      settings: {
        id: 'email-settings',
        smtpHost: 'cached.smtp.example.com',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'cached-user',
        smtpFromAddress: 'cached@example.com',
        smtpFromName: 'Cached Mailer',
        imapHost: 'cached.imap.example.com',
        imapPort: 993,
        imapSecure: true,
        imapUser: 'cached-imap-user',
        isConfigured: true,
        lastTestedAt: null,
        lastTestSuccess: null,
      },
      credentials: {
        smtp: false,
        imap: false,
      },
    });

    mockedApiClient.get
      .mockImplementationOnce(() => backgroundFetch.promise)
      .mockResolvedValueOnce({
        data: {
          data: {
            id: 'email-settings',
            smtpHost: 'saved.smtp.example.com',
            smtpPort: 2525,
            smtpSecure: false,
            smtpUser: 'saved-user',
            smtpFromAddress: 'saved@example.com',
            smtpFromName: 'Saved Mailer',
            imapHost: 'saved.imap.example.com',
            imapPort: 143,
            imapSecure: false,
            imapUser: 'saved-imap-user',
            isConfigured: true,
            lastTestedAt: '2026-03-11T20:45:00.000Z',
            lastTestSuccess: true,
          },
          credentials: {
            smtp: true,
            imap: true,
          },
        },
      });
    mockedApiClient.put.mockResolvedValue({ data: {} });

    render(<EmailSettingsSection />);

    const smtpHostInput = await screen.findByPlaceholderText('smtp.example.com');
    expect(smtpHostInput).toHaveValue('cached.smtp.example.com');

    await user.clear(smtpHostInput);
    await user.type(smtpHostInput, 'draft.smtp.example.com');

    await act(async () => {
      backgroundFetch.resolve({
        data: {
          data: {
            id: 'email-settings',
            smtpHost: 'fresh.smtp.example.com',
            smtpPort: 2525,
            smtpSecure: false,
            smtpUser: 'fresh-user',
            smtpFromAddress: 'fresh@example.com',
            smtpFromName: 'Fresh Mailer',
            imapHost: 'fresh.imap.example.com',
            imapPort: 143,
            imapSecure: false,
            imapUser: 'fresh-imap-user',
            isConfigured: true,
            lastTestedAt: '2026-03-11T20:30:00.000Z',
            lastTestSuccess: true,
          },
          credentials: {
            smtp: true,
            imap: true,
          },
        },
      });
      await backgroundFetch.promise;
    });

    await waitFor(() => {
      expect(screen.getByText(/last tested:/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText('(stored)')).toHaveLength(2);
    expect(smtpHostInput).toHaveValue('draft.smtp.example.com');

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/admin/email-settings',
        expect.objectContaining({
          smtpHost: 'draft.smtp.example.com',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('smtp.example.com')).toHaveValue('saved.smtp.example.com');
    });
  });

  it('preserves Twilio drafts during background refresh and rehydrates after a connection test', async () => {
    const user = userEvent.setup();
    const backgroundFetch = createDeferred<{
      data: {
        data: {
          id: string;
          accountSid: string;
          messagingServiceSid: string;
          fromPhoneNumber: string;
          isConfigured: boolean;
          lastTestedAt: string;
          lastTestSuccess: boolean;
        };
        credentials: {
          authToken: boolean;
        };
      };
    }>();

    seedCache('admin_twilio_settings_cache_v1', {
      settings: {
        id: 'twilio-settings',
        accountSid: 'ACcached',
        messagingServiceSid: 'MGcached',
        fromPhoneNumber: '+15550000001',
        isConfigured: true,
        lastTestedAt: null,
        lastTestSuccess: null,
      },
      credentials: {
        authToken: false,
      },
    });

    mockedApiClient.get
      .mockImplementationOnce(() => backgroundFetch.promise)
      .mockResolvedValueOnce({
        data: {
          data: {
            id: 'twilio-settings',
            accountSid: 'ACsaved',
            messagingServiceSid: 'MGsaved',
            fromPhoneNumber: '+15550000009',
            isConfigured: true,
            lastTestedAt: '2026-03-11T20:55:00.000Z',
            lastTestSuccess: true,
          },
          credentials: {
            authToken: true,
          },
        },
      });
    mockedApiClient.post.mockResolvedValue({
      data: {
        data: {
          success: true,
        },
      },
    });

    render(<TwilioSettingsSection />);

    const accountSidInput = await screen.findByPlaceholderText(
      'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    );
    expect(accountSidInput).toHaveValue('ACcached');

    await user.clear(accountSidInput);
    await user.type(accountSidInput, 'ACdraft');

    await act(async () => {
      backgroundFetch.resolve({
        data: {
          data: {
            id: 'twilio-settings',
            accountSid: 'ACfresh',
            messagingServiceSid: 'MGfresh',
            fromPhoneNumber: '+15550000008',
            isConfigured: true,
            lastTestedAt: '2026-03-11T20:40:00.000Z',
            lastTestSuccess: true,
          },
          credentials: {
            authToken: true,
          },
        },
      });
      await backgroundFetch.promise;
    });

    await waitFor(() => {
      expect(screen.getByText(/last tested:/i)).toBeInTheDocument();
    });
    expect(screen.getByText('(stored)')).toBeInTheDocument();
    expect(accountSidInput).toHaveValue('ACdraft');

    await user.click(screen.getByRole('button', { name: /test twilio connection/i }));

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith('/admin/twilio-settings/test');
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toHaveValue(
        'ACsaved'
      );
    });
  });
});
