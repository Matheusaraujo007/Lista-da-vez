
import { Seller, SellerStatus } from './types';

export const MOCK_SELLERS: Seller[] = [
  {
    id: '1',
    name: 'Carlos Alberto',
    avatar: 'https://picsum.photos/seed/carlos/200',
    status: SellerStatus.AVAILABLE,
    queuePosition: 2,
    lastServiceAt: 'há 5min'
  },
  {
    id: '2',
    name: 'Fernanda Souza',
    avatar: 'https://picsum.photos/seed/fernanda/200',
    status: SellerStatus.IN_SERVICE,
    lastServiceAt: 'Em mesa desde 14:30'
  },
  {
    id: '3',
    name: 'Marcos Pontes',
    avatar: 'https://picsum.photos/seed/marcos/200',
    status: SellerStatus.BREAK,
    lastServiceAt: 'Intervalo almoço'
  },
  {
    id: '4',
    name: 'Juliana Lima',
    avatar: 'https://picsum.photos/seed/juliana/200',
    status: SellerStatus.AVAILABLE,
    queuePosition: 3,
    lastServiceAt: 'Próxima na fila'
  },
  {
    id: '5',
    name: 'Ricardo Oliveira',
    avatar: 'https://picsum.photos/seed/ricardo/200',
    status: SellerStatus.AVAILABLE,
    queuePosition: 1,
    lastServiceAt: 'Aguardando há 15 min'
  }
];

export const LOSS_REASONS = [
  { name: 'Preço', value: 45, color: '#135bec' },
  { name: 'Estoque', value: 25, color: '#fbd214' },
  { name: 'Pesquisa', value: 20, color: '#e73908' },
  { name: 'Outros', value: 10, color: '#f0f2f4' }
];
