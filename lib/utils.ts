import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date utilities for calendar
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDateForDisplay(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatDateForInput(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

export function parseDateFromDisplay(display: string): Date | null {
  const match = display.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{1,2}),\s(\d{4})/);
  if (!match) return null;
  const month = monthNames.indexOf(match[1]);
  const day = parseInt(match[2]);
  const year = parseInt(match[3]);
  return new Date(year, month, day);
}
