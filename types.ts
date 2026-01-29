
export enum SellerStatus {
  AVAILABLE = 'AVAILABLE',
  IN_SERVICE = 'IN_SERVICE',
  BREAK = 'BREAK',
  LUNCH = 'LUNCH',
  AWAY = 'AWAY'
}

export interface Seller {
  id: string;
  name: string;
  avatar: string;
  status: SellerStatus;
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
  lossReasons: {
    name: string;
    value: number;
    color: string;
  }[];
}
