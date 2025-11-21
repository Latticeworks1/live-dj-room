import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface Room {
  id: string;
  name: string;
  host: string;
  userCount: number;
  maxUsers: number;
  isPublic: boolean;
  hasPassword: boolean;
}

interface AppState {
  username: string;
  currentRoomId: string | null;
  currentRoomName: string;
  currentRoomHost: string;
  isHost: boolean;
  userCount: number;
  rooms: Room[];
}

interface AppStateContextType {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  setUsername: (username: string) => void;
  setCurrentRoom: (room: Room | null) => void;
  setRooms: (rooms: Room[]) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider = ({ children }: AppStateProviderProps) => {
  const [state, setState] = useState<AppState>({
    username: '',
    currentRoomId: null,
    currentRoomName: '',
    currentRoomHost: '',
    isHost: false,
    userCount: 0,
    rooms: [],
  });

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setUsername = useCallback((username: string) => {
    updateState({ username });
  }, [updateState]);

  const setCurrentRoom = useCallback((room: Room | null) => {
    if (room) {
      updateState({
        currentRoomId: room.id,
        currentRoomName: room.name,
        currentRoomHost: room.host,
        isHost: room.host === state.username,
        userCount: room.userCount,
      });
    } else {
      updateState({
        currentRoomId: null,
        currentRoomName: '',
        currentRoomHost: '',
        isHost: false,
        userCount: 0,
      });
    }
  }, [state.username, updateState]);

  const setRooms = useCallback((rooms: Room[]) => {
    updateState({ rooms });
  }, [updateState]);

  return (
    <AppStateContext.Provider
      value={{
        state,
        updateState,
        setUsername,
        setCurrentRoom,
        setRooms,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export type { Room };
