import { useAuth } from '../context/AuthContext';
import { GuideButton } from '../components/GuideButton';
import { doctorGuideSteps, doctorGuideConfig } from '../guides/doctorGuide';
import { patientGuideSteps, patientGuideConfig } from '../guides/patientGuide';

export function Help() {
  const { user } = useAuth();

  const guides = user?.role === 'doctor'
    ? [{ steps: doctorGuideSteps, config: doctorGuideConfig }]
    : user?.role === 'patient'
    ? [{ steps: patientGuideSteps, config: patientGuideConfig }]
    : [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold">Guide e Tutorial</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tour interattivi per conoscere le funzionalità della piattaforma.
        </p>
      </div>

      {guides.length === 0 ? (
        <p className="text-sm text-gray-500">Nessuna guida disponibile per il tuo ruolo.</p>
      ) : (
        <div className="space-y-3">
          {guides.map((g, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-5 space-y-3">
              <h3 className="font-semibold">{g.config.title}</h3>
              <p className="text-sm text-gray-600">{g.config.description}</p>
              <p className="text-xs text-gray-400">{g.steps.length} step</p>
              <GuideButton className="bg-blue-600 text-white hover:bg-blue-700" />
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-5 space-y-3">
        <h3 className="font-semibold">FAQ Rapide</h3>
        <div className="space-y-2 text-sm">
          {user?.role === 'doctor' && (
            <>
              <details className="group">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Come aggiungo un paziente?</summary>
                <p className="mt-1 text-gray-600 pl-4">Vai su "Pazienti" → clicca "+ Aggiungi Paziente". Puoi cercare per email o creare un nuovo account.</p>
              </details>
              <details className="group">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Come prescrivo un farmaco?</summary>
                <p className="mt-1 text-gray-600 pl-4">Apri la scheda del paziente → clicca "Farmaci" → "+ Nuovo Farmaco". Inserisci nome, dosaggio, orari.</p>
              </details>
            </>
          )}
          {user?.role === 'patient' && (
            <>
              <details className="group">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Come inserisco una misurazione?</summary>
                <p className="mt-1 text-gray-600 pl-4">Vai su "Le Mie Misure" o usa la schermata mobile dal tuo smartphone per inserire rapidamente i valori.</p>
              </details>
              <details className="group">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Come funzionano i farmaci?</summary>
                <p className="mt-1 text-gray-600 pl-4">Il medico prescrive i farmaci. Li trovi nella Dashboard con l'orario. Clicca "Preso" per registrare l'assunzione.</p>
              </details>
            </>
          )}
          <details className="group">
            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Come contatto il supporto?</summary>
            <p className="mt-1 text-gray-600 pl-4">Usa la sezione "Ticket e Segnalazioni" per inviare suggerimenti o segnalare problemi. Il team risponderà direttamente.</p>
          </details>
        </div>
      </div>
    </div>
  );
}
