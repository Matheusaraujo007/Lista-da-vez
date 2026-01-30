
export enum SellerStatus {
  AVAILABLE = 'AVAILABLE',
  IN_SERVICE = 'IN_SERVICE',
  BREAK = 'BREAK',
  LUNCH = 'LUNCH',
  AWAY = 'AWAY',
  VACATION = 'VACATION',
  MATERNITY_LEAVE = 'MATERNITY_LEAVE'
}

export interface CustomStatus {
  id: string;
  label: string;
  icon: string;
  color: string;
  behavior: 'INACTIVE' | 'ACTIVE';
}

export interface StoreGoals {
  id?: string;
  faturamento: number;
  pa: number;
  ticket_medio: number;
  conversao: number;
}

export interface Seller {
  id: string;
  name: string;
  avatar: string;
  status: SellerStatus | string;
  lastServiceAt?: string;
  queuePosition?: number;
  meta_faturamento?: number;
  meta_pa?: number;
  meta_ticket?: number;
  meta_conversao?: number;
  // Added optional properties to track the active service state directly on the seller object
  activeClientName?: string;
  activeServiceId?: string;
  activeServiceStart?: string;
}

export interface ServiceRecord {
  id: string;
  sellerId: string;
  clientName: string;
  clientWhatsApp: string;
  serviceType: 'COMPRA' | 'TROCA' | 'ORCAMENTO' | 'INFORMACAO' | 'REATIVACAO';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  isSale: boolean;
  saleValue?: number;
  itemsCount?: number;
  lossReason?: string;
  observations?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DashboardStats {
  totalServicesToday: number;
  conversionRate: number;
  totalRevenueToday: number;
  topSeller: {
    name: string;
    salesCount: number;
    avatar: string;
  };
}