/**
 * Génère un fichier .ics pour exporter une séance vers Google Calendar / Apple Calendar
 */

interface CalendarEvent {
  title: string;
  description?: string;
  location: string;
  startDate: Date;
  durationMinutes?: number;
  organizer?: string;
}

const escapeICS = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

export const generateICSFile = (event: CalendarEvent): string => {
  const start = formatICSDate(event.startDate);
  const endDate = new Date(event.startDate.getTime() + (event.durationMinutes || 60) * 60 * 1000);
  const end = formatICSDate(endDate);
  const now = formatICSDate(new Date());
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@runconnect.app`;

  const description = [
    event.description || '',
    event.organizer ? `Organisé par ${event.organizer}` : '',
    'Créé via RunConnect'
  ].filter(Boolean).join('\\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RunConnect//RunConnect App//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(event.location)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Rappel RunConnect',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return ics;
};

export const downloadICSFile = (event: CalendarEvent): void => {
  const icsContent = generateICSFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const openGoogleCalendarLink = (event: CalendarEvent): void => {
  const start = event.startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const endDate = new Date(event.startDate.getTime() + (event.durationMinutes || 60) * 60 * 1000);
  const end = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || `Organisé par ${event.organizer || 'RunConnect'}`,
    location: event.location,
    sf: 'true',
  });

  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
};
