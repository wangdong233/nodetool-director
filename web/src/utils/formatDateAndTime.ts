import { isString } from "./typePredicates";
import { i18n } from "../i18n";
const differenceInSeconds = (later: Date, earlier: Date): number =>
  Math.trunc((later.getTime() - earlier.getTime()) / 1000);

const differenceInMinutes = (later: Date, earlier: Date): number =>
  Math.trunc((later.getTime() - earlier.getTime()) / 60000);

const differenceInHours = (later: Date, earlier: Date): number =>
  Math.trunc((later.getTime() - earlier.getTime()) / 3600000);

function compareLocal(later: Date, earlier: Date): number {
  const difference =
    later.getFullYear() - earlier.getFullYear() ||
    later.getMonth() - earlier.getMonth() ||
    later.getDate() - earlier.getDate() ||
    later.getHours() - earlier.getHours() ||
    later.getMinutes() - earlier.getMinutes() ||
    later.getSeconds() - earlier.getSeconds() ||
    later.getMilliseconds() - earlier.getMilliseconds();
  return Math.sign(difference);
}

function localCalendarTimestamp(date: Date): number {
  const utcDate = new Date(0);
  utcDate.setUTCHours(0, 0, 0, 0);
  utcDate.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  return utcDate.getTime();
}

function differenceInDays(later: Date, earlier: Date): number {
  const sign = compareLocal(later, earlier);
  const calendarDays = Math.abs(
    Math.round(
      (localCalendarTimestamp(later) - localCalendarTimestamp(earlier)) /
        86400000
    )
  );
  const adjustedLater = new Date(later);
  adjustedLater.setDate(adjustedLater.getDate() - sign * calendarDays);
  const lastDayIsNotFull = Number(compareLocal(adjustedLater, earlier) === -sign);
  const result = sign * (calendarDays - lastDayIsNotFull);
  return result === 0 ? 0 : result;
}

/** `earlier` shifted forward by `months` calendar months, clamped so e.g.
 * Jan 31 + 1 month lands on the last day of February, not March 3. */
function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const daysInTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();
  result.setDate(Math.min(day, daysInTargetMonth));
  return result;
}

/** Full calendar months elapsed between two dates (later >= earlier). */
function differenceInMonths(later: Date, earlier: Date): number {
  let months =
    (later.getFullYear() - earlier.getFullYear()) * 12 +
    (later.getMonth() - earlier.getMonth());
  if (months > 0 && addMonthsClamped(earlier, months).getTime() > later.getTime()) {
    months -= 1;
  }
  return Math.max(months, 0);
}

/** Full calendar years elapsed between two dates (later >= earlier). */
const differenceInYears = (later: Date, earlier: Date): number =>
  Math.floor(differenceInMonths(later, earlier) / 12);

export function secondsToHMS(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  const paddedHours = String(hours).padStart(2, "0");
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
}

// Render-phase util: the global instance reads the live language at each
// call (same convention as the D-registry module helpers). i18next's count
// plural picks _one/_other automatically; zh carries a single form.
// Render-phase util: the global instance reads the live language at each
// call (same convention as the D-registry module helpers). The leaf base
// (e.g. "yearAgo") is passed whole so the source carries it as a literal —
// i18next's count plural then picks _one/_other per locale (zh: one form).
function agoLabel(count: number, leaf: string): string {
  // A NaN count (invalid date reached this far) renders as "" rather than
  // "NaN 秒前" — callers treat an empty label as "no relative time to show".
  if (Number.isNaN(count)) {
    return "";
  }
  return i18n.t(`common:relTime.${leaf}`, { count });
}

export function relativeTime(date: Date | string): string {
  const now = new Date();
  const past = isString(date) ? new Date(date) : date;

  const seconds = differenceInSeconds(now, past);
  if (seconds < 1) {
    return i18n.t("common:relTime.justNow");
  }

  // Months and years are calendar-aware rather than fixed 30/365-day
  // windows, so e.g. a date in a 31-day month is not rounded up early.
  const years = differenceInYears(now, past);
  if (years >= 1) {
    return agoLabel(years, "yearAgo");
  }

  const months = differenceInMonths(now, past);
  if (months >= 1) {
    return agoLabel(months, "monthAgo");
  }

  const days = differenceInDays(now, past);
  const weeks = Math.floor(days / 7);
  if (weeks >= 1) {
    return agoLabel(weeks, "weekAgo");
  }
  if (days >= 1) {
    return agoLabel(days, "dayAgo");
  }

  const hours = differenceInHours(now, past);
  if (hours >= 1) {
    return agoLabel(hours, "hourAgo");
  }

  const minutes = differenceInMinutes(now, past);
  if (minutes >= 1) {
    return agoLabel(minutes, "minuteAgo");
  }

  return agoLabel(seconds, "secondAgo");
}
