/**
 * Donation Service
 * Business logic for donation management
 */
import { Pool } from 'pg';
import { Donation, CreateDonationDTO, UpdateDonationDTO, DonationFilters, PaginationParams, PaginatedDonations, DonationSummary } from '../types/donation';
import type { DataScopeFilter } from '../types/dataScope';
export declare class DonationService {
    private pool;
    constructor(pool: Pool);
    /**
     * Generate unique donation number (DON-YYMMDD-XXXXX)
     */
    private generateDonationNumber;
    /**
     * Get all donations with filtering and pagination
     */
    getDonations(filters?: DonationFilters, pagination?: PaginationParams, scope?: DataScopeFilter): Promise<PaginatedDonations>;
    /**
     * Get donation by ID
     */
    getDonationById(donationId: string, scope?: DataScopeFilter): Promise<Donation | null>;
    /**
     * Create new donation
     */
    createDonation(donationData: CreateDonationDTO, userId: string): Promise<Donation>;
    /**
     * Update donation
     */
    updateDonation(donationId: string, donationData: UpdateDonationDTO, userId: string): Promise<Donation>;
    /**
     * Delete donation
     */
    deleteDonation(donationId: string): Promise<boolean>;
    /**
     * Mark receipt as sent
     */
    markReceiptSent(donationId: string, userId: string): Promise<Donation>;
    /**
     * Get donation summary statistics
     */
    getDonationSummary(filters?: DonationFilters, scope?: DataScopeFilter): Promise<DonationSummary>;
}
declare const _default: DonationService;
export default _default;
//# sourceMappingURL=donationService.d.ts.map