import React from 'react';
import type { CaseHandoffPacket as HandoffData } from '../../../types/case';
import { BrutalCard } from '../../../components/ui/BrutalCard';
import { BrutalBadge } from '../../../components/ui/BrutalBadge';
import { format } from 'date-fns';

interface CaseHandoffPacketProps {
  data: HandoffData;
}

export const CaseHandoffPacket: React.FC<CaseHandoffPacketProps> = ({ data }) => {
  const { case_details, risks, next_actions, artifacts_summary, generated_at } = data;

  return (
    <div className="p-4 space-y-8 max-w-4xl mx-auto print:p-0 print:space-y-4 print:max-w-none">
      {/* Header */}
      <div className="flex justify-between items-start border-b-4 border-black pb-4 print:border-b-2">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter print:text-2xl">
            Case Handoff Packet
          </h1>
          <p className="text-xl font-bold bg-yellow-300 px-2 py-1 inline-block border-2 border-black mt-2 print:text-lg">
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
        <BrutalCard className="bg-white">
          <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-2">Status & Priority</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-sm text-gray-600">Current Status</span>
              <BrutalBadge variant="neutral" className="bg-blue-400">
                {case_details.status_name}
              </BrutalBadge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-sm text-gray-600">Priority</span>
              <BrutalBadge 
                variant={case_details.is_urgent ? 'danger' : 'neutral'}
                className={!case_details.is_urgent ? 'bg-yellow-400' : ''}
              >
                {case_details.priority}
              </BrutalBadge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-sm text-gray-600">Assigned Staff</span>
              <span className="font-bold">
                {case_details.assigned_staff 
                  ? `${case_details.assigned_staff.first_name} ${case_details.assigned_staff.last_name}`
                  : 'Unassigned'}
              </span>
            </div>
          </div>
        </BrutalCard>

        <BrutalCard className={risks.risk_summary.length > 0 ? 'bg-red-50' : 'bg-green-50'}>
          <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-2">Risk Assessment</h2>
          {risks.risk_summary.length > 0 ? (
            <ul className="space-y-2">
              {risks.risk_summary.map((risk, index) => (
                <li key={index} className="flex items-center gap-2 font-bold text-red-600 uppercase text-sm">
                  <span className="w-4 h-4 bg-red-600 inline-block border-2 border-black"></span>
                  {risk}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-bold text-green-600 uppercase text-sm italic">No immediate risks identified</p>
          )}
        </BrutalCard>
      </div>

      {/* Next Actions */}
      <BrutalCard className="bg-white">
        <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-2">Next Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4">
          <div>
            <h3 className="font-black uppercase text-sm mb-2 text-gray-500">Pending Milestones</h3>
            {next_actions.pending_milestones.length > 0 ? (
              <ul className="space-y-3">
                {next_actions.pending_milestones.map(milestone => (
                  <li key={milestone.id} className="border-l-4 border-black pl-3 py-1 bg-gray-50">
                    <p className="font-bold">{milestone.name}</p>
                    <p className="text-xs font-mono">
                      Due: {milestone.due_date ? format(new Date(milestone.due_date), 'yyyy-MM-dd') : 'No Date'}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic font-bold text-gray-400 uppercase">No pending milestones</p>
            )}
          </div>
          <div>
            <h3 className="font-black uppercase text-sm mb-2 text-gray-500">Pending Follow-ups</h3>
            {next_actions.pending_follow_ups.length > 0 ? (
              <ul className="space-y-3">
                {next_actions.pending_follow_ups.map(followup => (
                  <li key={followup.id} className="border-l-4 border-black pl-3 py-1 bg-gray-50">
                    <p className="font-bold">{followup.title}</p>
                    <p className="text-xs font-mono">
                      Due: {followup.due_date ? format(new Date(followup.due_date), 'yyyy-MM-dd') : 'No Date'}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic font-bold text-gray-400 uppercase">No pending follow-ups</p>
            )}
          </div>
        </div>
      </BrutalCard>

      {/* Artifact Summary */}
      <BrutalCard className="bg-gray-100">
        <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-2">Artifact Counts</h2>
        <div className="flex flex-wrap gap-4 justify-around print:justify-start print:gap-8">
          {[
            { label: 'Services', count: artifacts_summary.services_count, color: 'bg-green-300' },
            { label: 'Forms', count: artifacts_summary.forms_count, color: 'bg-purple-300' },
            { label: 'Appointments', count: artifacts_summary.appointments_count, color: 'bg-blue-300' },
            { label: 'Notes', count: artifacts_summary.notes_count, color: 'bg-yellow-300' },
            { label: 'Documents', count: artifacts_summary.documents_count, color: 'bg-orange-300' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className={`w-16 h-16 border-4 border-black ${stat.color} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-2xl font-black mb-2 print:w-10 print:h-10 print:text-sm print:border-2`}>
                {stat.count}
              </div>
              <p className="font-bold uppercase text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </BrutalCard>

      {/* Contact Info */}
      <BrutalCard className="bg-white">
        <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-2">Contact Details</h2>
        <div className="space-y-1">
          <p className="text-lg font-bold">
            {case_details.contact?.first_name} {case_details.contact?.last_name}
          </p>
          <p className="font-mono text-sm">{case_details.contact?.email}</p>
        </div>
      </BrutalCard>

      {/* Footer */}
      <div className="border-t-4 border-black pt-4 flex justify-between items-center print:border-t-2">
        <p className="font-black uppercase text-xs italic">
          Confidential - Internal Use Only
        </p>
        <button 
          onClick={() => window.print()} 
          className="bg-black text-white px-6 py-2 font-black uppercase hover:bg-white hover:text-black border-4 border-black transition-colors print:hidden"
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
