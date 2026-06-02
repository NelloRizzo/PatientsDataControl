import type { DriveStep } from 'driver.js';

export const doctorGuideSteps: DriveStep[] = [
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
      title: 'I Tuoi Pazienti',
      description: 'Da qui accedi alla lista dei tuoi pazienti e alle loro schede.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tools-menu',
    popover: {
      title: 'Strumenti',
      description: 'Qui trovi: importazione CSV, contratto e ticket di segnalazione.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#nav-profile',
    popover: {
      title: 'Profilo e Guida',
      description: 'Da qui puoi modificare il profilo, leggere la privacy e riavviare questa guida.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#sidebar-patients',
    popover: {
      title: 'Lista Pazienti',
      description: 'Clicca su un paziente per vedere i suoi dati. Il pallino rosso indica alert attivi.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#latest-measurements',
    popover: {
      title: 'Ultime Misurazioni',
      description: 'Qui vedi l\'ultima rilevazione per ogni tipo. Le icone mostrano il trend: ↑ migliorato, ↓ peggiorato, → stabile.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '#chart-section',
    popover: {
      title: 'Grafico Storico',
      description: 'Seleziona un tipo di misurazione per vedere l\'andamento nel tempo. Puoi cambiare raggruppamento e aggregazione.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '#patient-anamnesis',
    popover: {
      title: 'Anamnesi',
      description: 'Qui puoi visualizzare e aggiungere voci anamnestiche strutturate in 6 sezioni.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '#patient-notes',
    popover: {
      title: 'Note Cliniche',
      description: 'Aggiungi note private o condivisibili con il paziente. Puoi inviare notifica email.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '#patient-medications',
    popover: {
      title: 'Farmaci',
      description: 'Prescrivi farmaci con dosaggio, frequenza e orari. Il paziente riceve notifica e può registrare l\'assunzione.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '#patient-actions',
    popover: {
      title: 'Azioni Paziente',
      description: 'Da qui puoi modificare profilo, resettare password, gestire la condivisione tipi e creare misurazioni.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#alerts-link',
    popover: {
      title: 'Alert',
      description: 'Visualizza la cronologia degli alert generati automaticamente dalle misurazioni.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#import-link',
    popover: {
      title: 'Importa Misurazioni',
      description: 'Carica file CSV per importare misurazioni in blocco. Supporta anche estrazione AI da PDF referti.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tickets-link',
    popover: {
      title: 'Ticket e Segnalazioni',
      description: 'Segnala bug o suggerisci nuove funzionalità. Il team admin risponderà tramite ticket.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#nav-notification-bell',
    popover: {
      title: 'Notifiche',
      description: 'Qui arrivano notifiche su nuovi pazienti, alert, farmaci e messaggi. Controlla periodicamente!',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const doctorGuideConfig = {
  title: 'Guida per Medici',
  description: 'Tour interattivo delle funzionalità dedicate ai medici.',
};
