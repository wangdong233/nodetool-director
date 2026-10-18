import { relativeTime } from "./formatDateAndTime";
import { isString } from "./typePredicates";
import { i18n } from "../i18n";

export function groupByDate(
  date: Date | string,
  now: Date = new Date()
): string {
  const dateObj = isString(date) ? new Date(date) : date;

  // An unparseable date (system skills ship `updatedAt: ""`) must not fall
  // through to the relative-time branches — Date arithmetic on NaN produced
  // "NaN 秒前". Undated documents group under their own stable label.
  if (Number.isNaN(dateObj.getTime())) {
    return i18n.t("common:relTime.builtIn", { defaultValue: "Built in" });
  }

  // Normalize to start-of-day in UTC to get full-day difference
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const nowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dateStart = new Date(Date.UTC(
    dateObj.getUTCFullYear(),
    dateObj.getUTCMonth(),
    dateObj.getUTCDate()
  ));

  const diffDays = Math.floor(
    (nowStart.getTime() - dateStart.getTime()) / MS_PER_DAY
  );

  if (diffDays === 0) {
    return i18n.t("common:relTime.today", { defaultValue: "Today" });
  }
  if (diffDays === 1) {
    return i18n.t("common:relTime.yesterday", { defaultValue: "Yesterday" });
  }
  if (diffDays < 7) {
    return i18n.t("common:relTime.dayAgo", { count: diffDays });
  }
  // For 7+ days, use more general relative labels (weeks, months, years)
  return relativeTime(dateObj);
}
