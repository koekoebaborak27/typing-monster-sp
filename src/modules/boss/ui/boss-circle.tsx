import { cn } from "@/shared/ui/utils";
import type { Boss } from "../types";

/** ボスの丸の大きさ。ホームは大、結果は中、バトルで解説を出している間は小。 */
type BossCircleSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<BossCircleSize, string> = {
  sm: "size-16 text-3xl",
  md: "size-18 text-4xl",
  lg: "size-24 text-5xl",
};

/**
 * ボスの丸。丸い背景の中に絵文字を置く。
 * 怒りモードでは丸を赤くして小刻みに震わせ、右上に💢を出す。`dimmed` はとどめの一撃で薄くするときに使う。
 */
export function BossCircle({
  boss,
  size,
  angry = false,
  dimmed = false,
}: {
  boss: Boss;
  size: BossCircleSize;
  angry?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div className="relative mx-auto w-fit">
      <div
        role="img"
        aria-label={boss.name}
        className={cn(
          "flex items-center justify-center rounded-full",
          SIZE_CLASS[size],
          angry ? "animate-shake bg-boss-angry" : "bg-boss",
          dimmed && "opacity-50",
        )}
      >
        {boss.emoji}
      </div>
      {angry && (
        <span aria-hidden="true" className="absolute -top-1 -right-2 text-2xl">
          💢
        </span>
      )}
    </div>
  );
}
