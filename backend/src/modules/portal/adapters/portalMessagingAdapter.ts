import {
  addPortalMessage,
  createPortalThreadWithMessage,
  getPortalThread,
  listPortalThreads,
  markPortalThreadRead,
  updateThread,
} from '@services/portalMessagingService';
import type { PortalMessagingPort } from '../types/ports';

export const createPortalMessagingAdapter = (): PortalMessagingPort => ({
  listPortalThreads,
  createThreadWithMessage: createPortalThreadWithMessage,
  getPortalThread,
  addPortalMessage,
  markPortalThreadRead,
  updateThread,
});
