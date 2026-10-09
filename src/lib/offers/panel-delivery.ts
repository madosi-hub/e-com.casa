/** Estimated delivery dates, counted from the current day in mainland Portugal. */
export function panelDeliveryWindowLabel(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value);
  const today = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
  const addWeekdays = (days: number) => {
    const date = new Date(today);
    while (days > 0) {
      date.setUTCDate(date.getUTCDate() + 1);
      if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) days -= 1;
    }
    return date;
  };
  const start = addWeekdays(1);
  const end = addWeekdays(4);
  const format = new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', day: 'numeric', month: 'long' });
  const first = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()
    ? String(start.getUTCDate()) : format.format(start);
  return `Entrega prevista entre ${first} e ${format.format(end)}`;
}
