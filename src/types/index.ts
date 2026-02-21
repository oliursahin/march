import type { EmailStatus, ObjectType } from "@/generated/prisma/enums";

export type { EmailStatus, ObjectType };

export interface SessionPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface EmailObjectListItem {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  receivedAt: Date;
  status: EmailStatus;
  type: ObjectType;
  bodyText: string;
  dueDate: Date | null;
}
