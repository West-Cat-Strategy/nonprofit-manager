import React from 'react';
import type { CaseHandoffPacket as HandoffData } from '../../../types/case';
import { BrutalBadge, BrutalCard } from '../../../components/neo-brutalist';
import { format } from 'date-fns';

interface CaseHandoffPacketProps {
  data: HandoffData;
}

const siteName = (snapshot: HandoffData['field_packet']['services'][number]['service_site_snapshot']) =>
  snapshot?.name || snapshot?.provider_name || null;

const siteAddress = (snapshot: HandoffData['field_packet']['services'][number]['service_site_snapshot']) =>
  snapshot
    ? [snapshot.address_line1, snapshot.address_line2, snapshot.city, snapshot.state_province, snapshot.postal_code]
        .filter(Boolean)
        .join(', ') || null
    : null;

export const CaseHandoffPacket: React.FC<CaseHandoffPacketProps> = ({ data }) => {
  const { case_details, risks, continuity, next_actions, visibility, artifacts_summary, field_packet, generated_at } = data;
  const readinessLabel =
    continuity.handoff_readiness.status === 'ready' ? 'Ready for Handoff' : 'Needs Handoff Review';
  const closureLabel: Record<HandoffData['continuity']['closure']['status'], string> = {
    ready: 'Closure Continuity Ready',
    open_actions: 'Closure Actions Open',
    closed_with_evidence: 'Closed With Continuity Evidence',
    closed_needs_review: 'Closed Case Needs Review',
  };
  const formatDateTime = (value: string | null) => (value ? format(new Date(value), 'yyyy-MM-dd HH:mm') : 'Not set');

  return (
    <div className="p-4 space-y-8 max-w-4xl mx-auto print:p-0 print:space-y-4 print:max-w-none">
      {/* Header */}
      <div className="flex justify-between items-start border-b-4 border-app-border pb-4 print:border-b-2">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter print:text-2xl">
            Case Handoff Packet
          </h1>
          <p className="text-xl font-bold bg-app-accent-soft text-app-accent-text px-2 py-1 inline-block border-2 border-app-border mt-2 print:text-lg">
            {case_details.case_number}: {case_details.title}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold uppercase text-sm">Generated At</p>
          <p className="font-mono">{format(new Date(generated_at), 'yyyy-MM-dd HH:mm')}</p>
        </div>
      </div>

      {/* Status & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
        <BrutalCard className="bg-app-surface">
          <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-app-border pb-2">Status & Priority</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-sm text-app-text-muted">Current Status</span>
              <BrutalBadge color="blue" className="bg-app-accent-soft text-app-accent-text">
                {case_details.status_name}
              </BrutalBadge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-sm text-app-text-muted">Priority</span>
              <BrutalBadge 
                color={case_details.is_urgent ? 'red' : 'blue'}
                className={!case_details.is_urgent ? 'bg-app-accent-soft text-app-accent-text' : ''}
              >
                {case_details.priority}
              </BrutalBadge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-sm text-app-text-muted">Assigned Staff</span>
              <span className="font-bold">
                {case_details.assigned_staff 
                  ? `${case_details.assigned_staff.first_name} ${case_details.assigned_staff.last_name}`
                  : 'Unassigned'}
              </span>
            </div>
          </div>
        </BrutalCard>

        <BrutalCard className={risks.risk_summary.length > 0 ? 'bg-app-accent-soft' : 'bg-app-surface-muted'}>
          <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-app-border pb-2">Risk Assessment</h2>
          {risks.risk_summary.length > 0 ? (
            <ul className="space-y-2">
              {risks.risk_summary.map((risk, index) => (
                <li key={index} className="flex items-center gap-2 font-bold text-app-accent-text uppercase text-sm">
                  <span className="w-4 h-4 bg-app-accent inline-block border-2 border-app-border"></span>
                  {risk}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-bold text-app-text-muted uppercase text-sm italic">No immediate risks identified</p>
          )}
        </BrutalCard>
      </div>

      {/* Continuity */}
      <BrutalCard className="bg-app-surface">
        <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-app-border pb-2">Continuity</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 print:grid-cols-3 print:gap-4">
          <div className="border-2 border-app-border bg-app-surface-muted p-3">
            <p className="font-black uppercase text-sm text-app-text-muted mb-2">Reassessment Rigor</p>
            <BrutalBadge color={continuity.reassessment.status === 'current' ? 'green' : 'yellow'}>
              {continuity.reassessment.headline}
            </BrutalBadge>
            <p className="mt-2 text-sm font-bold text-app-text-muted">
              {continuity.reassessment.detail}
            </p>
            {continuity.reassessment.current && (
              <p className="mt-2 text-xs font-mono">
                Current due: {continuity.reassessment.current.due_date || 'Not set'}
              </p>
            )}
          </div>
          <div className="border-2 border-app-border bg-app-surface-muted p-3">
            <p className="font-black uppercase text-sm text-app-text-muted mb-2">Handoff Readiness</p>
            <BrutalBadge color={continuity.handoff_readiness.status === 'ready' ? 'green' : 'yellow'}>
              {readinessLabel}
            </BrutalBadge>
            <ul className="mt-2 space-y-1 text-sm font-bold text-app-text-muted">
              {continuity.handoff_readiness.cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ul>
          </div>
          <div className="border-2 border-app-border bg-app-surface-muted p-3">
            <p className="font-black uppercase text-sm text-app-text-muted mb-2">Closure Continuity</p>
            <BrutalBadge
              color={
                continuity.closure.status.includes('needs') || continuity.closure.status === 'open_actions'
                  ? 'yellow'
                  : 'green'
              }
            >
              {closureLabel[continuity.closure.status]}
            </BrutalBadge>
            <ul className="mt-2 space-y-1 text-sm font-bold text-app-text-muted">
              {continuity.closure.cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ul>
          </div>
        </div>
      </BrutalCard>

      {/* Field Packet */}
      <BrutalCard className="bg-app-surface">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-app-border pb-2 mb-4">
          <h2 className="text-xl font-black uppercase">Field Packet</h2>
          <div className="flex flex-wrap gap-2">
            <BrutalBadge color={field_packet.scope.offline_sync_included ? 'green' : 'blue'}>
              No Offline Sync
            </BrutalBadge>
            <BrutalBadge color={field_packet.scope.service_site_routing_included ? 'green' : 'blue'}>
              No Site Routing
            </BrutalBadge>
            <BrutalBadge color={field_packet.scope.referral_transfer_included ? 'green' : 'blue'}>
              No Referral Transfer
            </BrutalBadge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 print:grid-cols-3 print:gap-4">
          <div>
            <h3 className="font-black uppercase text-sm mb-2 text-app-text-muted">Services</h3>
            {field_packet.services.length > 0 ? (
              <ul className="space-y-3">
                {field_packet.services.map((service) => {
                  const snapshotName = siteName(service.service_site_snapshot);
                  const snapshotAddress = siteAddress(service.service_site_snapshot);
                  return (
                    <li key={service.id} className="border-2 border-app-border bg-app-surface-muted p-3">
                      <p className="font-bold">{service.name}</p>
                      <p className="text-xs font-mono uppercase">
                        {[service.status, service.type, service.service_date].filter(Boolean).join(' | ')}
                      </p>
                      {(snapshotName || service.provider) && (
                        <p className="mt-1 text-sm font-bold text-app-text-muted">
                          {snapshotName || service.provider}
                          {snapshotName && service.provider && snapshotName !== service.provider
                            ? ` (${service.provider})`
                            : ''}
                        </p>
                      )}
                      {snapshotAddress && <p className="mt-1 text-xs font-mono">{snapshotAddress}</p>}
                      {service.service_site_snapshot?.contact_name && (
                        <p className="mt-1 text-xs text-app-text-muted">
                          Contact: {service.service_site_snapshot.contact_name}
                        </p>
                      )}
                      {service.outcome && <p className="mt-1 text-sm">{service.outcome}</p>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm italic font-bold text-app-text-muted uppercase">No services in packet</p>
            )}
          </div>

          <div>
            <h3 className="font-black uppercase text-sm mb-2 text-app-text-muted">Forms</h3>
            {field_packet.forms.length > 0 ? (
              <ul className="space-y-3">
                {field_packet.forms.map((form) => (
                  <li key={form.id} className="border-2 border-app-border bg-app-surface-muted p-3">
                    <p className="font-bold">{form.title}</p>
                    <p className="text-xs font-mono uppercase">
                      {form.status} | Due: {formatDateTime(form.due_at)}
                    </p>
                    {form.recipient_email && (
                      <p className="mt-1 text-sm font-bold text-app-text-muted">{form.recipient_email}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic font-bold text-app-text-muted uppercase">No forms in packet</p>
            )}
          </div>

          <div>
            <h3 className="font-black uppercase text-sm mb-2 text-app-text-muted">Appointments</h3>
            {field_packet.appointments.length > 0 ? (
              <ul className="space-y-3">
                {field_packet.appointments.map((appointment) => {
                  const snapshotName = siteName(appointment.service_site_snapshot);
                  const snapshotAddress = siteAddress(appointment.service_site_snapshot);
                  return (
                    <li key={appointment.id} className="border-2 border-app-border bg-app-surface-muted p-3">
                      <p className="font-bold">{appointment.title}</p>
                      <p className="text-xs font-mono uppercase">
                        {appointment.status} | {formatDateTime(appointment.start_time)}
                      </p>
                      {(snapshotName || appointment.location) && (
                        <p className="mt-1 text-sm font-bold text-app-text-muted">
                          {snapshotName || appointment.location}
                        </p>
                      )}
                      {snapshotAddress && <p className="mt-1 text-xs font-mono">{snapshotAddress}</p>}
                      {appointment.service_site_snapshot?.phone && (
                        <p className="mt-1 text-xs text-app-text-muted">
                          Phone: {appointment.service_site_snapshot.phone}
                        </p>
                      )}
                      {appointment.pointperson && (
                        <p className="mt-1 text-sm">
                          {appointment.pointperson.first_name} {appointment.pointperson.last_name}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm italic font-bold text-app-text-muted uppercase">No appointments in packet</p>
            )}
          </div>
        </div>

        <div className="mt-6 border-2 border-app-border bg-app-surface-muted p-3">
          <p className="font-black uppercase text-sm text-app-text-muted">Assignment Context</p>
          <p className="mt-1 font-bold">
            {field_packet.assignment_context.assigned_staff
              ? `${field_packet.assignment_context.assigned_staff.first_name} ${field_packet.assignment_context.assigned_staff.last_name}`
              : 'Unassigned'}{' '}
            | {field_packet.assignment_context.case_status} | {field_packet.assignment_context.priority} |{' '}
            {field_packet.assignment_context.portal_visibility_status}
          </p>
        </div>
      </BrutalCard>

      {/* Next Actions */}
      <BrutalCard className="bg-app-surface">
        <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-app-border pb-2">Next Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4">
          <div>
            <h3 className="font-black uppercase text-sm mb-2 text-app-text-muted">Pending Milestones</h3>
            {next_actions.pending_milestones.length > 0 ? (
              <ul className="space-y-3">
                {next_actions.pending_milestones.map(milestone => (
                  <li key={milestone.id} className="border-l-4 border-app-border pl-3 py-1 bg-app-surface-muted">
                    <p className="font-bold">{milestone.name}</p>
                    <p className="text-xs font-mono">
                      Due: {milestone.due_date ? format(new Date(milestone.due_date), 'yyyy-MM-dd') : 'No Date'}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic font-bold text-app-text-muted uppercase">No pending milestones</p>
            )}
          </div>
          <div>
            <h3 className="font-black uppercase text-sm mb-2 text-app-text-muted">Pending Follow-ups</h3>
            {next_actions.pending_follow_ups.length > 0 ? (
              <ul className="space-y-3">
                {next_actions.pending_follow_ups.map(followup => (
                  <li key={followup.id} className="border-l-4 border-app-border pl-3 py-1 bg-app-surface-muted">
                    <p className="font-bold">{followup.title}</p>
                    <p className="text-xs font-mono">
                      Due: {followup.due_date ? format(new Date(followup.due_date), 'yyyy-MM-dd') : 'No Date'}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic font-bold text-app-text-muted uppercase">No pending follow-ups</p>
            )}
          </div>
        </div>
      </BrutalCard>

      {/* Visibility */}
      <BrutalCard className="bg-app-surface">
        <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-app-border pb-2">Visibility Boundaries</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <BrutalBadge color={visibility.client_viewable ? 'green' : 'blue'}>
            {visibility.portal_visibility_status}
          </BrutalBadge>
          <p className="font-bold uppercase text-sm text-app-text-muted">
            {visibility.client_viewable
              ? 'Selected case details may be visible in the client portal.'
              : 'Keep this packet internal until client visibility is enabled.'}
          </p>
        </div>
      </BrutalCard>

      {/* Artifact Summary */}
      <BrutalCard className="bg-app-surface-muted">
        <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-app-border pb-2">Artifact Counts</h2>
        <div className="flex flex-wrap gap-4 justify-around print:justify-start print:gap-8">
          {[
            { label: 'Services', count: artifacts_summary.services_count },
            { label: 'Forms', count: artifacts_summary.forms_count },
            { label: 'Appointments', count: artifacts_summary.appointments_count },
            { label: 'Notes', count: artifacts_summary.notes_count },
            { label: 'Documents', count: artifacts_summary.documents_count },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="w-16 h-16 border-4 border-app-border bg-app-accent-soft text-app-accent-text shadow-[4px_4px_0px_0px_var(--shadow-color)] flex items-center justify-center text-2xl font-black mb-2 print:w-10 print:h-10 print:text-sm print:border-2">
                {stat.count}
              </div>
              <p className="font-bold uppercase text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </BrutalCard>

      {/* Contact Info */}
      <BrutalCard className="bg-app-surface">
        <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-app-border pb-2">Contact Details</h2>
        <div className="space-y-1">
          <p className="text-lg font-bold">
            {case_details.contact?.first_name} {case_details.contact?.last_name}
          </p>
          <p className="font-mono text-sm">{case_details.contact?.email}</p>
        </div>
      </BrutalCard>

      {/* Footer */}
      <div className="border-t-4 border-app-border pt-4 flex justify-between items-center print:border-t-2">
        <p className="font-black uppercase text-xs italic">
          Confidential - Internal Use Only
        </p>
        <button 
          onClick={() => window.print()} 
          className="bg-app-text text-app-surface px-6 py-2 font-black uppercase hover:bg-app-surface hover:text-app-text border-4 border-app-border transition-colors print:hidden"
        >
          Print Packet
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .BrutalCard { border: 2px solid black !important; shadow: none !important; }
        }
      `}} />
    </div>
  );
};
