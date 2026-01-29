
import React, { useState, useCallback, useEffect } from 'react';
import { Seller, SellerStatus, ServiceRecord } from './types';
import { dbService } from './services/dbService';
import AdminDashboard from './components/AdminDashboard';
import SellerPanel from './components/SellerPanel';
import StartService from './components/StartService';
import FinalizeService from './components/FinalizeService';
import Login from './components/Login';
import FiscalPanel from './components/FiscalPanel';

const App: React.FC = () => {
  const [view, setView] = useState<'LOGIN' | 'ADMIN' | 'SELLER' | 'FISCAL' | 'START_SERVICE' | 'FINALIZE_SERVICE'>('LOGIN');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [activeService, setActiveService] = useState<ServiceRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSellerId, setCurrentSellerId] = useState<string | null>(localStorage.getItem('sellerId'));
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const [isFiscal, setIsFiscal] = useState(localStorage.getItem('isFiscal') === 'true');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  // Sincronização de Tema
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await dbService.initDatabase();
      const dbSellers = await dbService.getSellers();
      setSellers(dbSellers);
      
      // Decidir view baseada no login persistido
      if (isAdmin) {
        setView('ADMIN');
      } else if (isFiscal) {
        setView('FISCAL');
      } else if (currentSellerId && dbSellers.some(s => s.id === currentSellerId)) {
        setView('SELLER');
      } else {
        setView('LOGIN');
      }
    } catch (error) {
      console.error("Erro ao sincronizar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentSellerId, isAdmin, isFiscal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdminLogin = () => {
    setIsAdmin(true);
    localStorage.setItem('isAdmin', 'true');
    setView('ADMIN');
  };

  const handleFiscalLogin = () => {
    setIsFiscal(true);
    localStorage.setItem('isFiscal', 'true');
    setView('FISCAL');
  };

  const handleSellerLogin = (id: string) => {
    setCurrentSellerId(id);
    localStorage.setItem('sellerId', id);
    setView('SELLER');
  };

  const handleLogout = () => {
    localStorage.removeItem('sellerId');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isFiscal');
    setCurrentSellerId(null);
    setIsAdmin(false);
    setIsFiscal(false);
    setView('LOGIN');
  };

  const updateSellerStatus = useCallback(async (id: string, newStatus: SellerStatus) => {
    setIsSaving(true);
    try {
      await dbService.updateSeller(id, { status: newStatus });
      await loadData();
    } finally {
      setIsSaving(false);
    }
  }, [loadData]);

  const handleStartService = async (data: { clientName: string; clientWhatsApp: string; serviceType: any, assignedSellerId?: string }) => {
    const targetSellerId = data.assignedSellerId || currentSellerId;
    if (!targetSellerId) return;

    setIsSaving(true);
    try {
      const newService: Partial<ServiceRecord> = {
        sellerId: targetSellerId,
        clientName: data.clientName,
        clientWhatsApp: data.clientWhatsApp,
        serviceType: data.serviceType,
        status: 'PENDING',
        isSale: false,
        createdAt: new Date().toISOString(),
      };
      
      const result = await dbService.saveService(newService);
      if (result.success) {
        // Se for o próprio vendedor iniciando, ele vai para a tela de finalizar
        if (!isFiscal && targetSellerId === currentSellerId) {
          setActiveService({ ...newService, id: result.id } as ServiceRecord);
          setView('FINALIZE_SERVICE');
        } else {
          // Se for o fiscal, ele volta para o painel de controle
          setView('FISCAL');
        }
        // Atualiza status para IN_SERVICE (independente de já estar, o banco lida)
        await updateSellerStatus(targetSellerId, SellerStatus.IN_SERVICE);
      }
    } catch (e) {
      alert('Erro ao iniciar atendimento');
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

  const toggleTheme = () => setDarkMode(!darkMode);

  if (isLoading && view === 'LOGIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background-dark">
        <div className="text-center space-y-4">
          <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-black text-primary animate-pulse tracking-[0.2em] uppercase text-xs">Sincronizando Sistema...</p>
        </div>
      </div>
    );
  }

  const currentSeller = sellers.find(s => s.id === currentSellerId);
  const queue = sellers
    .filter(s => s.status === SellerStatus.AVAILABLE && s.queuePosition !== null)
    .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));

  return (
    <div className={`min-h-screen flex flex-col bg-gray-50 dark:bg-background-dark text-gray-900 dark:text-gray-100 ${isSaving ? 'opacity-70 pointer-events-none transition-opacity' : ''}`}>
      {/* Botão de Tema Flutuante Premium */}
      <button 
        onClick={toggleTheme}
        className="fixed top-5 right-5 z-[100] size-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 flex items-center justify-center active:scale-90 transition-all hover:rotate-12 group"
      >
        <span className={`material-symbols-outlined transition-colors duration-500 ${darkMode ? 'text-blue-400' : 'text-yellow-500'}`}>
          {darkMode ? 'dark_mode' : 'light_mode'}
        </span>
      </button>

      {view === 'LOGIN' && (
        <Login 
          sellers={sellers} 
          onAdminLogin={handleAdminLogin} 
          onFiscalLogin={handleFiscalLogin} 
          onSellerLogin={handleSellerLogin} 
        />
      )}
      
      {view === 'ADMIN' && (
        <AdminDashboard 
          sellers={sellers} 
          onNavigateToSeller={handleLogout} 
          onRefresh={loadData} 
          onSelectSeller={(id) => { setCurrentSellerId(id); setView('SELLER'); }} 
        />
      )}
      
      {view === 'FISCAL' && (
        <FiscalPanel 
          sellers={sellers} 
          queue={queue} 
          onLogout={handleLogout} 
          onRefresh={loadData} 
          onAssignClient={(sellerId) => { setCurrentSellerId(sellerId); setView('START_SERVICE'); }} 
          onUpdateStatus={updateSellerStatus} 
        />
      )}

      {view === 'SELLER' && currentSeller && (
        <SellerPanel 
          seller={currentSeller} 
          queue={queue} 
          allSellers={sellers} 
          onStartService={() => setView('START_SERVICE')} 
          onNavigateToAdmin={handleLogout} 
          onUpdateStatus={(status) => updateSellerStatus(currentSeller.id, status)} 
        />
      )}
      
      {view === 'START_SERVICE' && (
        <StartService 
          seller={sellers.find(s => s.id === currentSellerId)!} 
          isFiscal={isFiscal}
          onCancel={() => setView(isFiscal ? 'FISCAL' : 'SELLER')} 
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
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
