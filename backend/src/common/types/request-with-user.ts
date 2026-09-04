export type AuthUser = {
  userId: string;
  email: string;
  organisationId?: string;
  roleCodes: string[];
  sessionId?: string;
  portal?: 'lms' | 'ops';
};

export type RequestWithUser = Request & {
  user?: AuthUser;
};
