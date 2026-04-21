import type {
  MessageSendState as RootMessageSendState,
  TemplateTheme as RootTemplateTheme,
} from '@nonprofit-manager/contracts';
import type { MessageSendState as MessagingMessageSendState } from '@nonprofit-manager/contracts/messaging';
import type { TemplateTheme as WebsiteBuilderTemplateTheme } from '@nonprofit-manager/contracts/websiteBuilder';

type AssertAssignable<Expected, Actual extends Expected> = true;

export type ContractsExportSmokeCheck = [
  AssertAssignable<MessagingMessageSendState, RootMessageSendState>,
  AssertAssignable<RootMessageSendState, MessagingMessageSendState>,
  AssertAssignable<WebsiteBuilderTemplateTheme, RootTemplateTheme>,
  AssertAssignable<RootTemplateTheme, WebsiteBuilderTemplateTheme>,
];
