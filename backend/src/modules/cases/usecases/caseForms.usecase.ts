import pool from '@config/database';
import type { CaseFormsRepository } from '../repositories/caseFormsRepository';
import {
  createPortalCaseFormsFacade,
  type PortalCaseFormsFacade,
} from './caseForms.usecase.portal';
import {
  createPublicCaseFormsFacade,
  type PublicCaseFormsFacade,
} from './caseForms.usecase.public';
import {
  createStaffCaseFormsFacade,
  type StaffCaseFormsFacade,
} from './caseForms.usecase.staff';

export type CaseFormsUseCaseFacade =
  StaffCaseFormsFacade
  & PortalCaseFormsFacade
  & PublicCaseFormsFacade;

type StaffDb = Parameters<typeof createStaffCaseFormsFacade>[1];

const createCaseFormsUseCaseFacade = (
  repository: CaseFormsRepository,
  db: StaffDb
): CaseFormsUseCaseFacade => ({
  ...createStaffCaseFormsFacade(repository, db),
  ...createPortalCaseFormsFacade(repository),
  ...createPublicCaseFormsFacade(repository),
});

export class CaseFormsUseCase {
  declare readonly listDefaults: CaseFormsUseCaseFacade['listDefaults'];
  declare readonly createDefault: CaseFormsUseCaseFacade['createDefault'];
  declare readonly updateDefault: CaseFormsUseCaseFacade['updateDefault'];
  declare readonly listTemplates: CaseFormsUseCaseFacade['listTemplates'];
  declare readonly createTemplate: CaseFormsUseCaseFacade['createTemplate'];
  declare readonly autosaveTemplate: CaseFormsUseCaseFacade['autosaveTemplate'];
  declare readonly saveAssignmentAsTemplate: CaseFormsUseCaseFacade['saveAssignmentAsTemplate'];
  declare readonly listRecommendedDefaults: CaseFormsUseCaseFacade['listRecommendedDefaults'];
  declare readonly listAssignmentsForCase: CaseFormsUseCaseFacade['listAssignmentsForCase'];
  declare readonly createAssignment: CaseFormsUseCaseFacade['createAssignment'];
  declare readonly instantiateDefault: CaseFormsUseCaseFacade['instantiateDefault'];
  declare readonly getAssignmentDetailForCase: CaseFormsUseCaseFacade['getAssignmentDetailForCase'];
  declare readonly updateAssignmentForCase: CaseFormsUseCaseFacade['updateAssignmentForCase'];
  declare readonly uploadAssetForCase: CaseFormsUseCaseFacade['uploadAssetForCase'];
  declare readonly saveDraftForCase: CaseFormsUseCaseFacade['saveDraftForCase'];
  declare readonly submitForCase: CaseFormsUseCaseFacade['submitForCase'];
  declare readonly sendAssignment: CaseFormsUseCaseFacade['sendAssignment'];
  declare readonly reviewAssignment: CaseFormsUseCaseFacade['reviewAssignment'];
  declare readonly getResponsePacketForCase: CaseFormsUseCaseFacade['getResponsePacketForCase'];
  declare readonly getAssetForCase: CaseFormsUseCaseFacade['getAssetForCase'];
  declare readonly listAssignmentsForPortal: CaseFormsUseCaseFacade['listAssignmentsForPortal'];
  declare readonly getAssignmentDetailForPortal: CaseFormsUseCaseFacade['getAssignmentDetailForPortal'];
  declare readonly uploadAssetForPortal: CaseFormsUseCaseFacade['uploadAssetForPortal'];
  declare readonly saveDraftForPortal: CaseFormsUseCaseFacade['saveDraftForPortal'];
  declare readonly submitForPortal: CaseFormsUseCaseFacade['submitForPortal'];
  declare readonly getResponsePacketForPortal: CaseFormsUseCaseFacade['getResponsePacketForPortal'];
  declare readonly getAssignmentDetailByToken: CaseFormsUseCaseFacade['getAssignmentDetailByToken'];
  declare readonly uploadAssetByToken: CaseFormsUseCaseFacade['uploadAssetByToken'];
  declare readonly saveDraftByToken: CaseFormsUseCaseFacade['saveDraftByToken'];
  declare readonly submitByToken: CaseFormsUseCaseFacade['submitByToken'];
  declare readonly getResponsePacketByToken: CaseFormsUseCaseFacade['getResponsePacketByToken'];

  constructor(repository: CaseFormsRepository, db: StaffDb = pool) {
    Object.assign(this, createCaseFormsUseCaseFacade(repository, db));
  }
}
