import { followUpController } from './followUps.handlers';
import { FollowUpsUseCase } from '../usecases/followUps.usecase';
import type { ResponseMode } from '../mappers/responseMode';

export const createFollowUpsController = (
  useCase: FollowUpsUseCase,
  mode: ResponseMode
) => {
  void mode;
  useCase.getDomain();

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
