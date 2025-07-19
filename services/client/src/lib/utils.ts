import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const formatDate = (v: number | string) => {
  if (typeof v === "number") {
    const ts = v > 1e12 ? v : v * 1000;
    return new Date(ts).toLocaleString();
  }
  return v;
};
