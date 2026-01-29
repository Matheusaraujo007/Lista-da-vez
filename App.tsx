
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
  const [sellers, setSellers] = useState<(Seller & { activeClientName?: string, activeServiceId?: string, activeServiceStart?: string })[]>([]);
  const [activeService, setActiveService] = useState<Partial<ServiceRecord> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSellerId, setCurrentSellerId] = useState<string | null>(localStorage.getItem('sellerId'));
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const [isFiscal, setIsFiscal] = useState(localStorage.getItem('isFiscal') === 'true');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      await dbService.initDatabase();
      const dbSellers = await dbService.getSellers();
      setSellers(dbSellers);
      
      if (currentSellerId && !isAdmin) {
        const current = dbSellers.find(s => s.id === currentSellerId);
        if (current?.activeServiceId) {
           setActiveService({ 
             id: current.activeServiceId, 
             sellerId: current.id, 
             clientName: current.activeClientName,
             createdAt: current.activeServiceStart
           });
        } else {
           setActiveService(null);
        }
      }

      // Define a visão inicial apenas no primeiro carregamento
      if (showLoading) {
        if (isAdmin) setView('ADMIN');
        else if (isFiscal) setView('FISCAL');
        else if (currentSellerId && dbSellers.some(s => s.id === currentSellerId)) setView('SELLER');
        else setView('LOGIN');
      }
    } catch (error) {
      console.error("Erro ao sincronizar dados:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [currentSellerId, isAdmin, isFiscal]);

  // Polling para manter a lista atualizada para todos
  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 10000); // Atualiza a cada 10s
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAdminLogin = () => { setIsAdmin(true); localStorage.setItem('isAdmin', 'true'); setView('ADMIN'); };
  const handleFiscalLogin = () => { setIsFiscal(true); localStorage.setItem('isFiscal', 'true'); setView('FISCAL'); };
  const handleSellerLogin = (id: string) => { setCurrentSellerId(id); localStorage.setItem('sellerId', id); setView('SELLER'); };
  
  const handleLogout = () => {
    localStorage.removeItem('sellerId');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isFiscal');
    setCurrentSellerId(null);
    setIsAdmin(false);
    setIsFiscal(false);
    setView('LOGIN');
  };

  const updateSellerStatus = useCallback(async (id: string, newStatus: string) => {
    setIsSaving(true);
    try {
      await dbService.updateSeller(id, { status: newStatus });
      await loadData(false);
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
        await updateSellerStatus(targetSellerId, SellerStatus.IN_SERVICE);
        if (!isFiscal && !isAdmin && targetSellerId === currentSellerId) {
          setActiveService({ ...newService, id: result.id });
          setView('FINALIZE_SERVICE');
        } else {
          setView(isAdmin ? 'ADMIN' : 'FISCAL');
        }
        await loadData(false);
      }
    } catch (e) {
      alert('Erro ao iniciar atendimento');
    } finally {
      setIsSaving(false);
    }
  };

  const currentSeller = sellers.find(s => s.id === currentSellerId);
  const queue = sellers
    .filter(s => (s.status === 'AVAILABLE' || s.status === SellerStatus.AVAILABLE) && s.queuePosition !== null)
    .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));

  return (
    <div className={`min-h-screen flex flex-col bg-gray-50 dark:bg-background-dark text-gray-900 dark:text-gray-100 ${isSaving ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="fixed bottom-32 right-6 z-[200]">
        <button onClick={() => setDarkMode(!darkMode)} className="size-14 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-full shadow-2xl border border-white/20 flex items-center justify-center active:scale-90 transition-all">
          <span className={`material-symbols-outlined text-3xl ${darkMode ? 'text-blue-400 rotate-180' : 'text-yellow-500'}`}>
            {darkMode ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
      </div>

      {view === 'LOGIN' && <Login sellers={sellers} onAdminLogin={handleAdminLogin} onFiscalLogin={handleFiscalLogin} onSellerLogin={handleSellerLogin} />}
      {view === 'ADMIN' && (
        <AdminDashboard 
          sellers={sellers} 
          onNavigateToSeller={handleLogout} 
          onRefresh={() => loadData(false)} 
          onSelectSeller={(id) => { setCurrentSellerId(id); setView('SELLER'); }} 
          onFinalizeService={(service) => {
            setActiveService(service);
            setView('FINALIZE_SERVICE');
          }}
        />
      )}
      {view === 'FISCAL' && <FiscalPanel sellers={sellers} queue={queue} onLogout={handleLogout} onRefresh={() => loadData(false)} onAssignClient={(sellerId) => { setCurrentSellerId(sellerId); setView('START_SERVICE'); }} onUpdateStatus={updateSellerStatus} />}
      {view === 'SELLER' && currentSeller && <SellerPanel seller={currentSeller} queue={queue} allSellers={sellers} onStartService={() => setView('START_SERVICE')} onFinalizeService={() => setView('FINALIZE_SERVICE')} onNavigateToAdmin={handleLogout} onUpdateStatus={(status) => updateSellerStatus(currentSeller.id, status)} />}
      {view === 'START_SERVICE' && <StartService seller={sellers.find(s => s.id === currentSellerId)!} isFiscal={isFiscal || isAdmin} onCancel={() => setView(isAdmin ? 'ADMIN' : isFiscal ? 'FISCAL' : 'SELLER')} onConfirm={handleStartService} />}
      
      {view === 'FINALIZE_SERVICE' && (
        <FinalizeService 
          clientName={activeService?.clientName || 'Cliente'} 
          onConfirm={async (data) => {
            if (!activeService?.id || !activeService?.sellerId) return;
            setIsSaving(true);
            try {
              await dbService.saveService({...activeService, ...data, status: 'COMPLETED'});
              await loadData(false);
              setActiveService(null);
              setView(isAdmin ? 'ADMIN' : 'SELLER');
            } catch (e) {
              alert('Erro ao finalizar. Verifique os dados.');
            } finally {
              setIsSaving(false);
            }
          }} 
          onBack={() => setView(isAdmin ? 'ADMIN' : 'SELLER')} 
        />
      )}
    </div>
  );
};

export default App;
