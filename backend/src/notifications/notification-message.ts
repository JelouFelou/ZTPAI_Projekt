import { NotificationType } from '@prisma/client';

export function notificationMessage(
  type: NotificationType,
  gameTitle: string,
  inventoryCode: string,
  dueAt: string | Date,
): string {
  const deadline = new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(dueAt));
  if (type === NotificationType.LOAN_BORROWED) {
    return `Wypożyczono grę „${gameTitle}” (${inventoryCode}). Termin zwrotu: ${deadline}.`;
  }
  return `Wypożyczenie gry „${gameTitle}” (${inventoryCode}) jest przeterminowane. Termin zwrotu: ${deadline}. Prosimy o zwrot egzemplarza.`;
}
