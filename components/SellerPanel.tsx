
import React from 'react';
import { Seller, SellerStatus } from '../types';

interface SellerPanelProps {
  seller: Seller & { activeClientName?: string };
  queue: Seller[];
  allSellers: Seller[];
  onStartService: () => void;
  onFinalizeService: () => void;
  onNavigateToAdmin: () => void;
  onUpdateStatus: (status: string) => void;
}

const SellerPanel: React.FC<SellerPanelProps> = ({ 
  seller, 
  queue, 
  allSellers, 
  onStartService, 
  onFinalizeService,
  onNavigateToAdmin,
  onUpdateStatus
}) => {
  const isFirst = queue[0]?.id === seller.id;
  const inService = allSellers.filter(s => s.status === 'IN_SERVICE');
  const onBreak = allSellers.filter(s => s.status === 'BREAK' || s.status === 'LUNCH');

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <header className="sticky top-0 z-50 flex items-center bg-white dark:bg-background-dark p-4 border-b border-gray-100 dark:border-gray-800 justify-between">
        <div className="flex items-center gap-3">
          <div onClick={onNavigateToAdmin} className="cursor-pointer size-10 rounded-full border-2 border-primary overflow-hidden transition-transform active:scale-90">
             <img src={seller.avatar} alt={seller.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight">Olá, {seller.name.split(' ')[0]}</h2>
            <div className="flex items-center gap-1.5">
               <span className={`size-2 rounded-full ${seller.status === 'AVAILABLE' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                 {seller.status === 'AVAILABLE' ? 'Disponível' : seller.status === 'IN_SERVICE' ? 'Em Atendimento' : 'Em Pausa'}
               </p>
            </div>
          </div>
        </div>
        <button className="size-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 active:bg-gray-200">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      <main className="p-4 space-y-6">
        {seller.status === 'IN_SERVICE' && seller.activeClientName && (
          <div className="bg-primary p-6 rounded-[2.5rem] text-white shadow-2xl animate-in slide-in-from-top duration-500 border-b-8 border-primary-dark">
             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-14 bg-white/20 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined text-3xl">person</span></div>
                  <div>
                    <p className="font-black text-[10px] uppercase tracking-[0.2em] opacity-80">Cliente em Mesa</p>
                    <p className="text-2xl font-black">{seller.activeClientName}</p>
                  </div>
                </div>
                <button 
                  onClick={onFinalizeService}
                  className="bg-white text-primary px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-90 transition-all"
                >
                  Finalizar Agora
                </button>
             </div>
          </div>
        )}

        <div className="text-center py-4">
          <h4 className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Fila de Atendimento</h4>
          <h2 className="text-[#111318] dark:text-white text-3xl font-extrabold leading-tight">
            {seller.status === 'IN_SERVICE' 
              ? 'Bom Atendimento!' 
              : seller.status !== 'AVAILABLE'
                ? 'Você está em pausa' 
                : isFirst 
                  ? 'Você é o próximo!' 
                  : `Sua posição: ${queue.findIndex(s => s.id === seller.id) + 1}º`}
          </h2>
        </div>

        {seller.status !== 'IN_SERVICE' && (
          <button 
            onClick={onStartService}
            disabled={!isFirst || seller.status !== 'AVAILABLE'}
            className={`w-full font-bold py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-2 text-lg active:scale-95 transition-all
              ${isFirst && seller.status === 'AVAILABLE' 
                ? 'bg-primary text-white shadow-primary/30 hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-400 dark:bg-gray-800 cursor-not-allowed shadow-none'}
            `}
          >
            <span className="material-symbols-outlined">person_add</span>
            Chamar Próximo Cliente
          </button>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Lista de Espera</h3>
            <span className="text-xs text-gray-500">{queue.length} ativos</span>
          </div>
          <div className="space-y-3">
            {queue.map((s, idx) => (
              <div 
                key={s.id} 
                className={`flex items-center p-3 rounded-xl border transition-all ${s.id === seller.id ? 'bg-primary/5 border-primary ring-1 ring-primary/20' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}
              >
                <div className={`size-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${s.id === seller.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  {idx + 1}
                </div>
                <img src={s.avatar} alt={s.name} className="size-12 rounded-lg object-cover" />
                <div className="flex-1 ml-3">
                  <p className={`font-bold ${s.id === seller.id ? 'text-primary' : ''}`}>{s.id === seller.id ? 'Você' : s.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Aguardando na vez</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <StatusSummary icon="groups" title="Em Atendimento" count={inService.length} sellers={inService} color="text-blue-500" />
          <StatusSummary icon="coffee" title="Pausa / Almoço" count={onBreak.length} sellers={onBreak} color="text-orange-400" />
        </div>
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

const StatusSummary: React.FC<{ icon: string; title: string; count: number; sellers: Seller[]; color: string }> = ({ icon, title, count, sellers, color }) => (
  <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
    <div className="flex items-center gap-2 mb-3">
      <span className={`material-symbols-outlined ${color} text-lg`}>{icon}</span>
      <h4 className="text-sm font-bold leading-tight">{title}</h4>
    </div>
    <div className="flex -space-x-2 overflow-hidden">
      {sellers.slice(0, 3).map(s => (
        <img key={s.id} src={s.avatar} alt="" className="size-8 rounded-full ring-2 ring-white dark:ring-gray-900 object-cover" />
      ))}
    </div>
  </div>
);

const StatusAction: React.FC<{ icon: string; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex-1 py-2 flex flex-col items-center justify-center transition-all rounded-2xl ${active ? 'text-primary bg-primary/5' : 'text-gray-400 hover:text-gray-600'}`}
  >
    <span className="material-symbols-outlined text-2xl">{icon}</span>
    <span className="text-[10px] font-bold mt-0.5">{label}</span>
  </button>
);

export default SellerPanel;
