import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export function Help() {
  const { user } = useAuth();
  const [showDetails, setShowDetails] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold">Guide e Tutorial</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tour interattivi per conoscere le funzionalità della piattaforma.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-5 space-y-3">
        <h3 className="font-semibold">FAQ Rapide</h3>
        <div className="space-y-2 text-sm">
          {user?.role === 'doctor' && (
            <>
              <details className="group" open={showDetails === 'add-patient'} onToggle={() => setShowDetails(showDetails === 'add-patient' ? null : 'add-patient')}>
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Come aggiungo un paziente?</summary>
                <p className="mt-1 text-gray-600 pl-4">Vai su "Pazienti" → clicca "+ Aggiungi Paziente". Puoi cercare per email o creare un nuovo account.</p>
              </details>
              <details className="group" open={showDetails === 'prescribe'} onToggle={() => setShowDetails(showDetails === 'prescribe' ? null : 'prescribe')}>
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Come prescrivo un farmaco?</summary>
                <p className="mt-1 text-gray-600 pl-4">Apri la scheda del paziente → clicca "Farmaci" → "+ Nuovo Farmaco". Inserisci nome, dosaggio, orari.</p>
              </details>
            </>
          )}
          {user?.role === 'patient' && (
            <>
              <details className="group" open={showDetails === 'add-measure'} onToggle={() => setShowDetails(showDetails === 'add-measure' ? null : 'add-measure')}>
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Come inserisco una misurazione?</summary>
                <p className="mt-1 text-gray-600 pl-4">Vai su "Le Mie Misure" o usa la schermata mobile dal tuo smartphone per inserire rapidamente i valori.</p>
              </details>
              <details className="group" open={showDetails === 'meds'} onToggle={() => setShowDetails(showDetails === 'meds' ? null : 'meds')}>
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Come funzionano i farmaci?</summary>
                <p className="mt-1 text-gray-600 pl-4">Il medico prescrive i farmaci. Li trovi nella Dashboard con l'orario. Clicca "Preso" per registrare l'assunzione.</p>
              </details>
            </>
          )}
          <details className="group" open={showDetails === 'support'} onToggle={() => setShowDetails(showDetails === 'support' ? null : 'support')}>
            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Come contatto il supporto?</summary>
            <p className="mt-1 text-gray-600 pl-4">Usa la sezione "Ticket e Segnalazioni" per inviare suggerimenti o segnalare problemi. Il team risponderà direttamente.</p>
          </details>
        </div>
      </div>
    </div>
  );
}
