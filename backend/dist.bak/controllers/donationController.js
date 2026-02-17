"use strict";
/**
 * Donation Controller
 * HTTP handlers for donation management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationController = void 0;
const donationService_1 = __importDefault(require("../services/donationService"));
const queryHelpers_1 = require("../utils/queryHelpers");
const responseHelpers_1 = require("../utils/responseHelpers");
class DonationController {
    /**
     * Get all donations
     */
    async getDonations(req, res, next) {
        try {
            const filters = {
                search: (0, queryHelpers_1.getString)(req.query.search),
                account_id: (0, queryHelpers_1.getString)(req.query.account_id),
                contact_id: (0, queryHelpers_1.getString)(req.query.contact_id),
                payment_method: (0, queryHelpers_1.getString)(req.query.payment_method),
                payment_status: (0, queryHelpers_1.getString)(req.query.payment_status),
                campaign_name: (0, queryHelpers_1.getString)(req.query.campaign_name),
                is_recurring: (0, queryHelpers_1.getBoolean)(req.query.is_recurring),
                min_amount: (0, queryHelpers_1.getNumber)(req.query.min_amount),
                max_amount: (0, queryHelpers_1.getNumber)(req.query.max_amount),
                start_date: (0, queryHelpers_1.getString)(req.query.start_date),
                end_date: (0, queryHelpers_1.getString)(req.query.end_date),
            };
            const pagination = {
                page: (0, queryHelpers_1.getString)(req.query.page) ? parseInt(req.query.page) : 1,
                limit: (0, queryHelpers_1.getString)(req.query.limit) ? parseInt(req.query.limit) : 20,
                sort_by: (0, queryHelpers_1.getString)(req.query.sort_by),
                sort_order: (0, queryHelpers_1.getString)(req.query.sort_order),
            };
            const scope = req.dataScope?.filter;
            const result = await donationService_1.default.getDonations(filters, pagination, scope);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get donation by ID
     */
    async getDonationById(req, res, next) {
        try {
            const scope = req.dataScope?.filter;
            const donation = await donationService_1.default.getDonationById(req.params.id, scope);
            if (!donation) {
                (0, responseHelpers_1.notFound)(res, 'Donation');
                return;
            }
            res.json(donation);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create new donation
     */
    async createDonation(req, res, next) {
        try {
            const donationData = req.body;
            const userId = req.user.id;
            const donation = await donationService_1.default.createDonation(donationData, userId);
            res.status(201).json(donation);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update donation
     */
    async updateDonation(req, res, next) {
        try {
            const donationData = req.body;
            const userId = req.user.id;
            const donation = await donationService_1.default.updateDonation(req.params.id, donationData, userId);
            if (!donation) {
                (0, responseHelpers_1.notFound)(res, 'Donation');
                return;
            }
            res.json(donation);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete donation
     */
    async deleteDonation(req, res, next) {
        try {
            const deleted = await donationService_1.default.deleteDonation(req.params.id);
            if (!deleted) {
                (0, responseHelpers_1.notFound)(res, 'Donation');
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Mark receipt as sent
     */
    async markReceiptSent(req, res, next) {
        try {
            const userId = req.user.id;
            const donation = await donationService_1.default.markReceiptSent(req.params.id, userId);
            res.json(donation);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get donation summary statistics
     */
    async getDonationSummary(req, res, next) {
        try {
            const filters = {
                account_id: (0, queryHelpers_1.getString)(req.query.account_id),
                contact_id: (0, queryHelpers_1.getString)(req.query.contact_id),
                start_date: (0, queryHelpers_1.getString)(req.query.start_date),
                end_date: (0, queryHelpers_1.getString)(req.query.end_date),
            };
            const scope = req.dataScope?.filter;
            const summary = await donationService_1.default.getDonationSummary(filters, scope);
            res.json(summary);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DonationController = DonationController;
exports.default = new DonationController();
//# sourceMappingURL=donationController.js.map