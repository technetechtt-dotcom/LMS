export type LearnerModuleStatus =
  | 'Completed'
  | 'In Progress'
  | 'Assessment'
  | 'Locked';

export type LearnerCourseModule = {
  id: number;
  name: string;
  description: string;
  status: LearnerModuleStatus;
  hours?: string;
  score?: string;
  progress?: number;
  dueDate?: string;
  prerequisite?: string;
};

export const learnerCourseModules: LearnerCourseModule[] = [
  {
    id: 1,
    name: 'Computer Fundamentals',
    description: 'Basic computer operations and digital literacy',
    status: 'Completed',
    hours: '6 hours',
    score: '92%',
    progress: 100
  },
  {
    id: 2,
    name: 'Database Management',
    description: 'SQL, database design, and data modeling',
    status: 'In Progress',
    progress: 60
  },
  {
    id: 3,
    name: 'Web Development',
    description: 'HTML, CSS, JavaScript fundamentals',
    status: 'Locked',
    prerequisite: 'Complete Database Management first'
  },
  {
    id: 4,
    name: 'Network Basics',
    description: 'Network protocols and infrastructure',
    status: 'Completed',
    hours: '8 hours',
    score: '88%',
    progress: 100
  },
  {
    id: 5,
    name: 'Network Security',
    description: 'Cybersecurity and network protection',
    status: 'Assessment',
    dueDate: 'Jan 15, 2025'
  },
  {
    id: 6,
    name: 'Cloud Computing',
    description: 'AWS, Azure, and cloud services',
    status: 'Locked',
    prerequisite: 'Complete Network Security first'
  }
];

export function getLearnerModuleById(
  courseId: string
): LearnerCourseModule | undefined {
  const n = Number(courseId);
  if (Number.isNaN(n)) return undefined;
  return learnerCourseModules.find((m) => m.id === n);
}
