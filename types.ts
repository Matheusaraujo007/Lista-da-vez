
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

export interface Seller {
  id: string;
  name: string;
  avatar: string;
  status: SellerStatus | string; // Suporta status nativos e IDs de status customizados
  lastServiceAt?: string;
  queuePosition?: number;
}

export interface ServiceRecord {
  id: string;
  sellerId: string;
  clientName: string;
  clientWhatsApp: string;
  serviceType: 'COMPRA' | 'TROCA' | 'ORCAMENTO' | 'INFORMACAO';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  isSale: boolean;
  lossReason?: string;
  observations?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DashboardStats {
  totalServicesToday: number;
  conversionRate: number;
  topSeller: {
    name: string;
    salesCount: number;
    avatar: string;
  };
}
