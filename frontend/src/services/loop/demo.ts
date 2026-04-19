import type { CampaignEvent, CampaignStats, Task } from '../../types/schema';

const cloneTasks = (tasks: Task[]): Task[] =>
  tasks.map((task) => ({
    ...task,
    assignees: task.assignees ? [...task.assignees] : undefined,
  }));

const cloneCampaignEvents = (events: CampaignEvent[]): CampaignEvent[] =>
  events.map((event) => ({ ...event }));

export const isDemoPath = (pathname: string): boolean => pathname.startsWith('/demo/');

export const getDemoTasks = (): Task[] =>
  cloneTasks([
    {
      id: 'demo-task-1',
      title: 'Demo inbox triage',
      category: 'admin',
      status: 'todo',
      dueDate: '2026-04-21',
      assignees: ['Avery'],
    },
    {
      id: 'demo-task-2',
      title: 'Demo donor follow-up',
      category: 'finance',
      status: 'in-progress',
      dueDate: '2026-04-20',
      assignees: ['Jordan'],
    },
    {
      id: 'demo-task-3',
      title: 'Demo volunteer roster refresh',
      category: 'hr',
      status: 'done',
      assignees: ['Sam'],
    },
    {
      id: 'demo-task-4',
      title: 'Demo site health check',
      category: 'tech',
      status: 'todo',
    },
  ]);

export const getDemoCampaignStats = (): CampaignStats => ({
  peopleEngaged: 1234,
  newsletterSubs: '456',
  upcomingEvents: '7',
  activeDonors: '89',
  socialHandle: '@westcat',
});

export const getDemoCampaignEvents = (): CampaignEvent[] =>
  cloneCampaignEvents([
    {
      id: 'demo-event-1',
      title: 'Demo Spring Community Night',
      date: 'Apr 17, 2026',
      time: '6:00 PM',
      rsvpCount: 24,
    },
    {
      id: 'demo-event-2',
      title: 'Demo Volunteer Welcome',
      date: 'Apr 22, 2026',
      time: '4:30 PM',
      rsvpCount: 11,
    },
  ]);
