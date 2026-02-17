"use strict";
/**
 * Service Container
 * Centralized dependency injection container for all services
 *
 * This provides a single location for service instantiation, making it easy to:
 * 1. Swap implementations for testing
 * 2. Manage service lifecycles
 * 3. Share database connections
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.services = void 0;
exports.createServiceContainer = createServiceContainer;
const database_1 = __importDefault(require("../config/database"));
// Service imports
const donationService_1 = require("../services/donationService");
const taskService_1 = require("../services/taskService");
const caseService_1 = require("../services/caseService");
const eventService_1 = require("../services/eventService");
const accountService_1 = require("../services/accountService");
const contactService_1 = require("../services/contactService");
const volunteerService_1 = require("../services/volunteerService");
const contactRoleService_1 = require("../services/contactRoleService");
/**
 * Create a service container with the given database pool
 * This allows for easy testing by injecting a mock pool
 */
function createServiceContainer(dbPool = database_1.default) {
    // Cache service instances for reuse
    let donationService = null;
    let taskService = null;
    let caseService = null;
    let eventService = null;
    let accountService = null;
    let contactService = null;
    let volunteerService = null;
    let contactRoleService = null;
    return {
        get pool() {
            return dbPool;
        },
        get donation() {
            if (!donationService) {
                donationService = new donationService_1.DonationService(dbPool);
            }
            return donationService;
        },
        get task() {
            if (!taskService) {
                taskService = new taskService_1.TaskService(dbPool);
            }
            return taskService;
        },
        get case() {
            if (!caseService) {
                caseService = new caseService_1.CaseService(dbPool);
            }
            return caseService;
        },
        get event() {
            if (!eventService) {
                eventService = new eventService_1.EventService(dbPool);
            }
            return eventService;
        },
        get account() {
            if (!accountService) {
                accountService = new accountService_1.AccountService(dbPool);
            }
            return accountService;
        },
        get contact() {
            if (!contactService) {
                contactService = new contactService_1.ContactService(dbPool);
            }
            return contactService;
        },
        get volunteer() {
            if (!volunteerService) {
                volunteerService = new volunteerService_1.VolunteerService(dbPool);
            }
            return volunteerService;
        },
        get contactRole() {
            if (!contactRoleService) {
                contactRoleService = new contactRoleService_1.ContactRoleService(dbPool);
            }
            return contactRoleService;
        },
    };
}
/**
 * Default service container instance
 * Use this for production code
 */
exports.services = createServiceContainer();
//# sourceMappingURL=services.js.map