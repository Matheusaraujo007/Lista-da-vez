
import React, { useState } from 'react';

interface FinalizeServiceProps {
  clientName: string;
  onConfirm: (data: { isSale: boolean; saleValue?: number; itemsCount?: number; lossReason?: string; observations?: string }) => void;
  onBack: () => void;
}

const FinalizeService: React.FC<FinalizeServiceProps> = ({ clientName, onConfirm, onBack }) => {
  const [isSale, setIsSale] = useState(true);
  const [saleValue, setSaleValue] = useState<string>('');
  const [itemsCount, setItemsCount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [observations, setObservations] = useState('');

  const handleSubmit = () => {
    if (isSale) {
      if (!saleValue || parseFloat(saleValue) <= 0) return alert('Por favor, informe o valor da compra.');
      if (!itemsCount || parseInt(itemsCount) <= 0) return alert('Por favor, informe a quantidade de peças vendidas.');
    }
    if (!isSale && !reason) return alert('Por favor, selecione o motivo da não venda.');
    
    onConfirm({ 
      isSale, 
      saleValue: isSale ? parseFloat(saleValue) : 0, 
      itemsCount: isSale ? parseInt(itemsCount) : 0,
      lossReason: isSale ? undefined : reason, 
      observations 
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-background-dark animate-in slide-in-from-bottom duration-500">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-5 flex items-center">
        <button onClick={onBack} className="size-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 active:scale-90 transition-all">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 text-center pr-12">
          <h2 className="text-xl font-black tracking-tight">Finalizar Atendimento</h2>
          <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Conclusão do Ciclo CRM</p>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full p-6 space-y-10">
        {/* Card do Cliente Atual */}
        <div className="bg-primary/5 dark:bg-primary/10 p-6 rounded-[2.5rem] border border-primary/20 flex items-center gap-4">
           <div className="size-12 bg-primary rounded-2xl flex items-center justify-center text-white">
              <span className="material-symbols-outlined">person</span>
           </div>
           <div>
              <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Atendimento de:</p>
              <p className="text-xl font-black text-primary leading-none">{clientName}</p>
           </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-center font-black text-2xl">A venda foi convertida?</h3>
          <div className="bg-gray-100 dark:bg-gray-900 p-1.5 rounded-[2rem] flex gap-2">
            <button 
              onClick={() => setIsSale(true)}
              className={`flex-1 h-16 rounded-[1.8rem] flex items-center justify-center gap-2 font-black text-lg transition-all ${isSale ? 'bg-white dark:bg-gray-800 text-green-500 shadow-xl' : 'text-gray-400 opacity-60'}`}
            >
              <span className="material-symbols-outlined font-bold">check_circle</span>
              Sim
            </button>
            <button 
              onClick={() => setIsSale(false)}
              className={`flex-1 h-16 rounded-[1.8rem] flex items-center justify-center gap-2 font-black text-lg transition-all ${!isSale ? 'bg-white dark:bg-gray-800 text-red-500 shadow-xl' : 'text-gray-400 opacity-60'}`}
            >
              <span className="material-symbols-outlined font-bold">cancel</span>
              Não
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {isSale ? (
            <div className="space-y-6 animate-in zoom-in duration-300">
              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase text-gray-400 ml-4 tracking-[0.1em]">Valor da Venda (R$)</label>
                <div className="relative">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-2xl text-green-500">R$</span>
                  <input 
                    autoFocus
                    type="number" 
                    step="0.01"
                    placeholder="0,00" 
                    value={saleValue} 
                    onChange={e => setSaleValue(e.target.value)} 
                    className="w-full h-20 bg-white dark:bg-gray-900 border-0 rounded-[2.5rem] pl-20 pr-8 font-black text-4xl focus:ring-4 focus:ring-green-500/10 transition-all shadow-sm" 
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase text-gray-400 ml-4 tracking-[0.1em]">Quantidade de Peças (P.A.)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-8 top-1/2 -translate-y-1/2 text-primary">inventory_2</span>
                  <input 
                    type="number" 
                    placeholder="Ex: 2" 
                    value={itemsCount} 
                    onChange={e => setItemsCount(e.target.value)} 
                    className="w-full h-20 bg-white dark:bg-gray-900 border-0 rounded-[2.5rem] pl-20 pr-8 font-black text-3xl focus:ring-4 focus:ring-primary/10 transition-all shadow-sm" 
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 animate-in slide-in-from-top duration-300">
              <label className="text-[11px] font-black uppercase text-gray-400 ml-4 tracking-[0.1em]">Motivo da Não Venda</label>
              <select 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-18 bg-white dark:bg-gray-900 border-0 rounded-[2rem] px-6 font-black text-lg focus:ring-4 focus:ring-red-500/10 transition-all shadow-sm appearance-none"
              >
                <option value="">Selecione o motivo...</option>
                <option value="preco">Preço / Orçamento</option>
                <option value="estoque">Falta de Estoque</option>
                <option value="pesquisa">Apenas Pesquisa</option>
                <option value="pagamento">Condições de Pagamento</option>
                <option value="outros">Outros motivos</option>
              </select>
            </div>
          )}

          <div className="space-y-2.5">
            <label className="text-[11px] font-black uppercase text-gray-400 ml-4 tracking-[0.1em]">Observações Internas</label>
            <textarea 
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full h-32 bg-white dark:bg-gray-900 border-0 rounded-[2rem] p-6 font-bold text-base focus:ring-4 focus:ring-primary/10 transition-all shadow-sm resize-none"
              placeholder="Ex: Cliente prometeu voltar na próxima semana para fechar..."
            />
          </div>
        </div>
      </main>

      <footer className="p-8 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800">
        <button 
          onClick={handleSubmit}
          className={`w-full h-18 rounded-[2rem] font-black text-xl shadow-xl transition-all flex items-center justify-center gap-4 active:scale-95 ${isSale ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-red-500 text-white shadow-red-500/20'}`}
        >
          <span className="material-symbols-outlined">verified</span>
          Confirmar e Concluir
        </button>
      </footer>
    </div>
  );
};

export default FinalizeService;
