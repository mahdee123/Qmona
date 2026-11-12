export const ROLES = ["super_admin", "content_editor", "inquiry_manager"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  content_editor: "Content Editor",
  inquiry_manager: "Inquiry Manager",
};

/** Staff account stored in MongoDB. There is no public registration. */
export interface UserAttrs {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  password_hash: string;
  last_login: Date | null;
  date_joined: Date;
  updated_at: Date;
}

/** The authenticated user attached to a request (no password hash). */
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  last_login: Date | null;
  date_joined: Date;
}

export const isSuperAdmin = (u: Pick<AuthUser, "role">) => u.role === "super_admin";
export const isContentEditor = (u: Pick<AuthUser, "role">) => u.role === "super_admin" || u.role === "content_editor";
export const isInquiryManager = (u: Pick<AuthUser, "role">) => u.role === "super_admin" || u.role === "inquiry_manager";

export function capabilities(u: Pick<AuthUser, "role">) {
  return {
    manage_content: isContentEditor(u),
    manage_inquiries: isInquiryManager(u),
    manage_users: isSuperAdmin(u),
    view_audit_log: isSuperAdmin(u),
  };
}
