// User Roles & Permissions Types
export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface RolePermission {
  canCreateCourses: boolean;
  canEditCourses: boolean;
  canDeleteCourses: boolean;
  canInviteUsers: boolean;
  canManageRoles: boolean;
  canExport: boolean;
  canAccessSettings: boolean;
  canViewAnalytics: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermission> = {
  owner: {
    canCreateCourses: true,
    canEditCourses: true,
    canDeleteCourses: true,
    canInviteUsers: true,
    canManageRoles: true,
    canExport: true,
    canAccessSettings: true,
    canViewAnalytics: true,
  },
  admin: {
    canCreateCourses: true,
    canEditCourses: true,
    canDeleteCourses: true,
    canInviteUsers: true,
    canManageRoles: false,
    canExport: true,
    canAccessSettings: true,
    canViewAnalytics: true,
  },
  editor: {
    canCreateCourses: true,
    canEditCourses: true,
    canDeleteCourses: false,
    canInviteUsers: false,
    canManageRoles: false,
    canExport: true,
    canAccessSettings: false,
    canViewAnalytics: false,
  },
  viewer: {
    canCreateCourses: false,
    canEditCourses: false,
    canDeleteCourses: false,
    canInviteUsers: false,
    canManageRoles: false,
    canExport: false,
    canAccessSettings: false,
    canViewAnalytics: true,
  },
};

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: UserRole;
  joinedAt: string;
  lastActive?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface UserRoleInfo {
  userId: string;
  role: UserRole;
  permissions: RolePermission;
}

// Role display names for UI
export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Ägare',
  admin: 'Administratör',
  editor: 'Redaktör',
  viewer: 'Läsare',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Full kontroll över alla funktioner och inställningar',
  admin: 'Kan hantera kurser och bjuda in användare',
  editor: 'Kan skapa och redigera kurser',
  viewer: 'Kan endast visa kurser och rapporter',
};
