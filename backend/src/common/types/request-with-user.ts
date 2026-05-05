export type AuthUser = {
  userId: string;
  email: string;
  organisationId?: string;
  roleCodes: string[];
};

export type RequestWithUser = Request & {
  user?: AuthUser;
};
