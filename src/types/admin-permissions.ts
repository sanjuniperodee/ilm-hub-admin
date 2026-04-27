export type PermissionName =
  | 'dashboard.view'
  | 'users.view' | 'users.edit' | 'users.delete'
  | 'content.view' | 'content.create' | 'content.edit' | 'content.delete'
  | 'media.upload' | 'media.delete'
  | 'words.view' | 'words.create' | 'words.edit' | 'words.delete'
  | 'islam.view' | 'islam.create' | 'islam.edit' | 'islam.delete'
  | 'admin.view' | 'admin.create' | 'admin.edit' | 'admin.delete'
  | 'audit.view';

export type UserRole = 'user' | 'content_manager' | 'support' | 'admin';

export interface Permission {
  id: string;
  name: PermissionName;
  labelRu: string;
  descriptionRu?: string;
  groupId: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  labelRu: string;
  orderIndex: number;
  permissions: Permission[];
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastActiveAt?: string;
  emailVerified: boolean;
  permissions: PermissionName[];
}

export interface AdminListItem extends AdminUser {
  permissions: PermissionName[];
}

export interface AdminInviteDto {
  email: string;
  role: UserRole;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface CustomRole {
  id: string;
  name: string;
  labelRu: string;
  descriptionRu?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: CustomRolePermission[];
}

export interface CustomRolePermission {
  id: string;
  permissionId: string;
  permission?: Permission;
}