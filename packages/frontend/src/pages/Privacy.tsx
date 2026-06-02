export function Privacy() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Informativa Privacy</h1>
      <p className="text-xs text-gray-500">Ultimo aggiornamento: Maggio 2026</p>

      <section className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">1. Titolare del Trattamento</h2>
        <p className="text-sm">
          HealthBridge S.r.l. con sede legale in Via Roma 123, 00100 Roma, Italia.
          Email: <a href="mailto:privacy@healthbridge.com" className="text-blue-600 underline">privacy@healthbridge.com</a>
        </p>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">2. Dati Personali Raccolti</h2>
        <ul className="text-sm list-disc pl-5 space-y-1">
          <li><strong>Dati identificativi e anagrafici</strong>: nome, cognome, email, data di nascita, sesso, città di nascita</li>
          <li><strong>Dati sanitari</strong>: misurazioni cliniche (pressione sanguigna, glicemia, frequenza cardiaca, peso, altezza, ecc.), diagnosi, terapie farmacologiche, anamnesi patologica e familiare</li>
          <li><strong>Dati di contatto</strong>: indirizzo email, recapito telefonico (se fornito)</li>
          <li><strong>Dati di indirizzo</strong>: residenza e domicilio (se forniti per finalità amministrative)</li>
          <li><strong>Dati di utilizzo</strong>: log di accesso, IP, user agent, cookie tecnici</li>
        </ul>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">3. Finalità del Trattamento</h2>
        <ul className="text-sm list-disc pl-5 space-y-1">
          <li>Gestione del rapporto medico-paziente e presa in carico sanitaria</li>
          <li>Raccolta, archiviazione e visualizzazione di misurazioni cliniche</li>
          <li>Generazione di report e grafici per monitoraggio dello stato di salute</li>
          <li>Invio di notifiche e alert per valori critici (con consenso esplicito)</li>
          <li>Adempimento agli obblighi di legge (conservazione documentazione sanitaria)</li>
        </ul>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">4. Base Giuridica</h2>
        <p className="text-sm">
          Il trattamento dei dati sanitari avviene sulla base del consenso esplicito dell'interessato
          ai sensi dell'Art. 9 del GDPR e dell'Art. 2-septies del D.Lgs. 101/2018.
          Il trattamento dei dati comuni avviene per l'esecuzione di un contratto di cui l'interessato è parte (Art. 6(1)(b) GDPR).
        </p>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">5. Condivisione dei Dati</h2>
        <p className="text-sm">
          I dati sanitari sono accessibili esclusivamente al medico curante autorizzato dal paziente
          tramite esplicita conferma di presa in carico. Il paziente può limitare la visibilità di
          specifiche tipologie di misurazioni per ciascun medico. I dati non vengono comunicati a
          terzi senza esplicito consenso, salvo obblighi di legge.
        </p>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">6. Periodo di Conservazione</h2>
        <p className="text-sm">
          I dati sanitari sono conservati per tutta la durata del rapporto medico-paziente e per
          i successivi 10 anni ai fini di documentazione sanitaria, come previsto dalla normativa
          vigente. I dati di accesso e log vengono conservati per 24 mesi.
        </p>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">7. Diritti dell'Interessato</h2>
        <p className="text-sm">Ai sensi degli Artt. 15-22 GDPR, l'interessato ha diritto di:</p>
        <ul className="text-sm list-disc pl-5 space-y-1">
          <li>Accesso ai propri dati personali</li>
          <li>Rettifica di dati inesatti o incompleti</li>
          <li>Cancellazione dei dati ("diritto all'oblio")</li>
          <li>Limitazione del trattamento</li>
          <li>Portabilità dei dati in formato strutturato</li>
          <li>Revoca del consenso in qualsiasi momento</li>
          <li>Proporre reclamo al Garante per la Protezione dei Dati Personali</li>
        </ul>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">8. Revoca del Consenso</h2>
        <p className="text-sm">
          Il paziente può revocare il consenso in qualsiasi momento dalla sezione "Profilo" →
          "Consenso GDPR". La base giuridica del trattamento dei dati sanitari è l'art. 9(2)(h)
          del GDPR (finalità di medicina preventiva e assistenza sanitaria), pertanto la revoca
          non blocca l'accesso ai dati da parte dei medici curanti. La revoca viene comunque
          registrata nello storico per trasparenza.
        </p>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">9. Misure di Sicurezza</h2>
        <p className="text-sm">
          I dati sono protetti tramite crittografia in transito (TLS 1.3) e a riposo (AES-256).
          L'autenticazione avviene tramite JWT con token di accesso a breve durata e refresh token.
          Le password sono hashate con bcrypt. L'accesso ai dati è strettamente regolato da
          permessi basati sul ruolo (RBAC).
        </p>
      </section>
    </div>
  );
}
