"use strict";
/**
 * Account Type Definitions
 * Aligned with Microsoft Common Data Model (CDM) Account entity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountCategory = exports.AccountType = void 0;
var AccountType;
(function (AccountType) {
    AccountType["ORGANIZATION"] = "organization";
    AccountType["INDIVIDUAL"] = "individual";
})(AccountType || (exports.AccountType = AccountType = {}));
var AccountCategory;
(function (AccountCategory) {
    AccountCategory["DONOR"] = "donor";
    AccountCategory["VOLUNTEER"] = "volunteer";
    AccountCategory["PARTNER"] = "partner";
    AccountCategory["VENDOR"] = "vendor";
    AccountCategory["BENEFICIARY"] = "beneficiary";
    AccountCategory["OTHER"] = "other";
})(AccountCategory || (exports.AccountCategory = AccountCategory = {}));
//# sourceMappingURL=account.js.map