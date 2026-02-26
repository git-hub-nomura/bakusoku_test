export type Priority = 'High' | 'Medium' | 'Low';
export type Status = 'Not Started' | 'In Progress' | 'Waiting for Review' | 'Completed';

export interface User {
  id: string;
  name: string;
  avatar: string; // URL or initials
  color: string; // For avatar background
}

export interface Task {
  id: string;
  title: string;
  dueDate: string; // ISO Date string YYYY-MM-DD
  priority: Priority;
  status: Status;
  assigneeIds: string[];
  memo?: string;
}

export type ColumnType = 'today' | 'week' | 'month' | 'future' | 'undecided';

export interface Column {
  id: ColumnType;
  title: string;
  color: string; // Background color class or hex
  borderColor: string; // Border color class or hex
}
