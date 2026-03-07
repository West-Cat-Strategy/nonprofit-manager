import { followUpController } from './followUps.handlers';

export const createFollowUpsController = () => {
  return {
    getFollowUps: followUpController.getFollowUps,
    getFollowUpSummary: followUpController.getFollowUpSummary,
    getUpcomingFollowUps: followUpController.getUpcomingFollowUps,
    getFollowUpById: followUpController.getFollowUpById,
    createFollowUp: followUpController.createFollowUp,
    updateFollowUp: followUpController.updateFollowUp,
    completeFollowUp: followUpController.completeFollowUp,
    cancelFollowUp: followUpController.cancelFollowUp,
    rescheduleFollowUp: followUpController.rescheduleFollowUp,
    deleteFollowUp: followUpController.deleteFollowUp,
    getCaseFollowUps: followUpController.getCaseFollowUps,
    getTaskFollowUps: followUpController.getTaskFollowUps,
  };
};
