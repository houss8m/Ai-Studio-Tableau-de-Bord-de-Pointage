
import { create } from 'zustand';
import { Punch } from './types';

type ModalState = {
    type: 'add' | 'edit' | 'confirm-clear' | null;
    data?: Punch;
};

type ActionHistory = {
    type: 'add' | 'update' | 'delete';
    data: Punch | Punch[];
};

type State = {
    filters: {
        employeeName: string;
        employeeId: string;
        startDate: string;
        endDate: string;
    };
    modal: ModalState;
    history: ActionHistory[];
};

type Actions = {
    setFilters: (filters: Partial<State['filters']>) => void;
    openModal: (type: ModalState['type'], data?: Punch) => void;
    closeModal: () => void;
    addHistory: (action: ActionHistory) => void;
    popHistory: () => ActionHistory | undefined;
};

export const useAppStore = create<State & Actions>((set, get) => ({
    filters: {
        employeeName: '',
        employeeId: '',
        startDate: '',
        endDate: ''
    },
    modal: { type: null },
    history: [],

    setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),
    openModal: (type, data) => set({ modal: { type, data } }),
    closeModal: () => set({ modal: { type: null } }),
    addHistory: (action) => set((state) => ({ history: [...state.history.slice(-9), action] })),
    popHistory: () => {
        const lastAction = get().history.pop();
        set({ history: [...get().history] });
        return lastAction;
    },
}));
