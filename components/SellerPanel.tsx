
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Seller, SellerStatus, StoreGoals } from '../types';
import { dbService } from '../services/dbService';
import { getPAEmoji, getTicketEmoji } from './AdminDashboard';

interface SellerPanelProps {
  seller: Seller & { activeClientName?: string; activeServiceId?: string; activeServiceStart?: string };
  queue: Seller[];
  allSellers: (Seller & { activeClientName?: string; activeServiceId?: string; activeServiceStart?: string })[];
  reportData?: any[];
  onStartService: () => void;
  onFinalizeService: () => void;
  onNavigateToAdmin: () => void;
  onUpdateStatus: (status: string) => void;
}

const SellerPanel: React.FC<SellerPanelProps> = ({ 
  seller, 
  queue, 
  allSellers, 
  reportData = [],
  onStartService, 
  onFinalizeService,
  onNavigateToAdmin,
  onUpdateStatus
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [storeGoals, setStoreGoals] = useState<StoreGoals>({ faturamento: 5000, pa: 2, ticket_medio: 350, conversao: 40 });
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    dbService.getStoreGoals().then(setStoreGoals);
    return () => clearInterval(timer);
  }, []);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUpdatingPhoto(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          await dbService.updateSeller(seller.id, { avatar_url: base64 });
          window.location.reload(); 
        } catch (err) {
          alert('Erro ao atualizar foto.');
        } finally {
          setIsUpdatingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDuration = (start?: string) => {
    if (!start) return "0m 00s";
    const startTime = new Date(start).getTime();
    const diff = currentTime.getTime() - startTime;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const isFirst = queue[0]?.id === seller.id;

  // Usa meta individual ou meta da loja
  const myGoals = {
    faturamento: seller.meta_faturamento || storeGoals.faturamento,
    pa: seller.meta_pa || storeGoals.pa,
    ticket: seller.meta_ticket || storeGoals.ticket_medio,
    conversao: seller.meta_conversao || storeGoals.conversao
  };

  const myStats = useMemo(() => {
    const records = reportData.filter(r => r.vendedor_id === seller.id && r.venda_realizada !== null);
    const sales = records.filter(r => r.venda_realizada).length;
    const revenue = records.reduce((acc, curr) => acc + Number(curr.valor_venda || 0), 0);
    const items = records.reduce((acc, curr) => acc + Number(curr.itens_venda || 0), 0);
    
    const paVal = sales > 0 ? (items / sales).toFixed(2) : "0.00";
    const ticketStr = sales > 0 ? (revenue / sales).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00";
    
    return {
      sales,
      revenue,
      pa: paVal,
      ticket: ticketStr,
      paEmoji: getPAEmoji(paVal),
      ticketEmoji: getTicketEmoji(ticketStr)
    };
  }, [reportData, seller.id]);

  const faturamentoPercent = Math.min(Math.round((myStats.revenue / (myGoals.faturamento || 1)) * 100), 100);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <header className="sticky top-0 z-50 flex items-center bg-white dark:bg-background-dark p-4 border-b border-gray-100 dark:border-gray-800 justify-between">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div onClick={handlePhotoClick} className={`cursor-pointer size-12 rounded-2xl border-2 border-primary overflow-hidden transition-all active:scale-90 hover:brightness-75 ${isUpdatingPhoto ? 'animate-pulse opacity-50' : ''}`}>
               <img src={seller.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} alt={seller.name} className="w-full h-full object-cover" />
               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 text-white transition-opacity"><span className="material-symbols-outlined text-sm">edit</span></div>
            </div>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
          </div>
          <div>
            <div className="flex items-center gap-2">
                <h2 className="text-[#111318] dark:text-white text-lg font-bold">Olá, {seller.name.split(' ')[0]}</h2>
                <button onClick={onNavigateToAdmin} className="size-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-xs">logout</span></button>
            </div>
            <div className="flex items-center gap-1.5">
               <span className={`size-2 rounded-full ${seller.status === 'AVAILABLE' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{seller.status === 'AVAILABLE' ? 'Disponível' : seller.status === 'IN_SERVICE' ? 'Em Atendimento' : 'Em Pausa'}</p>
            </div>
          </div>
        </div>
        <button className="size-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"><span className="material-symbols-outlined">notifications</span></button>
      </header>

      <main className="p-4 space-y-6">
        {/* Progresso baseado na meta (Individual ou Loja) */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
           <div className="flex justify-between items-end">
              <div>
                 <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Meu Faturamento</p>
                 <p className="text-xl font-black text-primary">R$ {myStats.revenue.toLocaleString('pt-BR')}</p>
              </div>
              <p className="text-[9px] font-black text-gray-400">Objetivo: R$ {myGoals.faturamento}</p>
           </div>
           <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full bg-primary transition-all duration-700 ${faturamentoPercent >= 100 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : ''}`} 
                style={{ width: `${faturamentoPercent}%` }}
              ></div>
           </div>
           {faturamentoPercent >= 100 && <p className="text-center text-[8px] font-black text-green-500 uppercase tracking-widest">VOCÊ BATEU SUA META! 🏆</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
           <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col items-center">
              <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Meu P.A. Hoje</p>
              <div className="flex items-center gap-2">
                 <span className="text-xl font-black text-pink-500">{myStats.pa}</span>
                 <span className="text-xl">{myStats.paEmoji}</span>
              </div>
              {parseFloat(myStats.pa) >= myGoals.pa && <span className="text-[7px] font-black text-green-500 mt-1">META BATIDA! 🌟</span>}
           </div>
           <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col items-center">
              <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Meu Ticket Médio</p>
              <div className="flex items-center gap-2">
                 <span className="text-sm font-black text-primary">R$ {myStats.ticket}</span>
                 <span className="text-xl">{myStats.ticketEmoji}</span>
              </div>
           </div>
        </div>

        {seller.activeClientName && (
          <div className="bg-primary p-6 rounded-[2.5rem] text-white shadow-2xl animate-in slide-in-from-top duration-500 border-b-8 border-primary-dark">
             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-14 bg-white/20 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined text-3xl">person</span></div>
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="font-black text-[10px] uppercase tracking-[0.2em] opacity-80">Cliente em Mesa</p>
                       <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-lg">{formatDuration(seller.activeServiceStart)}</span>
                    </div>
                    <p className="text-2xl font-black">{seller.activeClientName}</p>
                  </div>
                </div>
                <button onClick={onFinalizeService} className="bg-white text-primary px-5 py-3 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-90 transition-all">Finalizar</button>
             </div>
          </div>
        )}

        <div className="text-center py-4">
          <h4 className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Fila de Atendimento</h4>
          <h2 className="text-[#111318] dark:text-white text-3xl font-extrabold">
            {seller.activeClientName ? 'Bom Atendimento!' : seller.status !== 'AVAILABLE' ? 'Você está em pausa' : isFirst ? 'Você é o próximo!' : `Sua posição: ${queue.findIndex(s => s.id === seller.id) + 1}º`}
          </h2>
        </div>

        {!seller.activeClientName && (
          <button onClick={onStartService} disabled={!isFirst || seller.status !== 'AVAILABLE'} className={`w-full font-bold py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-2 text-lg active:scale-95 transition-all ${isFirst && seller.status === 'AVAILABLE' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400 dark:bg-gray-800'}`}><span className="material-symbols-outlined">person_add</span> Chamar Próximo Cliente</button>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-bold text-lg">Lista de Espera</h3><span className="text-xs text-gray-500">{queue.length} ativos</span></div>
          <div className="space-y-3">
            {queue.map((s, idx) => (
              <div key={s.id} className={`flex items-center p-3 rounded-xl border transition-all ${s.id === seller.id ? 'bg-primary/5 border-primary ring-1' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                <div className={`size-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${s.id === seller.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{idx + 1}</div>
                <img src={s.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} alt={s.name} className="size-12 rounded-lg object-cover" />
                <div className="flex-1 ml-3"><p className={`font-bold ${s.id === seller.id ? 'text-primary' : ''}`}>{s.id === seller.id ? 'Você' : s.name}</p><p className="text-[10px] text-gray-400 uppercase">Aguardando na vez</p></div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white dark:bg-gray-900 shadow-2xl rounded-3xl border border-gray-100 dark:border-gray-800 p-2 flex justify-between items-center z-50">
        <StatusAction icon="check_circle" label="Disponível" active={seller.status === 'AVAILABLE'} onClick={() => onUpdateStatus('AVAILABLE')} />
        <StatusAction icon="schedule" label="Pausa" active={seller.status === 'BREAK'} onClick={() => onUpdateStatus('BREAK')} />
        <StatusAction icon="restaurant" label="Almoço" active={seller.status === 'LUNCH'} onClick={() => onUpdateStatus('LUNCH')} />
        <StatusAction icon="history" label="Histórico" onClick={() => alert('Recurso em breve')} />
      </div>
    </div>
  );
};

const StatusAction: React.FC<{ icon: string; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex-1 py-2 flex flex-col items-center justify-center transition-all rounded-2xl ${active ? 'text-primary bg-primary/5' : 'text-gray-400'}`}><span className="material-symbols-outlined text-2xl">{icon}</span><span className="text-[10px] font-bold mt-0.5">{label}</span></button>
);

export default SellerPanel;
