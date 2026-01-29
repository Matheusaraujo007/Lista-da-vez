
import React, { useState, useEffect } from 'react';
import { Seller } from '../types';
import { dbService } from '../services/dbService';

interface StartServiceProps {
  seller: Seller;
  isFiscal?: boolean;
  onCancel: () => void;
  onConfirm: (data: { clientName: string; clientWhatsApp: string; serviceType: any, assignedSellerId?: string }) => void;
}

const StartService: React.FC<StartServiceProps> = ({ seller, isFiscal, onCancel, onConfirm }) => {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [type, setType] = useState('COMPRA');
  const [recurringClient, setRecurringClient] = useState<{ nome: string; nome_vendedor: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (whatsapp.length >= 10) {
        setIsSearching(true);
        const client = await dbService.getClientByWhatsApp(whatsapp);
        if (client) {
          // Fix: Type assertion to match the state definition { nome: string; nome_vendedor: string }
          // This resolves the error: Argument of type 'Record<string, any>' is not assignable to parameter of type 'SetStateAction<{ nome: string; nome_vendedor: string; }>'.
          setRecurringClient(client as { nome: string; nome_vendedor: string });
          setName(client.nome);
        } else {
          setRecurringClient(null);
        }
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [whatsapp]);

  const handleSubmit = () => {
    if (!name.trim()) return alert('Informe o nome do cliente para prosseguir.');
    onConfirm({ 
      clientName: name, 
      clientWhatsApp: whatsapp, 
      serviceType: type, 
      assignedSellerId: seller.id 
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-background-dark animate-in slide-in-from-bottom duration-500">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-5 flex items-center">
        <button onClick={onCancel} className="size-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 active:scale-90 transition-all shadow-sm">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex-1 text-center pr-12">
          <h2 className="text-xl font-black tracking-tight">{isFiscal ? 'Direcionar Cliente' : 'Novo Atendimento'}</h2>
          <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Registro Oficial CRM</p>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full p-6 space-y-8">
        {/* Alerta de Recorrência */}
        {recurringClient && (
          <div className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl animate-in zoom-in duration-300 flex items-center gap-4 border-4 border-white/20">
             <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined text-3xl">star</span></div>
             <div>
               <p className="font-black text-xs uppercase tracking-widest opacity-80">Cliente Recorrente!</p>
               <p className="font-black text-base">Vendedor preferencial: <span className="underline">{recurringClient.nome_vendedor || 'Não informado'}</span></p>
             </div>
          </div>
        )}

        {/* Card do Vendedor */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 flex items-center gap-5">
          <img src={seller.avatar} alt="" className="size-16 rounded-2xl object-cover shadow-2xl" />
          <div>
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Destinar para:</p>
            <p className="text-xl font-black">{seller.name}</p>
          </div>
        </div>

        {/* Formulário */}
        <div className="space-y-6">
          <div className="space-y-2.5">
            <label className="text-[11px] font-black uppercase text-gray-400 ml-4 tracking-[0.1em]">WhatsApp / Contato</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-gray-300">send_to_mobile</span>
              <input 
                value={whatsapp} 
                onChange={e => setWhatsapp(e.target.value)} 
                className="w-full h-18 bg-white dark:bg-gray-900 border-0 rounded-[2rem] pl-16 pr-6 font-bold text-lg focus:ring-4 focus:ring-primary/10 transition-all shadow-sm" 
                placeholder="(00) 00000-0000" 
                type="tel" 
              />
              {isSearching && <div className="absolute right-6 top-1/2 -translate-y-1/2 size-4 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>}
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] font-black uppercase text-gray-400 ml-4 tracking-[0.1em]">Nome do Cliente</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-gray-300">person</span>
              <input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full h-18 bg-white dark:bg-gray-900 border-0 rounded-[2rem] pl-16 pr-6 font-bold text-lg focus:ring-4 focus:ring-primary/10 transition-all shadow-sm" 
                placeholder="Ex: João da Silva" 
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-black text-lg px-2">Objetivo</h3>
          <div className="grid grid-cols-2 gap-3">
            <TypeChip label="Compra" icon="shopping_bag" active={type === 'COMPRA'} onClick={() => setType('COMPRA')} color="bg-blue-500" />
            <TypeChip label="Troca" icon="sync" active={type === 'TROCA'} onClick={() => setType('TROCA')} color="bg-purple-500" />
            <TypeChip label="Orçamento" icon="request_quote" active={type === 'ORCAMENTO'} onClick={() => setType('ORCAMENTO')} color="bg-green-500" />
            <TypeChip label="Dúvidas" icon="help_center" active={type === 'INFORMACAO'} onClick={() => setType('INFORMACAO')} color="bg-orange-500" />
          </div>
        </div>
      </main>

      <footer className="p-8 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800">
        <button 
          onClick={handleSubmit} 
          className="w-full h-18 bg-primary text-white rounded-[2rem] font-black text-xl shadow-xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-4"
        >
          {isFiscal ? 'Confirmar Direcionamento' : 'Iniciar Atendimento'}
        </button>
      </footer>
    </div>
  );
};

const TypeChip: React.FC<{ label: string; icon: string; active: boolean; onClick: () => void; color: string }> = ({ label, icon, active, onClick, color }) => (
  <button 
    onClick={onClick} 
    className={`p-5 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-2 ${active ? `bg-white dark:bg-gray-800 border-primary shadow-lg` : 'bg-white dark:bg-gray-900 border-transparent opacity-50'}`}
  >
    <div className={`size-10 rounded-xl ${active ? color : 'bg-gray-100'} text-white flex items-center justify-center`}>
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{label}</span>
  </button>
);

export default StartService;
