export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  phone?: string;
  canViewAllDeals: boolean;
  canViewDeptDeals: boolean;
  canEditDeals: boolean;
  canDeleteDeals: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
  canManageIntegrations: boolean;
  _count?: {
    deals: number;
    tasks: number;
  };
}

export interface Stage {
  id: string;
  pipelineId: string;
  name: string;
  color: string;
  sortOrder: number;
  isWon: boolean;
  isLost: boolean;
  _count?: {
    deals: number;
  };
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  sortOrder: number;
  stages: Stage[];
}

export interface Company {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
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
  deals?: Deal[];
  _count?: {
    messages: number;
  };
}

export interface DealTask {
  id: string;
  dealId?: string;
  responsibleId: string;
  responsible: User;
  type: string;
  text: string;
  dueDate: string;
  isCompleted: boolean;
  resultText?: string;
  deal?: Deal;
}

export interface DealNote {
  id: string;
  dealId: string;
  userId: string;
  user: User;
  type: string;
  content: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  channel: 'whatsapp' | 'telegram' | 'internal';
  direction: 'incoming' | 'outgoing';
  dealId?: string;
  contactId?: string;
  senderName?: string;
  senderPhone?: string;
  senderTgId?: string;
  text: string;
  status: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string;
  budget: number;
  pipelineId: string;
  stageId: string;
  responsibleId: string;
  contactId?: string;
  companyId?: string;
  lossReason?: string;
  tags?: string;
  customFields?: string;
  createdAt: string;
  updatedAt: string;

  pipeline?: Pipeline;
  stage: Stage;
  responsible: User;
  contact?: Contact;
  company?: Company;
  tasks?: DealTask[];
  notes?: DealNote[];
  messages?: ChatMessage[];
}

export interface MessengerStatus {
  channel: string;
  status: 'disconnected' | 'qr_ready' | 'connecting' | 'connected';
  qrCodeData?: string;
  phone?: string;
  accountName?: string;
  updatedAt: string;
}
