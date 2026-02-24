import type {
  AuthorizationSubscriberContext,
  AuthorizationSubscriberOutput,
} from '@app-types/authorization';

export interface AuthorizationSubscriber {
  readonly id: string;
  collect(context: AuthorizationSubscriberContext): Promise<AuthorizationSubscriberOutput>;
}
