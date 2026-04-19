export * from './portalMessagingService.types';

export {
  addPortalMessage,
  addStaffMessage,
  createPortalThreadWithMessage,
  markPortalThreadRead,
  markStaffThreadRead,
  updateThread,
} from './portalMessagingService.command';

export {
  listPortalThreads,
  listStaffThreads,
  getPortalThread,
  getStaffThread,
  listCaseThreads,
} from './portalMessagingService.query';

export { ensurePortalCaseMessageable } from './portalMessagingService.validation';
