import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function nowSecs(): number {
  return Math.floor(Date.now() / 1000);
}

export function formatDateTime(unixSecs: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(unixSecs * 1000));
}

export function relativeTime(unixSecs: number, now = nowSecs()): string {
  const diff = unixSecs - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3_600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diff / 3_600), "hour");
  return rtf.format(Math.round(diff / 86_400), "day");
}
