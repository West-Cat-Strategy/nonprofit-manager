/**
 * Contact Relationship Service Tests
 * Unit tests for managing relationships between contacts
 */

import pool from '../../config/database';
import * as contactRelationshipService from '../../services/contactRelationshipService';
import { logger } from '../../config/logger';

// Mock database pool and logger
jest.mock('../../config/database', () => ({
    __esModule: true,
    default: {
        query: jest.fn(),
        connect: jest.fn(),
    },
}));

jest.mock('../../config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

const mockQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;

describe('ContactRelationshipService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getContactRelationships', () => {
        it('returns active relationships for a contact', async () => {
            const mockRows = [{ id: 'rel1', contact_id: 'c1', relationship_type: 'Family' }];
            mockQuery.mockResolvedValueOnce({ rows: mockRows });

            const result = await contactRelationshipService.getContactRelationships('c1');

            expect(result).toEqual(mockRows);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE cr.contact_id = $1'), ['c1']);
        });

        it('throws error on database failure', async () => {
            mockQuery.mockRejectedValueOnce(new Error('DB Error'));

            await expect(contactRelationshipService.getContactRelationships('c1')).rejects.toThrow('Failed to retrieve contact relationships');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('createContactRelationship', () => {
        let mockClient: any;

        beforeEach(() => {
            mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };
            mockConnect.mockResolvedValue(mockClient);
        });

        it('creates a unidirectional relationship successfully', async () => {
            const mockRel = { id: 'rel1', contact_id: 'c1', related_contact_id: 'c2' };
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [mockRel] }) // INSERT primary
                .mockResolvedValueOnce({}); // COMMIT

            const data = {
                related_contact_id: 'c2',
                relationship_type: 'Friend',
                is_bidirectional: false,
            };

            const result = await contactRelationshipService.createContactRelationship('c1', data, 'user1');

            expect(result).toEqual(mockRel);
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('BEGIN'));
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('COMMIT'));
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('creates a bidirectional relationship with inverse', async () => {
            const mockRel = { id: 'rel1', contact_id: 'c1', related_contact_id: 'c2' };
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [mockRel] }) // INSERT primary
                .mockResolvedValueOnce({}) // INSERT inverse
                .mockResolvedValueOnce({}); // COMMIT

            const data = {
                related_contact_id: 'c2',
                relationship_type: 'Parent',
                relationship_label: 'Mother',
                is_bidirectional: true,
                inverse_relationship_type: 'Child',
            };

            const result = await contactRelationshipService.createContactRelationship('c1', data, 'user1');

            expect(result).toEqual(mockRel);
            expect(mockClient.query).toHaveBeenCalledTimes(4); // BEGIN, INSERT, INSERT, COMMIT
            // Check inverse label logic implicitly via the call count/structure
        });

        it('handles rollback on error', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockRejectedValueOnce(new Error('Fail')); // INSERT fails

            const data = { related_contact_id: 'c2', relationship_type: 'X' };

            await expect(contactRelationshipService.createContactRelationship('c1', data as any, 'user1')).rejects.toThrow('Failed to create contact relationship');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('updateContactRelationship', () => {
        it('updates fields correctly', async () => {
            const updated = { id: 'rel1', notes: 'Updated notes' };
            mockQuery.mockResolvedValueOnce({ rows: [updated] });

            const result = await contactRelationshipService.updateContactRelationship('rel1', { notes: 'Updated notes' }, 'user1');

            expect(result).toEqual(updated);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('notes = $1'), expect.arrayContaining(['Updated notes', 'user1', 'rel1']));
        });

        it('returns null if relationship not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const result = await contactRelationshipService.updateContactRelationship('rel1', { notes: 'X' }, 'user1');

            expect(result).toBeNull();
        });
    });

    describe('deleteContactRelationship', () => {
        it('soft deletes by setting is_active to false', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rel1' }] });

            const result = await contactRelationshipService.deleteContactRelationship('rel1');

            expect(result).toBe(true);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SET is_active = false'), ['rel1']);
        });
    });
});
