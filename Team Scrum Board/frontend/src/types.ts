export type User = {
  id: string;
  name?: string | null;
  email: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "PAUSE" | "TEST" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string | null;
  startDate?: string | null;
  assignedTo?: User | null;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMember = {
  user: User;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  createdBy: User;
  members: ProjectMember[];
  tasks: Task[];
  teamId?: string | null;
};

export type TeamMember = {
  user: User;
};

export type Team = {
  id: string;
  name: string;
  createdBy: User;
  members: TeamMember[];
  projects: Project[];
};

export type Attachment = {
  id: string;
  filename: string;
  url: string;
  createdAt: string;
};

export type CommentMention = {
  id: string;
  user: User;
};

export type Comment = {
  id: string;
  content: string;
  author: User;
  attachments: Attachment[];
  mentions: CommentMention[];
  createdAt: string;
  updatedAt: string;
};
