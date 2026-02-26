import type { ObjectStatus, ObjectType } from "@/generated/prisma/enums";

export type { ObjectStatus, ObjectType };

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

export interface ObjListItem {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  receivedAt: Date;
  status: ObjectStatus;
  type: ObjectType;
  bodyText: string;
  dueDate: Date | null;
}
