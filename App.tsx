
import React, { useState, useCallback, useEffect } from 'react';
import { Seller, SellerStatus, ServiceRecord } from './types';
import { dbService } from './services/dbService';
import AdminDashboard from './components/AdminDashboard';
import SellerPanel from './components/SellerPanel';
import StartService from './components/StartService';
import FinalizeService from './components/FinalizeService';

const App: React.FC = () => {
  const [view, setView] = useState<'ADMIN' | 'SELLER' | 'START_SERVICE' | 'FINALIZE_SERVICE'>('ADMIN');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [activeService, setActiveService] = useState<ServiceRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSellerId, setCurrentSellerId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Apenas inicializa as tabelas se necessário, mas não insere dados fakes
      await dbService.initDatabase();
      const dbSellers = await dbService.getSellers();
      setSellers(dbSellers);
      
      if (dbSellers.length > 0 && !currentSellerId) {
        setCurrentSellerId(dbSellers[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentSellerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentSeller = sellers.find(s => s.id === currentSellerId);

  const queue = sellers
    .filter(s => s.status === SellerStatus.AVAILABLE && s.queuePosition !== null && s.queuePosition !== undefined)
    .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));

  const updateSellerStatus = useCallback(async (id: string, newStatus: SellerStatus) => {
    setIsSaving(true);
    try {
      await dbService.updateSeller(id, { status: newStatus });
      await loadData();
    } finally {
      setIsSaving(false);
    }
  }, [loadData]);

  const handleStartService = async (data: { clientName: string; clientWhatsApp: string; serviceType: any }) => {
    if (!currentSellerId) return;
    setIsSaving(true);
    try {
      const newService: Partial<ServiceRecord> = {
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
        setActiveService({ ...newService, id: result.id } as ServiceRecord);
        await updateSellerStatus(currentSellerId, SellerStatus.IN_SERVICE);
        setView('FINALIZE_SERVICE');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalizeService = async (data: { isSale: boolean; lossReason?: string; observations?: string }) => {
    if (!activeService || !currentSellerId) return;
    setIsSaving(true);
    try {
      await dbService.saveService({
        ...activeService,
        ...data,
        status: 'COMPLETED',
        completedAt: new Date().toISOString()
      });
      
      await loadData();
      setActiveService(null);
      setView('SELLER');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSellerRegistered = async () => {
    await loadData();
  };

  const handleSelectSeller = (id: string) => {
    setCurrentSellerId(id);
    setView('SELLER');
  };

  if (isLoading && sellers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-primary animate-pulse tracking-widest uppercase">Acessando Neon...</p>
        </div>
      </div>
    );
  }

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
          onNavigateToSeller={() => {
            if (sellers.length > 0) setView('SELLER');
            else alert('Cadastre um vendedor primeiro!');
          }}
          onRefresh={loadData}
          onSelectSeller={handleSelectSeller}
        />
      )}
      
      {view === 'SELLER' && currentSeller && (
        <SellerPanel 
          seller={currentSeller} 
          queue={queue} 
          allSellers={sellers}
          onStartService={() => setView('START_SERVICE')} 
          onNavigateToAdmin={() => setView('ADMIN')}
          onUpdateStatus={(status) => updateSellerStatus(currentSeller.id, status)}
        />
      )}
      
      {view === 'START_SERVICE' && currentSeller && (
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
