import { create } from 'zustand';
import { api } from '../services/api';
import { toast } from 'sonner';

interface Assessment {
  id: number | string;
  learner: string;
  title: string;
  date: string;
  status: 'pending' | 'moderation' | 'completed' | 'rejected';
}

interface Notification {
  id: string;
  type: 'assessment' | 'compliance' | 'system' | 'moderation';
  title: string;
  description: string;
  time: string;
  read: boolean;
}

interface AppState {
  assessments: Assessment[];
  notifications: Notification[];
  isLoading: boolean;

  // Actions
  fetchAssessments: () => Promise<void>;
  submitForModeration: (id: number | string) => Promise<void>;
  moderateAssessment: (
  id: number | string,
  decision: 'approve' | 'reject' | 'changes',
  comments: string)
  => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  assessments: [
  {
    id: 1,
    learner: 'Thabo Mbeki',
    title: 'Module 3: Web Development',
    date: '2023-05-20',
    status: 'pending'
  },
  {
    id: 2,
    learner: 'Lerato Kganyago',
    title: 'Module 3: Web Development',
    date: '2023-05-21',
    status: 'pending'
  },
  {
    id: 3,
    learner: 'Sipho Nkosi',
    title: 'Module 2: Database Design',
    date: '2023-05-18',
    status: 'moderation'
  },
  {
    id: 4,
    learner: 'Zanele Dlamini',
    title: 'Module 1: Intro to Programming',
    date: '2023-04-10',
    status: 'completed'
  }],

  notifications: [
  {
    id: '1',
    type: 'assessment',
    title: 'Assessment Submitted',
    description: 'Thabo Mbeki submitted "Module 4: Systems Design"',
    time: '2 hours ago',
    read: false
  },
  {
    id: '2',
    type: 'compliance',
    title: 'Compliance Alert',
    description: '3 Learners missing ID documents in Cohort B',
    time: '5 hours ago',
    read: false
  }],

  isLoading: false,

  fetchAssessments: async () => {
    set({ isLoading: true });
    // Simulate fetch
    setTimeout(() => set({ isLoading: false }), 800);
  },

  submitForModeration: async (id) => {
    set({ isLoading: true });
    try {
      await api.assessments.submit({ id });
      set((state) => ({
        assessments: state.assessments.map((a) =>
        a.id === id ? { ...a, status: 'moderation' } : a
        ),
        isLoading: false
      }));
      toast.success('Assessment submitted for moderation');
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to submit assessment');
    }
  },

  moderateAssessment: async (id, decision, comments) => {
    set({ isLoading: true });
    try {
      await api.assessments.moderate(String(id), decision, comments);
      const newStatus =
      decision === 'approve' ?
      'completed' :
      decision === 'reject' ?
      'rejected' :
      'pending';

      set((state) => ({
        assessments: state.assessments.map((a) =>
        a.id === id ? { ...a, status: newStatus } : a
        ),
        isLoading: false
      }));

      if (decision === 'approve') toast.success('Assessment approved');else
      if (decision === 'changes') toast.warning('Changes requested');else
      toast.error('Assessment rejected');
    } catch (error) {
      set({ isLoading: false });
      toast.error('Moderation failed');
    }
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
      )
    }));
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    }));
  },

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      read: false
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications]
    }));
  }
}));