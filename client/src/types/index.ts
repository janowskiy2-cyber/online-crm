export type ProjectCategory = 'employers' | 'candidates' | 'agencies' | 'legal_logistics';

export interface ProjectInfo {
  id: ProjectCategory;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  phone?: string;
  isActive?: boolean;
  canViewAllDeals?: boolean;
  canViewDeptDeals?: boolean;
  canEditDeals?: boolean;
  canDeleteDeals?: boolean;
  canExportData?: boolean;
  canManageUsers?: boolean;
  canManageIntegrations?: boolean;
}

export interface Stage {
  id: string;
  pipelineId: string;
  name: string;
  color: string;
  sortOrder: number;
  isWon?: boolean;
  isLost?: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  projectId?: ProjectCategory;
  isDefault?: boolean;
  sortOrder: number;
  stages: Stage[];
}

export interface CandidateDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  category?: 'resume' | 'video' | 'passport' | 'certificate' | 'contract' | 'document';
  size?: number;
  uploadedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
  position?: string;
  companyId?: string;
  company?: Company;
  type?: 'employer' | 'candidate' | 'agency_partner' | 'logistician' | string;
  country?: string;
  profession?: string;
  status?: string;
  videoUrl?: string;
  resumeUrl?: string;
  documents?: string | CandidateDocument[];
}

export interface Company {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  industry?: string;
  type?: 'client_enterprise' | 'donor_agency' | 'logistics_partner';
}

export interface Deal {
  id: string;
  title: string;
  budget: number;
  pipelineId: string;
  stageId: string;
  responsibleId: string;
  responsible?: User;
  contactId?: string;
  contact?: Contact;
  companyId?: string;
  company?: Company;
  tags?: string;
  customFields?: string;
  projectId?: ProjectCategory;
  createdAt?: string;
  updatedAt?: string;
  notes?: DealNote[];
  messages?: ChatMessage[];
  tasks?: Task[];
  stage?: Stage;
}

export interface DealNote {
  id: string;
  dealId: string;
  userId: string;
  user?: User;
  content: string;
  type: string;
  createdAt: string;
}

export interface Task {
  id: string;
  dealId?: string;
  responsibleId: string;
  responsible?: User;
  createdById?: string;
  createdBy?: User;
  type: string;
  text: string;
  dueDate: string;
  isCompleted: boolean;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  dealId?: string;
  contactId?: string;
  channel: 'whatsapp' | 'telegram';
  direction: 'incoming' | 'outgoing';
  senderName?: string;
  senderPhone?: string;
  senderTgId?: string;
  text: string;
  status: string;
  createdAt: string;
}

export interface MessengerStatus {
  channel: 'whatsapp' | 'telegram';
  status: 'disconnected' | 'qr_ready' | 'connecting' | 'connected';
  accountName?: string;
  phone?: string;
  qrCodeData?: string | null;
  updatedAt: string;
}
