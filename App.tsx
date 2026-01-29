
import React, { useState, useCallback } from 'react';
import { MOCK_SELLERS } from './constants';
import { Seller, SellerStatus, ServiceRecord } from './types';
import { dbService } from './services/dbService';
import AdminDashboard from './components/AdminDashboard';
import SellerPanel from './components/SellerPanel';
import StartService from './components/StartService';
import FinalizeService from './components/FinalizeService';

const App: React.FC = () => {
  const [view, setView] = useState<'ADMIN' | 'SELLER' | 'START_SERVICE' | 'FINALIZE_SERVICE'>('ADMIN');
  const [sellers, setSellers] = useState<Seller[]>(MOCK_SELLERS);
  const [activeService, setActiveService] = useState<ServiceRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentSellerId] = useState<string>('5');
  const currentSeller = sellers.find(s => s.id === currentSellerId)!;

  const queue = sellers
    .filter(s => s.status === SellerStatus.AVAILABLE && s.queuePosition !== undefined)
    .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));

  const updateSellerStatus = useCallback(async (id: string, newStatus: SellerStatus) => {
    setIsSaving(true);
    try {
      await dbService.updateSeller(id, { status: newStatus });
      
      setSellers(prev => {
        const updated = [...prev];
        const index = updated.findIndex(s => s.id === id);
        if (index === -1) return prev;

        const seller = updated[index];
        if (seller.status === SellerStatus.AVAILABLE && newStatus !== SellerStatus.AVAILABLE) {
          seller.queuePosition = undefined;
        }
        if (newStatus === SellerStatus.AVAILABLE && seller.status !== SellerStatus.AVAILABLE) {
          const maxPos = Math.max(...updated.map(s => s.queuePosition || 0), 0);
          seller.queuePosition = maxPos + 1;
        }
        seller.status = newStatus;
        return updated;
      });
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleStartService = async (data: { clientName: string; clientWhatsApp: string; serviceType: any }) => {
    setIsSaving(true);
    try {
      const newService: ServiceRecord = {
        id: '', // Gerado pelo banco
        sellerId: currentSellerId,
        clientName: data.clientName,
        clientWhatsApp: data.clientWhatsApp,
        serviceType: data.serviceType,
        status: 'PENDING',
        isSale: false,
        createdAt: new Date().toISOString(),
      };
      
      const result = await dbService.saveService(newService);
      if (result.success) {
        setActiveService({ ...newService, id: result.id });
        updateSellerStatus(currentSellerId, SellerStatus.IN_SERVICE);
        setView('FINALIZE_SERVICE');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalizeService = async (data: { isSale: boolean; lossReason?: string; observations?: string }) => {
    if (!activeService) return;
    setIsSaving(true);
    try {
      await dbService.saveService({
        ...activeService,
        ...data,
        status: 'COMPLETED',
        completedAt: new Date().toISOString()
      });
      
      await updateSellerStatus(currentSellerId, SellerStatus.AVAILABLE);
      setActiveService(null);
      setView('SELLER');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background-light dark:bg-background-dark ${isSaving ? 'opacity-70 pointer-events-none transition-opacity' : ''}`}>
      {isSaving && (
        <div className="fixed top-0 left-0 w-full h-1 bg-primary overflow-hidden z-[9999]">
          <div className="h-full bg-blue-300 animate-[loading_1.5s_infinite]"></div>
        </div>
      )}
      
      {view === 'ADMIN' && (
        <AdminDashboard 
          sellers={sellers} 
          onNavigateToSeller={() => setView('SELLER')} 
        />
      )}
      
      {view === 'SELLER' && (
        <SellerPanel 
          seller={currentSeller} 
          queue={queue} 
          allSellers={sellers}
          onStartService={() => setView('START_SERVICE')} 
          onNavigateToAdmin={() => setView('ADMIN')}
          onUpdateStatus={(status) => updateSellerStatus(currentSellerId, status)}
        />
      )}
      
      {view === 'START_SERVICE' && (
        <StartService 
          seller={currentSeller} 
          onCancel={() => setView('SELLER')} 
          onConfirm={handleStartService} 
        />
      )}
      
      {view === 'FINALIZE_SERVICE' && (
        <FinalizeService 
          onConfirm={handleFinalizeService} 
          onBack={() => setView('SELLER')}
        />
      )}

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default App;
