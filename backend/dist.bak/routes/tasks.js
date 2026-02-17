"use strict";
/**
 * Task Routes
 * API endpoints for task management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const taskController_1 = require("../controllers/taskController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(auth_1.authenticate);
// Validation rules
const createTaskValidation = [
    (0, express_validator_1.body)('subject').trim().notEmpty().withMessage('Subject is required'),
    (0, express_validator_1.body)('description').optional().trim(),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['not_started', 'in_progress', 'waiting', 'completed', 'deferred', 'cancelled'])
        .withMessage('Invalid status'),
    (0, express_validator_1.body)('priority')
        .optional()
        .isIn(['low', 'normal', 'high', 'urgent'])
        .withMessage('Invalid priority'),
    (0, express_validator_1.body)('due_date').optional().isISO8601().withMessage('Invalid date format'),
    (0, express_validator_1.body)('assigned_to').optional().isUUID().withMessage('Invalid user ID'),
    (0, express_validator_1.body)('related_to_type')
        .optional()
        .isIn(['account', 'contact', 'event', 'donation', 'volunteer'])
        .withMessage('Invalid related_to_type'),
    (0, express_validator_1.body)('related_to_id').optional().isUUID().withMessage('Invalid related_to_id'),
];
const updateTaskValidation = [
    (0, express_validator_1.body)('subject').optional().trim().notEmpty().withMessage('Subject cannot be empty'),
    (0, express_validator_1.body)('description').optional().trim(),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['not_started', 'in_progress', 'waiting', 'completed', 'deferred', 'cancelled'])
        .withMessage('Invalid status'),
    (0, express_validator_1.body)('priority')
        .optional()
        .isIn(['low', 'normal', 'high', 'urgent'])
        .withMessage('Invalid priority'),
    (0, express_validator_1.body)('due_date').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
    (0, express_validator_1.body)('completed_date').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
    (0, express_validator_1.body)('assigned_to').optional({ nullable: true }).isUUID().withMessage('Invalid user ID'),
    (0, express_validator_1.body)('related_to_type')
        .optional({ nullable: true })
        .isIn(['account', 'contact', 'event', 'donation', 'volunteer'])
        .withMessage('Invalid related_to_type'),
    (0, express_validator_1.body)('related_to_id').optional({ nullable: true }).isUUID().withMessage('Invalid related_to_id'),
];
const taskQueryValidation = [
    (0, express_validator_1.query)('search').optional().trim(),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['not_started', 'in_progress', 'waiting', 'completed', 'deferred', 'cancelled'])
        .withMessage('Invalid status'),
    (0, express_validator_1.query)('priority')
        .optional()
        .isIn(['low', 'normal', 'high', 'urgent'])
        .withMessage('Invalid priority'),
    (0, express_validator_1.query)('assigned_to').optional().isUUID().withMessage('Invalid user ID'),
    (0, express_validator_1.query)('related_to_type')
        .optional()
        .isIn(['account', 'contact', 'event', 'donation', 'volunteer'])
        .withMessage('Invalid related_to_type'),
    (0, express_validator_1.query)('related_to_id').optional().isUUID().withMessage('Invalid related_to_id'),
    (0, express_validator_1.query)('due_before').optional().isISO8601().withMessage('Invalid date format'),
    (0, express_validator_1.query)('due_after').optional().isISO8601().withMessage('Invalid date format'),
    (0, express_validator_1.query)('overdue').optional().isBoolean().withMessage('Invalid boolean value'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];
const uuidParamValidation = [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid task ID'),
];
// Routes
router.get('/', taskQueryValidation, taskController_1.taskController.getTasks);
router.get('/summary', taskQueryValidation, taskController_1.taskController.getTaskSummary);
router.get('/:id', uuidParamValidation, taskController_1.taskController.getTaskById);
router.post('/', createTaskValidation, taskController_1.taskController.createTask);
router.put('/:id', uuidParamValidation, updateTaskValidation, taskController_1.taskController.updateTask);
router.delete('/:id', uuidParamValidation, taskController_1.taskController.deleteTask);
router.post('/:id/complete', uuidParamValidation, taskController_1.taskController.completeTask);
exports.default = router;
//# sourceMappingURL=tasks.js.map