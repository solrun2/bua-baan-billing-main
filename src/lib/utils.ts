import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function generateProductId(): Promise<string> {
  // In a real app, you would fetch the last product ID from your API
  // For now, we'll generate a simple ID with a timestamp
  const timestamp = new Date().getTime().toString().slice(-6);
  return `P${timestamp}`;
}
