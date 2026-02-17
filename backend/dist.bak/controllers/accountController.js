"use strict";
/**
 * Account Controller
 * Handles HTTP requests for account management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.updateAccount = exports.createAccount = exports.getAccountContacts = exports.getAccountById = exports.getAccounts = void 0;
const accountService_1 = require("../services/accountService");
const database_1 = __importDefault(require("../config/database"));
const queryHelpers_1 = require("../utils/queryHelpers");
const responseHelpers_1 = require("../utils/responseHelpers");
const accountService = new accountService_1.AccountService(database_1.default);
/**
 * GET /api/accounts
 * Get all accounts with filtering and pagination
 */
const getAccounts = async (req, res, next) => {
    try {
        const filters = {
            search: (0, queryHelpers_1.getString)(req.query.search),
            account_type: (0, queryHelpers_1.getString)(req.query.account_type),
            category: (0, queryHelpers_1.getString)(req.query.category),
            is_active: (0, queryHelpers_1.getBoolean)(req.query.is_active),
        };
        const pagination = {
            page: (0, queryHelpers_1.getString)(req.query.page) ? parseInt(req.query.page) : undefined,
            limit: (0, queryHelpers_1.getString)(req.query.limit) ? parseInt(req.query.limit) : undefined,
            sort_by: (0, queryHelpers_1.getString)(req.query.sort_by),
            sort_order: (0, queryHelpers_1.getString)(req.query.sort_order),
        };
        const scope = req.dataScope?.filter;
        const result = await accountService.getAccounts(filters, pagination, scope);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getAccounts = getAccounts;
/**
 * GET /api/accounts/:id
 * Get account by ID
 */
const getAccountById = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        const result = scope
            ? await accountService.getAccountByIdWithScope(req.params.id, scope)
            : await accountService.getAccountById(req.params.id);
        if (!result) {
            (0, responseHelpers_1.notFound)(res, 'Account');
            return;
        }
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getAccountById = getAccountById;
/**
 * GET /api/accounts/:id/contacts
 * Get contacts for an account
 */
const getAccountContacts = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (scope?.accountIds && !scope.accountIds.includes(req.params.id)) {
            (0, responseHelpers_1.notFound)(res, 'Account');
            return;
        }
        const contacts = await accountService.getAccountContacts(req.params.id);
        res.json(contacts);
    }
    catch (error) {
        next(error);
    }
};
exports.getAccountContacts = getAccountContacts;
/**
 * POST /api/accounts
 * Create new account
 */
const createAccount = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const account = await accountService.createAccount(req.body, userId);
        res.status(201).json(account);
    }
    catch (error) {
        next(error);
    }
};
exports.createAccount = createAccount;
/**
 * PUT /api/accounts/:id
 * Update account
 */
const updateAccount = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (scope) {
            const scopedAccount = await accountService.getAccountByIdWithScope(req.params.id, scope);
            if (!scopedAccount) {
                (0, responseHelpers_1.notFound)(res, 'Account');
                return;
            }
        }
        const userId = req.user.id;
        const account = await accountService.updateAccount(req.params.id, req.body, userId);
        if (!account) {
            (0, responseHelpers_1.notFound)(res, 'Account');
            return;
        }
        res.json(account);
    }
    catch (error) {
        next(error);
    }
};
exports.updateAccount = updateAccount;
/**
 * DELETE /api/accounts/:id
 * Soft delete account
 */
const deleteAccount = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (scope) {
            const scopedAccount = await accountService.getAccountByIdWithScope(req.params.id, scope);
            if (!scopedAccount) {
                (0, responseHelpers_1.notFound)(res, 'Account');
                return;
            }
        }
        const userId = req.user.id;
        const success = await accountService.deleteAccount(req.params.id, userId);
        if (!success) {
            (0, responseHelpers_1.notFound)(res, 'Account');
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteAccount = deleteAccount;
//# sourceMappingURL=accountController.js.map