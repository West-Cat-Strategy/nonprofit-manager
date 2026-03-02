import { useNavigate } from 'react-router-dom';
import { BrutalButton, BrutalCard, NeoBrutalistLayout } from '../../../components/neo-brutalist';
import { useTeamChatInbox } from '../hooks/useTeamChatInbox';

const isTeamChatEnabled = import.meta.env.VITE_TEAM_CHAT_ENABLED !== 'false';

const TeamChatInboxPage = () => {
  const navigate = useNavigate();
  const { rooms, summary, loading, error, refresh } = useTeamChatInbox(isTeamChatEnabled);

  if (!isTeamChatEnabled) {
    return (
      <NeoBrutalistLayout pageTitle="Team Chat">
        <div className="p-6">
          <BrutalCard color="yellow" className="p-6">
            <h2 className="text-xl font-black uppercase mb-2 text-black">Team Chat Disabled</h2>
            <p className="text-sm font-bold text-black/70">
              Team chat is currently disabled for this environment.
            </p>
          </BrutalCard>
        </div>
      </NeoBrutalistLayout>
    );
  }

  return (
    <NeoBrutalistLayout pageTitle="Team Chat">
      <div className="p-6 space-y-4">
        <BrutalCard color="white" className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border-2 border-black p-3 bg-[var(--loop-cyan)]">
                <div className="text-xs font-black uppercase text-black/70">Total Unread</div>
                <div className="text-2xl font-black text-black">{summary.total_unread_count}</div>
              </div>
              <div className="border-2 border-black p-3 bg-[var(--loop-yellow)]">
                <div className="text-xs font-black uppercase text-black/70">Mentions</div>
                <div className="text-2xl font-black text-black">{summary.total_unread_mentions_count}</div>
              </div>
              <div className="border-2 border-black p-3 bg-[var(--loop-green)]">
                <div className="text-xs font-black uppercase text-black/70">Rooms with Unread</div>
                <div className="text-2xl font-black text-black">{summary.rooms_with_unread_count}</div>
              </div>
            </div>
            <BrutalButton onClick={() => void refresh()} variant="secondary" size="sm">
              Refresh
            </BrutalButton>
          </div>
        </BrutalCard>

        <BrutalCard color="white" className="p-0 overflow-hidden">
          <div className="p-4 border-b-2 border-black">
            <h2 className="text-lg font-black uppercase text-black">Case Chat Inbox</h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm font-bold text-black/70">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="p-6 text-sm font-bold text-black/70">No case chat rooms yet.</div>
          ) : (
            <ul className="divide-y-2 divide-black/10">
              {rooms.map((room) => (
                <li key={room.room_id} className="p-4 hover:bg-app-surface-muted transition-colors">
                  <button
                    type="button"
                    onClick={() => navigate(`/cases/${room.case_id}?tab=team_chat`)}
                    className="w-full text-left"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black uppercase text-black/60">{room.case_number}</div>
                        <div className="text-base font-black text-black">{room.case_title}</div>
                        <div className="text-sm font-bold text-black/70 mt-1">
                          {room.last_message_preview || 'No messages yet'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(room.unread_count > 0 || room.unread_mentions_count > 0) && (
                          <span className="px-2 py-1 border-2 border-black bg-[var(--loop-pink)] text-xs font-black uppercase text-black">
                            {room.unread_count} unread
                            {room.unread_mentions_count > 0
                              ? ` · ${room.unread_mentions_count} mentions`
                              : ''}
                          </span>
                        )}
                        <span className="text-xs font-bold text-black/60">
                          {new Date(room.last_message_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </BrutalCard>

        {error && (
          <BrutalCard color="pink" className="p-4">
            <p className="text-sm font-bold text-black">{error}</p>
          </BrutalCard>
        )}
      </div>
    </NeoBrutalistLayout>
  );
};

export default TeamChatInboxPage;
