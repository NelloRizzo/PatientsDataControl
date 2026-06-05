import type { DriveStep } from 'driver.js';
import type { NavigateFunction } from 'react-router-dom';

export function createDoctorGuide(navigate: NavigateFunction, _cleanup: () => void): DriveStep[] {
  const navTo = (path: string, nextStep: number) => {
    sessionStorage.setItem('guideStep', String(nextStep));
    sessionStorage.setItem('guideRole', 'doctor');
    setTimeout(() => navigate(path), 50);
  };

  return [
    {
      element: '#nav-logo',
      popover: {
        title: 'Benvenuto in HealthBridge',
        description: 'Questa guida ti mostrerà le principali funzionalità per medici.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#patients-menu',
      popover: {
        title: 'Pazienti',
        description: 'Da qui accedi alla lista dei tuoi assistiti, visualizzi gli alert e gestisci le schede.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tools-menu',
      popover: {
        title: 'Strumenti',
        description: 'Importazione CSV, contratto e sistema di ticket per segnalazioni.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#nav-profile',
      popover: {
        title: 'Profilo',
        description: 'Modifica i tuoi dati, leggi l\'informativa privacy e riavvia questa guida.',
        side: 'bottom',
        align: 'start',
        onNextClick: () => { navTo('/doctor/patients', 4); return false; },
      },
    },
    {
      element: '#sidebar-patients',
      popover: {
        title: 'Lista Pazienti',
        description: 'Qui vedi tutti i tuoi pazienti. Il pallino rosso indica alert attivi. Clicca su un nome per aprire la scheda dettaglio.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#sidebar-patients',
      popover: {
        title: 'Seleziona un Paziente',
        description: 'Clicca su uno dei nomi nella lista per visualizzare i dettagli. Poi premi "Avanti" per continuare.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#latest-measurements',
      popover: {
        title: 'Ultime Misurazioni',
        description: 'Ogni card mostra l\'ultimo valore per tipo. Le icone indicano il trend: ↑ migliorato, ↓ peggiorato, → stabile. Clicca una card per selezionare il tipo nel grafico.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#chart-section',
      popover: {
        title: 'Grafico Storico',
        description: 'Seleziona tipo, raggruppamento e aggregazione per analizzare l\'andamento nel tempo.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '#patient-anamnesis',
      popover: {
        title: 'Anamnesi',
        description: 'Visualizza e aggiungi voci anamnestiche in 6 sezioni: fisiologica, familiare, farmacologica, patologica remota, prossima e sociale.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#patient-notes',
      popover: {
        title: 'Note Cliniche',
        description: 'Aggiungi note visibili solo a te o condivisibili con il paziente, con notifica email.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '#patient-medications',
      popover: {
        title: 'Farmaci',
        description: 'Prescrivi farmaci con dosaggio, frequenza e orari. Il paziente riceve notifica e registra l\'assunzione con "Preso".',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#patient-actions',
      popover: {
        title: 'Azioni',
        description: 'Modifica profilo, reset password, gestisci condivisione tipi e crea misurazioni per il paziente.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#nav-notification-bell',
      popover: {
        title: 'Notifiche',
        description: 'Ricevi alert su valori critici, nuovi pazienti, farmaci prescritti e aggiornamenti. Controlla periodicamente!',
        side: 'bottom',
        align: 'end',
      },
    },
  ];
}
