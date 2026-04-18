/**
 * Contact Relationship Service Tests
 * Unit tests for managing relationships between contacts
 */

import pool from '@config/database';
import * as contactRelationshipService from '../../services/contactRelationshipService';
import { logger } from '@config/logger';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;

const makeRelationshipRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'rel1',
  contact_id: 'c1',
  related_contact_id: 'c2',
  relationship_type: 'friend',
  relationship_label: 'Friend',
  is_bidirectional: false,
  inverse_relationship_type: null,
  notes: 'Original notes',
  is_active: true,
  created_by: 'user1',
  modified_by: 'user1',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
});

describe('ContactRelationshipService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getContactRelationships', () => {
    it('returns active relationships for a contact', async () => {
      const mockRows = [makeRelationshipRow()];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await contactRelationshipService.getContactRelationships('c1');

      expect(result).toEqual(mockRows);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE cr.contact_id = $1'), ['c1']);
    });

    it('throws error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB Error'));

      await expect(contactRelationshipService.getContactRelationships('c1')).rejects.toThrow(
        'Failed to retrieve contact relationships'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getContactRelationshipById', () => {
    it('returns an active relationship by id', async () => {
      const mockRow = makeRelationshipRow();
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await contactRelationshipService.getContactRelationshipById('rel1');

      expect(result).toEqual(mockRow);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE cr.id = $1 AND cr.is_active = true'),
        ['rel1']
      );
    });

    it('returns null when no active relationship exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await contactRelationshipService.getContactRelationshipById('rel-missing');

      expect(result).toBeNull();
    });
  });

  describe('createContactRelationship', () => {
    let mockClient: { query: jest.Mock; release: jest.Mock };

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockConnect.mockResolvedValue(mockClient);
    });

    it('creates a unidirectional relationship successfully', async () => {
      const mockRel = makeRelationshipRow();
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockRel] }) // INSERT primary
        .mockResolvedValueOnce({}); // COMMIT

      const result = await contactRelationshipService.createContactRelationship(
        'c1',
        {
          related_contact_id: 'c2',
          relationship_type: 'friend',
          is_bidirectional: false,
        },
        'user1'
      );

      expect(result).toEqual(mockRel);
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('BEGIN'));
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('COMMIT'));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('creates a bidirectional relationship with inverse materialization', async () => {
      const mockRel = makeRelationshipRow({
        relationship_type: 'parent',
        relationship_label: 'Mother',
        is_bidirectional: true,
        inverse_relationship_type: 'child',
      });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockRel] }) // INSERT primary
        .mockResolvedValueOnce({}) // UPSERT inverse
        .mockResolvedValueOnce({}); // COMMIT

      const result = await contactRelationshipService.createContactRelationship(
        'c1',
        {
          related_contact_id: 'c2',
          relationship_type: 'parent',
          relationship_label: 'Mother',
          is_bidirectional: true,
          inverse_relationship_type: 'child',
        },
        'user1'
      );

      expect(result).toEqual(mockRel);
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query.mock.calls[2]?.[0]).toContain('ON CONFLICT');
    });

    it('keeps bidirectional-without-inverse-type permissive and one-way', async () => {
      const mockRel = makeRelationshipRow({
        is_bidirectional: true,
        inverse_relationship_type: null,
      });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockRel] }) // INSERT primary
        .mockResolvedValueOnce({}); // COMMIT

      const result = await contactRelationshipService.createContactRelationship(
        'c1',
        {
          related_contact_id: 'c2',
          relationship_type: 'friend',
          is_bidirectional: true,
        },
        'user1'
      );

      expect(result).toEqual(mockRel);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    it('handles rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Fail')); // INSERT fails

      await expect(
        contactRelationshipService.createContactRelationship(
          'c1',
          { related_contact_id: 'c2', relationship_type: 'other' },
          'user1'
        )
      ).rejects.toThrow('Failed to create contact relationship');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateContactRelationship', () => {
    let mockClient: { query: jest.Mock; release: jest.Mock };

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockConnect.mockResolvedValue(mockClient);
    });

    it('updates a one-way relationship successfully', async () => {
      const existing = makeRelationshipRow();
      const updated = makeRelationshipRow({ notes: 'Updated notes' });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [existing] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [updated] }) // UPDATE primary
        .mockResolvedValueOnce({}); // COMMIT

      const result = await contactRelationshipService.updateContactRelationship(
        'rel1',
        { notes: 'Updated notes' },
        'user1'
      );

      expect(result).toEqual(updated);
      expect(mockClient.query).toHaveBeenCalledTimes(4);
    });

    it('synchronizes the inverse row when a bidirectional relationship changes', async () => {
      const existing = makeRelationshipRow({
        relationship_type: 'parent',
        relationship_label: 'Mother',
        is_bidirectional: true,
        inverse_relationship_type: 'child',
      });
      const updated = makeRelationshipRow({
        relationship_type: 'parent',
        relationship_label: 'Guardian',
        is_bidirectional: true,
        inverse_relationship_type: 'child',
        notes: 'Updated notes',
      });
      const inverse = makeRelationshipRow({
        id: 'rel2',
        contact_id: 'c2',
        related_contact_id: 'c1',
        relationship_type: 'child',
        relationship_label: 'Child',
        is_bidirectional: true,
        inverse_relationship_type: 'parent',
      });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [existing] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [updated] }) // UPDATE primary
        .mockResolvedValueOnce({ rows: [inverse] }) // SELECT inverse
        .mockResolvedValueOnce({ rows: [inverse] }) // UPDATE inverse
        .mockResolvedValueOnce({}); // COMMIT

      const result = await contactRelationshipService.updateContactRelationship(
        'rel1',
        { relationship_label: 'Guardian', notes: 'Updated notes' },
        'user1'
      );

      expect(result).toEqual(updated);
      expect(mockClient.query).toHaveBeenCalledTimes(6);
      expect(mockClient.query.mock.calls[4]?.[0]).toContain('UPDATE contact_relationships SET');
      expect(mockClient.query.mock.calls[4]?.[1]).toEqual(
        expect.arrayContaining(['child', null, true, 'parent', 'Updated notes', true, 'user1', 'rel2'])
      );
    });

    it('soft deletes the inverse row when bidirectional is toggled off', async () => {
      const existing = makeRelationshipRow({
        relationship_type: 'parent',
        is_bidirectional: true,
        inverse_relationship_type: 'child',
      });
      const updated = makeRelationshipRow({
        relationship_type: 'parent',
        is_bidirectional: false,
        inverse_relationship_type: 'child',
      });
      const inverse = makeRelationshipRow({
        id: 'rel2',
        contact_id: 'c2',
        related_contact_id: 'c1',
        relationship_type: 'child',
        is_bidirectional: true,
        inverse_relationship_type: 'parent',
      });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [existing] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [updated] }) // UPDATE primary
        .mockResolvedValueOnce({ rows: [inverse] }) // SELECT inverse
        .mockResolvedValueOnce({ rows: [{ id: 'rel2' }] }) // SOFT DELETE inverse
        .mockResolvedValueOnce({}); // COMMIT

      const result = await contactRelationshipService.updateContactRelationship(
        'rel1',
        { is_bidirectional: false },
        'user1'
      );

      expect(result).toEqual(updated);
      expect(mockClient.query).toHaveBeenCalledTimes(6);
      expect(mockClient.query.mock.calls[4]?.[0]).toContain('SET is_active = false');
    });

    it('materializes an inverse row when bidirectional is enabled with an inverse type', async () => {
      const existing = makeRelationshipRow({
        is_bidirectional: false,
        inverse_relationship_type: null,
      });
      const updated = makeRelationshipRow({
        is_bidirectional: true,
        inverse_relationship_type: 'child',
        relationship_type: 'parent',
        relationship_label: 'Mother',
      });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [existing] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [updated] }) // UPDATE primary
        .mockResolvedValueOnce({}) // UPSERT inverse
        .mockResolvedValueOnce({}); // COMMIT

      const result = await contactRelationshipService.updateContactRelationship(
        'rel1',
        {
          is_bidirectional: true,
          inverse_relationship_type: 'child',
          relationship_type: 'parent',
          relationship_label: 'Mother',
        },
        'user1'
      );

      expect(result).toEqual(updated);
      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockClient.query.mock.calls[3]?.[0]).toContain('ON CONFLICT');
    });

    it('keeps bidirectional-without-inverse-type permissive and one-way on update', async () => {
      const existing = makeRelationshipRow({
        is_bidirectional: false,
        inverse_relationship_type: null,
      });
      const updated = makeRelationshipRow({
        is_bidirectional: true,
        inverse_relationship_type: null,
      });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [existing] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [updated] }) // UPDATE primary
        .mockResolvedValueOnce({}); // COMMIT

      const result = await contactRelationshipService.updateContactRelationship(
        'rel1',
        { is_bidirectional: true },
        'user1'
      );

      expect(result).toEqual(updated);
      expect(mockClient.query).toHaveBeenCalledTimes(4);
    });

    it('returns null if relationship not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT existing
        .mockResolvedValueOnce({}); // ROLLBACK

      const result = await contactRelationshipService.updateContactRelationship('rel1', { notes: 'X' }, 'user1');

      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('deleteContactRelationship', () => {
    let mockClient: { query: jest.Mock; release: jest.Mock };

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockConnect.mockResolvedValue(mockClient);
    });

    it('soft deletes both sides of a bidirectional relationship', async () => {
      const existing = makeRelationshipRow({
        relationship_type: 'parent',
        is_bidirectional: true,
        inverse_relationship_type: 'child',
      });
      const inverse = makeRelationshipRow({
        id: 'rel2',
        contact_id: 'c2',
        related_contact_id: 'c1',
        relationship_type: 'child',
        is_bidirectional: true,
        inverse_relationship_type: 'parent',
      });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [existing] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [{ id: 'rel1' }] }) // SOFT DELETE primary
        .mockResolvedValueOnce({ rows: [inverse] }) // SELECT inverse
        .mockResolvedValueOnce({ rows: [{ id: 'rel2' }] }) // SOFT DELETE inverse
        .mockResolvedValueOnce({}); // COMMIT

      const result = await contactRelationshipService.deleteContactRelationship('rel1');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledTimes(6);
      expect(mockClient.query.mock.calls[2]?.[0]).toContain('SET is_active = false');
      expect(mockClient.query.mock.calls[4]?.[0]).toContain('SET is_active = false');
    });

    it('returns false when the relationship does not exist', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT existing
        .mockResolvedValueOnce({}); // ROLLBACK

      const result = await contactRelationshipService.deleteContactRelationship('rel-missing');

      expect(result).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
