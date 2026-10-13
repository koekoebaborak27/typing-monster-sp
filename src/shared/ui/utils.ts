import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 条件で変わるクラス名をまとめる。同じ種類のクラスが重なったときは後に書いた方を残す。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
