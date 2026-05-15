import type { Pool } from 'pg';
import { getCaseHandoffPacketQuery } from '../handoffQueries';

describe('handoffQueries', () => {
  const query = jest.fn();
  const db = { query } as unknown as Pool;

  beforeEach(() => {
    query.mockReset();
  });

  it('assembles field packet contents from existing case records without transfer or sync scope', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ case_id: 'case-1', contact_id: 'contact-1', account_id: 'account-1' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'case-1',
            case_number: 'CASE-001',
            title: 'Housing Support',
            priority: 'high',
            is_urgent: true,
            description: 'Stable housing support',
            client_viewable: false,
            closed_date: null,
            closure_reason: null,
            status_name: 'Open',
            status_type: 'active',
            assigned_first_name: 'Alex',
            assigned_last_name: 'Rivera',
            assigned_email: 'alex@example.com',
            contact_first_name: 'Casey',
            contact_last_name: 'Client',
            contact_email: 'casey@example.com',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            services_count: 1,
            forms_count: 1,
            appointments_count: 1,
            notes_count: 0,
            documents_count: 0,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'service-1',
            name: 'Housing navigation',
            type: 'housing',
            provider: 'Community Housing Team',
            service_site_snapshot: {
              id: 'site-1',
              name: 'Outreach Hub',
              provider_name: 'Community Housing Team',
              address_line1: '100 Main St',
              city: 'Vancouver',
              phone: '555-0100',
            },
            status: 'scheduled',
            service_date: new Date('2026-04-22T00:00:00Z'),
            outcome: 'Bring lease paperwork',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'form-1',
            title: 'Housing eligibility review',
            status: 'sent',
            due_at: new Date('2026-04-23T16:00:00Z'),
            sent_at: new Date('2026-04-20T16:00:00Z'),
            submitted_at: null,
            reviewed_at: null,
            recipient_email: 'casey@example.com',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'appointment-1',
            title: 'Housing site visit',
            status: 'confirmed',
            start_time: new Date('2026-04-24T18:00:00Z'),
            end_time: new Date('2026-04-24T18:30:00Z'),
            location: 'Main office',
            service_site_snapshot: {
              name: 'Downtown Clinic',
              address_line1: '200 Care Ave',
              city: 'Vancouver',
              contact_name: 'Front desk',
            },
            request_type: 'slot_booking',
            pointperson_first_name: 'Alex',
            pointperson_last_name: 'Rivera',
            pointperson_email: 'alex@example.com',
          },
        ],
      });

    const packet = await getCaseHandoffPacketQuery(db, 'case-1', 'account-1');

    expect(packet.field_packet.scope).toEqual({
      summary: expect.arrayContaining([
        expect.stringContaining('existing case-detail records'),
        expect.stringContaining('Does not create an offline sync bundle'),
      ]),
      offline_sync_included: false,
      service_site_routing_included: false,
      referral_transfer_included: false,
      persisted_packet_included: false,
    });
    expect(packet.field_packet.assignment_context).toEqual({
      assigned_staff: {
        first_name: 'Alex',
        last_name: 'Rivera',
        email: 'alex@example.com',
      },
      contact: {
        first_name: 'Casey',
        last_name: 'Client',
        email: 'casey@example.com',
      },
      case_status: 'Open',
      priority: 'high',
      portal_visibility_status: 'Internal Only',
    });
    expect(packet.field_packet.services).toEqual([
      expect.objectContaining({
        name: 'Housing navigation',
        type: 'housing',
        provider: 'Community Housing Team',
        service_site_snapshot: expect.objectContaining({
          id: 'site-1',
          name: 'Outreach Hub',
          provider_name: 'Community Housing Team',
          address_line1: '100 Main St',
          city: 'Vancouver',
          phone: '555-0100',
        }),
        status: 'scheduled',
        service_date: '2026-04-22',
        outcome: 'Bring lease paperwork',
      }),
    ]);
    expect(packet.field_packet.forms).toEqual([
      expect.objectContaining({
        title: 'Housing eligibility review',
        status: 'sent',
        due_at: '2026-04-23T16:00:00.000Z',
        recipient_email: 'casey@example.com',
      }),
    ]);
    expect(packet.field_packet.appointments).toEqual([
      expect.objectContaining({
        title: 'Housing site visit',
        status: 'confirmed',
        start_time: '2026-04-24T18:00:00.000Z',
        location: 'Main office',
        service_site_snapshot: expect.objectContaining({
          name: 'Downtown Clinic',
          address_line1: '200 Care Ave',
          city: 'Vancouver',
          contact_name: 'Front desk',
        }),
        request_type: 'slot_booking',
        pointperson: {
          first_name: 'Alex',
          last_name: 'Rivera',
          email: 'alex@example.com',
        },
      }),
    ]);
    expect(packet.visibility.portal_visibility_status).toBe('Internal Only');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM case_services'), ['case-1']);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM case_form_assignments'), ['case-1']);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM appointments a'), ['case-1']);
  });
});
