import { createGrantsApplicationHandlers } from './grantsControllerApplications';
import { createGrantsAwardHandlers } from './grantsControllerAwards';
import { createGrantsOverviewHandlers } from './grantsControllerOverview';
import { createGrantsPortfolioHandlers } from './grantsControllerPortfolio';
import { createGrantsReportingHandlers } from './grantsControllerReporting';
import { createGrantsControllerContext } from './grantsControllerShared';

export const createGrantsController = () => {
  const context = createGrantsControllerContext();

  return {
    ...createGrantsOverviewHandlers(context),
    ...createGrantsPortfolioHandlers(context),
    ...createGrantsApplicationHandlers(context),
    ...createGrantsAwardHandlers(context),
    ...createGrantsReportingHandlers(context),
  };
};

export type GrantsController = ReturnType<typeof createGrantsController>;
