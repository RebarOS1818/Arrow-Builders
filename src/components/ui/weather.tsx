import { Cloud, CloudSun, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type Condition = "sunny" | "partly" | "cloudy";

export const CONDITION_LABEL: Record<Condition, string> = {
  sunny: "Sunny",
  partly: "Partly sunny",
  cloudy: "Cloudy",
};

export function WeatherIcon({
  condition,
  className,
}: {
  condition: Condition;
  className?: string;
}) {
  const Icon = condition === "sunny" ? Sun : condition === "partly" ? CloudSun : Cloud;
  const tone = condition === "cloudy" ? "text-ink-subtle" : "text-amber-500";
  return <Icon aria-label={CONDITION_LABEL[condition]} className={cn("size-5", tone, className)} />;
}
