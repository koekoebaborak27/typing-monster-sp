import { cn } from "@/shared/ui/utils";
import type { Boss } from "../types";

/**
 * バトル画面の上に大きく置くボス。丸は使わず、絵文字を 150px で出し、後ろに光の背景を敷く。
 * 光の背景は画面の上端から横いっぱいに広げ、下に向かって背景色へなじませる（親の `relative` を基準に配置する）。
 * 怒りモードでは背景を赤くして絵文字を小刻みに震わせ、右上に💢を出す。`dimmed` はとどめの一撃で薄くするときに使う。
 */
export function BossStage({
  boss,
  angry = false,
  dimmed = false,
}: {
  boss: Boss;
  angry?: boolean;
  dimmed?: boolean;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[250px]",
          angry
            ? "bg-[radial-gradient(circle_at_50%_45%,color-mix(in_srgb,var(--color-boss-angry),white_15%)_0,var(--color-boss-angry)_45%,var(--color-angry-bg)_78%)]"
            : "bg-[radial-gradient(circle_at_50%_45%,color-mix(in_srgb,var(--color-boss),white_15%)_0,var(--color-boss)_45%,var(--color-bg)_78%)]",
        )}
      />
      <div className="relative mx-auto h-[184px] w-fit">
        <div
          role="img"
          aria-label={boss.name}
          className={cn(
            "pt-3 text-[150px] leading-none",
            angry && "animate-shake",
            dimmed && "opacity-50",
          )}
        >
          {boss.emoji}
        </div>
        {angry && (
          <span aria-hidden="true" className="absolute top-2 -right-4 text-4xl">
            💢
          </span>
        )}
      </div>
    </>
  );
}
