export function isMidDayWindow(): boolean {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  return currentMins >= (11 * 60 + 30) && currentMins <= (13 * 60 + 30);
}
