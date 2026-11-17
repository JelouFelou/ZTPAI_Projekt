export function loanDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(value));
}

export function timeToReturn(dueAt: string, now: number) {
  const difference = new Date(dueAt).getTime() - now;
  const days = Math.ceil(Math.abs(difference) / 86400000);
  if (difference < 0)
    return `Po terminie: ${days} ${days === 1 ? "dzień" : "dni"}`;
  if (difference < 3600000) return "Do zwrotu zostało mniej niż godzina";
  if (difference < 86400000)
    return `Do zwrotu zostało ${Math.floor(difference / 3600000)} godz.`;
  return `Do zwrotu zostało ${days} dni`;
}
