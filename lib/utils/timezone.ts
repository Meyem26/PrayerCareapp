export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatTimezoneLabel(timezone: string): string {
  return timezone.replace(/_/g, ' ');
}
