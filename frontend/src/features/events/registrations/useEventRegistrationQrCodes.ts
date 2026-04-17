import { useEffect, useState } from 'react';
import type { EventRegistration } from '../../../types/event';

export function useEventRegistrationQrCodes(registrations: EventRegistration[]): Record<string, string> {
  const [qrCodesByRegistration, setQrCodesByRegistration] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const generateCodes = async () => {
      const registrationsWithTokens = registrations.filter((registration) => registration.check_in_token);
      if (registrationsWithTokens.length === 0) {
        if (!cancelled) {
          setQrCodesByRegistration({});
        }
        return;
      }

      try {
        const { toDataURL } = await import('qrcode');
        const entries = await Promise.all(
          registrations.map(async (registration) => {
            if (!registration.check_in_token) {
              return [registration.registration_id, ''] as const;
            }

            try {
              const dataUrl = await toDataURL(registration.check_in_token, {
                width: 96,
                margin: 1,
              });
              return [registration.registration_id, dataUrl] as const;
            } catch {
              return [registration.registration_id, ''] as const;
            }
          })
        );

        if (cancelled) {
          return;
        }

        setQrCodesByRegistration(
          entries.reduce<Record<string, string>>((accumulator, [registrationId, dataUrl]) => {
            if (dataUrl) {
              accumulator[registrationId] = dataUrl;
            }
            return accumulator;
          }, {})
        );
      } catch {
        if (!cancelled) {
          setQrCodesByRegistration({});
        }
      }
    };

    void generateCodes();

    return () => {
      cancelled = true;
    };
  }, [registrations]);

  return qrCodesByRegistration;
}
