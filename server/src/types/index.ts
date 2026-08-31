export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
  canViewAllDeals: boolean;
  canViewDeptDeals: boolean;
  canEditDeals: boolean;
  canDeleteDeals: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
  canManageIntegrations: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'url';
  options?: string[];
  required?: boolean;
}
