import type { DriveStep } from 'driver.js';
import type { NavigateFunction } from 'react-router-dom';

export function createPatientGuide(navigate: NavigateFunction, _cleanup: () => void): DriveStep[] {
  const navTo = (path: string, nextStep: number) => {
    sessionStorage.setItem('guideStep', String(nextStep));
    sessionStorage.setItem('guideRole', 'patient');
    setTimeout(() => navigate(path), 50);
  };

  return [
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
      element: '#nav-logo',
      popover: {
        title: 'Dashboard',
        description: 'Il prossimo passo ti mostrerà la Dashboard, il tuo centro di controllo con grafici, farmaci e dottori.',
        side: 'bottom',
        align: 'start',
        onNextClick: () => { navTo('/', 2); return false; },
      },
    },
    {
      element: '#patient-chart-section',
      popover: {
        title: 'Dashboard — Grafico',
        description: 'Qui vedi l\'andamento delle tue misurazioni nel tempo. Seleziona un tipo, il raggruppamento e i campi da visualizzare.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '#patient-medications-section',
      popover: {
        title: 'I Miei Farmaci',
        description: 'Trovi i farmaci prescritti dal tuo medico. Clicca "Preso" quando assumi una dose per tenere traccia.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#patient-my-doctors',
      popover: {
        title: 'I Miei Dottori',
        description: 'Conferma o rifiuta un medico e gestisci quali tipi di misurazioni condividere.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#patient-anamnesis-section',
      popover: {
        title: 'La Mia Anamnesi',
        description: 'Visualizza la tua storia clinica inserita dal medico: patologie, terapie, familiarità.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '#nav-notification-bell',
      popover: {
        title: 'Notifiche',
        description: 'Ricevi promemoria per i farmaci, messaggi dal medico e aggiornamenti importanti.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '#nav-profile',
      popover: {
        title: 'Profilo',
        description: 'Modifica i tuoi dati, cambia password, gestisci il consenso GDPR e riavvia questa guida.',
        side: 'bottom',
        align: 'start',
      },
    },
  ];
}
