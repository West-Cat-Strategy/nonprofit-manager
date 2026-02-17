/**
 * Donation Controller
 * HTTP handlers for donation management
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class DonationController {
    /**
     * Get all donations
     */
    getDonations(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get donation by ID
     */
    getDonationById(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Create new donation
     */
    createDonation(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Update donation
     */
    updateDonation(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Delete donation
     */
    deleteDonation(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Mark receipt as sent
     */
    markReceiptSent(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get donation summary statistics
     */
    getDonationSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: DonationController;
export default _default;
//# sourceMappingURL=donationController.d.ts.map