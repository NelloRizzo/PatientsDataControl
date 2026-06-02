import type { DriveStep } from 'driver.js';

export const patientGuideSteps: DriveStep[] = [
  {
    element: '#nav-logo',
    popover: {
      title: 'Benvenuto in HealthBridge',
      description: 'Questa guida ti mostrerà le principali funzionalità per pazienti.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#mobile-measure-link',
    popover: {
      title: 'Inserisci Misurazioni',
      description: 'Da qui puoi aggiungere nuove misurazioni in modo rapido e semplice.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#patient-chart-section',
    popover: {
      title: 'Dashboard',
      description: 'Qui vedi il grafico delle tue misurazioni nel tempo. Puoi selezionare tipo e periodo.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '#patient-medications-section',
    popover: {
      title: 'I Miei Farmaci',
      description: 'Qui trovi i farmaci prescritti dal tuo medico. Clicca "Preso" quando assumi una dose.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '#patient-my-doctors',
    popover: {
      title: 'I Miei Dottori',
      description: 'Qui puoi confermare o rifiutare un medico e gestire la condivisione dei dati.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '#patient-anamnesis-section',
    popover: {
      title: 'La Mia Anamnesi',
      description: 'Visualizza la tua storia clinica inserita dal medico.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '#nav-notification-bell',
    popover: {
      title: 'Notifiche',
      description: 'Qui ricevi notifiche per nuovi farmaci, promemoria e messaggi dal medico.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '#nav-profile',
    popover: {
      title: 'Profilo',
      description: 'Da qui puoi modificare i tuoi dati, cambiare password e gestire il consenso GDPR.',
      side: 'bottom',
      align: 'start',
    },
  },
];

export const patientGuideConfig = {
  title: 'Guida per Pazienti',
  description: 'Tour interattivo delle funzionalità dedicate ai pazienti.',
};
