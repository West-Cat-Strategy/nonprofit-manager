import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildEmptyDockState,
  loadDockState,
  STORAGE_KEY,
  type TeamMessengerDockState,
} from './teamMessengerState';

export function useTeamMessengerDockState() {
  const [dockState, setDockState] = useState<TeamMessengerDockState>(() =>
    typeof window === 'undefined' ? buildEmptyDockState() : loadDockState()
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dockState));
  }, [dockState]);

  const openDockRoom = useCallback((roomId: string) => {
    startTransition(() => {
      setDockState((current) => ({
        openRoomIds: [...current.openRoomIds.filter((entry) => entry !== roomId), roomId],
        minimizedRoomIds: current.minimizedRoomIds.filter((entry) => entry !== roomId),
      }));
    });
  }, []);

  const closeDockRoom = useCallback((roomId: string) => {
    startTransition(() => {
      setDockState((current) => ({
        openRoomIds: current.openRoomIds.filter((entry) => entry !== roomId),
        minimizedRoomIds: current.minimizedRoomIds.filter((entry) => entry !== roomId),
      }));
    });
  }, []);

  const toggleDockRoomMinimized = useCallback((roomId: string) => {
    startTransition(() => {
      setDockState((current) => {
        const minimized = current.minimizedRoomIds.includes(roomId);
        return {
          openRoomIds: minimized
            ? [...current.openRoomIds.filter((entry) => entry !== roomId), roomId]
            : current.openRoomIds,
          minimizedRoomIds: minimized
            ? current.minimizedRoomIds.filter((entry) => entry !== roomId)
            : [...current.minimizedRoomIds, roomId],
        };
      });
    });
  }, []);

  const visibleRoomIds = useMemo(() => {
    const openIds = dockState.openRoomIds.filter(
      (roomId) => !dockState.minimizedRoomIds.includes(roomId)
    );
    return openIds.slice(-3);
  }, [dockState.minimizedRoomIds, dockState.openRoomIds]);

  return {
    dockState,
    openDockRoom,
    closeDockRoom,
    toggleDockRoomMinimized,
    visibleRoomIds,
  };
}
