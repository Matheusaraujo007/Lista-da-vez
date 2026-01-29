
import React, { useState } from 'react';

interface FinalizeServiceProps {
  onConfirm: (data: { isSale: boolean; lossReason?: string; observations?: string }) => void;
  onBack: () => void;
}

const FinalizeService: React.FC<FinalizeServiceProps> = ({ onConfirm, onBack }) => {
  const [isSale, setIsSale] = useState(true);
  const [reason, setReason] = useState('');
  const [observations, setObservations] = useState('');

  const handleSubmit = () => {
    if (!isSale && !reason) return alert('Por favor, selecione o motivo da não venda');
    onConfirm({ isSale, lossReason: isSale ? undefined : reason, observations });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <button onClick={onBack} className="size-12 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-12">Finalizar Atendimento</h2>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-md mx-auto p-6 space-y-8">
          <h3 className="text-2xl font-bold text-center">A venda foi realizada?</h3>

          <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl flex gap-1 shadow-inner">
            <button 
              onClick={() => setIsSale(true)}
              className={`flex-1 py-4 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${isSale ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-400'}`}
            >
              <span className="material-symbols-outlined">check_circle</span>
              Sim
            </button>
            <button 
              onClick={() => setIsSale(false)}
              className={`flex-1 py-4 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${!isSale ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm' : 'text-gray-400'}`}
            >
              <span className="material-symbols-outlined">cancel</span>
              Não
            </button>
          </div>

          {!isSale && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <label className="font-semibold block">Motivo da Não Venda</label>
              <select 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-14 rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 focus:ring-primary focus:border-primary"
              >
                <option value="">Selecione o motivo</option>
                <option value="preco">Preço alto</option>
                <option value="estoque">Falta de estoque</option>
                <option value="pesquisa">Apenas pesquisa</option>
                <option value="pagamento">Condições de pagamento</option>
                <option value="outros">Outros motivos</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="font-semibold block">Observações (Opcional)</label>
            <textarea 
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full min-h-[140px] rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 focus:ring-primary focus:border-primary resize-none"
              placeholder="Descreva detalhes adicionais aqui..."
            />
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white dark:bg-background-dark border-t border-gray-100 dark:border-gray-800 z-50">
        <div className="max-w-md mx-auto">
          <button 
            onClick={handleSubmit}
            className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">done_all</span>
            Finalizar e Voltar para a Fila
          </button>
        </div>
      </footer>
    </div>
  );
};

export default FinalizeService;
