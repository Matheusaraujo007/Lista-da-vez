
import React from 'react';
import { Seller, SellerStatus } from '../types';
import { getPAEmoji, getTicketEmoji } from './AdminDashboard';

interface FiscalPanelProps {
  sellers: (Seller & { activeClientName?: string })[];
  queue: Seller[];
  reportData?: any[];
  onLogout: () => void;
  onRefresh: () => void;
  onAssignClient: (sellerId: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

const FiscalPanel: React.FC<FiscalPanelProps> = ({ sellers, queue, reportData = [], onLogout, onRefresh, onAssignClient, onUpdateStatus }) => {
  
  const getSellerMetrics = (sellerId: string) => {
    const records = reportData.filter(r => r.vendedor_id === sellerId && r.venda_realizada !== null);
    const sales = records.filter(r => r.venda_realizada).length;
    const revenue = records.reduce((acc, curr) => acc + Number(curr.valor_venda || 0), 0);
    const items = records.reduce((acc, curr) => acc + Number(curr.itens_venda || 0), 0);
    
    const paVal = sales > 0 ? (items / sales).toFixed(1) : "0.0";
    const ticketStr = sales > 0 ? (revenue / sales).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "0";
    
    return {
      pa: paVal,
      ticket: ticketStr,
      paEmoji: getPAEmoji(paVal),
      ticketEmoji: getTicketEmoji(ticketStr)
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background-dark pb-32">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-5 flex items-center justify-between">
        <button onClick={onLogout} className="size-12 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 active:scale-90 transition-all">
          <span className="material-symbols-outlined">logout</span>
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black tracking-tight">Painel Fiscal</h2>
          <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest leading-none">Gestão de Fluxo</p>
        </div>
        <button onClick={onRefresh} className="size-12 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-primary active:rotate-180 transition-all">
          <span className="material-symbols-outlined">sync</span>
        </button>
      </header>

      <main className="p-4 space-y-8 max-w-2xl mx-auto">
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h3 className="font-black text-2xl">Próximos da Vez</h3>
            <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">{queue.length}</span>
          </div>

          <div className="grid gap-3">
            {queue.map((s, idx) => {
              const metrics = getSellerMetrics(s.id);
              return (
                <div key={s.id} className="bg-white dark:bg-gray-900 p-5 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-5 group animate-in slide-in-from-right duration-300">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl italic">{idx + 1}º</div>
                  <img src={s.avatar} alt="" className="size-14 rounded-2xl object-cover shadow-md" />
                  <div className="flex-1">
                    <p className="font-black text-lg leading-tight">{s.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                       <div className="flex items-center gap-1 opacity-80">
                          <span className="text-[10px] font-black text-pink-500">PA: {metrics.pa}</span>
                          <span className="text-xs">{metrics.paEmoji}</span>
                       </div>
                       <div className="flex items-center gap-1 opacity-80">
                          <span className="text-[10px] font-black text-primary">TK: {metrics.ticket}</span>
                          <span className="text-xs">{metrics.ticketEmoji}</span>
                       </div>
                    </div>
                  </div>
                  <button onClick={() => onAssignClient(s.id)} className="bg-primary text-white h-14 px-6 rounded-2xl text-[10px] font-black shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 transition-all">DIRECIONAR</button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h3 className="font-black text-2xl">Floor Monitor</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempo Real</p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800 shadow-xl">
            {sellers.map(s => {
              const metrics = getSellerMetrics(s.id);
              return (
                <div key={s.id} className="p-6 flex items-center gap-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <div className="relative">
                    <img src={s.avatar} alt="" className="size-16 rounded-[1.5rem] object-cover" />
                    <span className={`absolute -bottom-1 -right-1 size-5 border-4 border-white dark:border-gray-900 rounded-full ${s.status === 'AVAILABLE' ? 'bg-green-500' : s.status === 'IN_SERVICE' ? 'bg-blue-500' : 'bg-orange-400'}`}></span>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-xl leading-none mb-1.5">{s.name}</p>
                    <div className="flex items-center gap-3 mb-2">
                       <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black text-pink-500 uppercase tracking-tighter">P.A. {metrics.pa} {metrics.paEmoji}</span>
                       </div>
                       <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black text-primary uppercase tracking-tighter">Tkt R$ {metrics.ticket} {metrics.ticketEmoji}</span>
                       </div>
                    </div>
                    {s.status === 'IN_SERVICE' ? (
                      <div className="flex items-center gap-1 animate-pulse">
                         <span className="material-symbols-outlined text-sm text-primary">person</span>
                         <p className="text-[10px] font-black text-primary uppercase">{s.activeClientName || 'Cliente em Mesa'}</p>
                      </div>
                    ) : (
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {s.status === 'AVAILABLE' ? 'Livre na fila' : 'Em Pausa'}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button onClick={() => onAssignClient(s.id)} className={`size-12 flex items-center justify-center rounded-2xl shadow-lg transition-all ${s.status === 'IN_SERVICE' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}><span className="material-symbols-outlined">person_add</span></button>
                    <button onClick={() => onUpdateStatus(s.id, s.status === 'AVAILABLE' ? 'BREAK' : 'AVAILABLE')} className="size-12 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400"><span className="material-symbols-outlined">settings_accessibility</span></button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default FiscalPanel;
