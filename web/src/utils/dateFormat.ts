/**
 * Minimal date helpers replacing the date-fns functions this app used.
 * Relative phrasing lives in `formatDateAndTime.relativeTime`; localized
 * date/time rendering in `formatUtils.formatDateTime`.
 */

import { appIntlLocale } from "../i18n";

export function parseISO(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    const date = new Date(0);
    date.setFullYear(year, month, day);
    date.setHours(0, 0, 0, 0);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return new Date(NaN);
    }
    return date;
  }
  return new Date(value);
}

/** True when the Date holds a real point in time. */
export function isValid(date: Date): boolean {
  return !isNaN(date.getTime());
}

const pad = (n: number): string => String(n).padStart(2, "0");

// Locale follows the in-app language switcher (director/93 R3-①); "en-US"
// output is byte-identical to the previous hand-rolled assembly.
const ppppFormatters = new Map<string, Intl.DateTimeFormat>();
function ppppFormatter(locale: string): Intl.DateTimeFormat {
  let fmt = ppppFormatters.get(locale);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: locale === "en-US"
    });
    ppppFormatters.set(locale, fmt);
  }
  return fmt;
}

/** "Apr 5, 2023, 9:07:03 AM" — matches date-fns "PPpp" (en-US). */
export function formatPPpp(date: Date): string {
  return ppppFormatter(appIntlLocale()).format(date);
}
