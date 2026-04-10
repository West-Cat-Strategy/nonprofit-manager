export interface TwilioSettings {
  id: string;
  accountSid: string | null;
  messagingServiceSid: string | null;
  fromPhoneNumber: string | null;
  isConfigured: boolean;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
}

export interface TwilioCredentials {
  authToken: boolean;
}

export interface TwilioSettingsApiData {
  data: TwilioSettings | null;
  credentials: TwilioCredentials;
}

export interface TwilioTestResult {
  success: boolean;
  error?: string;
}

export interface TwilioTestApiData {
  data: TwilioTestResult;
  message: string;
}
