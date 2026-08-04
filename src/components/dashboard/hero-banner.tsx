import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The navy banner, with the brand's amber on its call to action.
 *
 * Amber is a fill and never type here: #f6b037 on white would be 1.9:1, but the
 * app's ink on top of it is 9.5:1. It also sits well away from any status pill,
 * which matters because the status amber is only a few degrees off it.
 */
export function HeroBanner({
  eyebrow,
  title,
  cta,
  href,
}: {
  eyebrow: string;
  title: string;
  cta: string;
  href: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-card bg-brand-600 px-7 py-8 text-white shadow-lift">
      {/* Decorative sparkle motif, mirroring the reference banner. */}
      <svg
        aria-hidden
        viewBox="0 0 200 140"
        className="pointer-events-none absolute -right-4 top-0 h-full opacity-40"
      >
        <defs>
          <radialGradient id="spark" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d="M120 10 L127 62 L178 70 L127 78 L120 130 L113 78 L62 70 L113 62 Z"
          fill="url(#spark)"
        />
        <path
          d="M62 34 L65 52 L83 55 L65 58 L62 76 L59 58 L41 55 L59 52 Z"
          fill="url(#spark)"
          opacity="0.7"
        />
        <rect x="8" y="0" width="184" height="140" fill="none" />
      </svg>

      <div className="relative max-w-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
          {eyebrow}
        </p>
        <h2 className="mt-2.5 text-2xl font-bold leading-snug tracking-tight sm:text-[28px]">
          {title}
        </h2>
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent-500 py-2 pl-5 pr-1.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.02] hover:bg-accent-400"
        >
          {cta}
          <span className="grid size-7 place-items-center rounded-full bg-ink/15">
            <ArrowRight className="size-3.5" />
          </span>
        </Link>
      </div>
    </section>
  );
}
