"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, Lock } from "lucide-react";

/**
 * The iFields functions the CDN script attaches to `window`. Declared rather
 * than reached for through `any`, so a rename in a future version shows up as a
 * type error instead of an undefined-is-not-a-function at the till.
 */
type IFieldsWindow = Window & {
  setAccount?: (key: string, softwareName: string, softwareVersion: string) => void;
  setIfieldStyle?: (id: string, style: Record<string, string>) => void;
  getTokens?: (onSuccess: () => void, onError: () => void, timeoutMs: number) => void;
  enableAutoFormatting?: (separator?: string) => void;
};

const FIELD_STYLE = {
  width: "100%",
  height: "100%",
  border: "none",
  outline: "none",
  "font-size": "14px",
  "font-family": "inherit",
  padding: "0",
  background: "transparent",
};

/**
 * Card entry for a Sola subscription.
 *
 * The card number and CVV live in iframes served by Cardknox, so they are never
 * in this page's DOM and never reach our server — the form submits a one-time
 * token instead. That is the whole point of the arrangement, and it is why this
 * component looks more indirect than a pair of ordinary inputs would.
 */
export function SolaCardForm({
  plan,
  planName,
  priceLabel,
  ifieldsKey,
  ifieldsVersion,
  softwareName,
  softwareVersion,
  onCancel,
}: {
  plan: string;
  planName: string;
  priceLabel: string;
  ifieldsKey: string;
  ifieldsVersion: string;
  softwareName: string;
  softwareVersion: string;
  onCancel: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const base = `https://cdn.cardknox.com/ifields/${ifieldsVersion}`;

  const configure = useCallback(() => {
    const w = window as IFieldsWindow;
    if (!w.setAccount) {
      setError("The card form could not load. Check your connection and try again.");
      return;
    }
    w.setAccount(ifieldsKey, softwareName, softwareVersion);
    // The iframes inherit nothing from this page, so their text has to be
    // styled through the library or the card number renders at browser default
    // size inside a field sized for ours.
    w.setIfieldStyle?.("card-number", FIELD_STYLE);
    w.setIfieldStyle?.("cvv", FIELD_STYLE);
    w.enableAutoFormatting?.(" ");
    setReady(true);
  }, [ifieldsKey, softwareName, softwareVersion]);

  // The script may already be present — React can remount this component while
  // next/script keeps the tag, in which case onLoad never fires again.
  //
  // Queued rather than called in the effect body: configure() ends by marking
  // the form ready, and a synchronous setState here would cascade a second
  // render before the first had finished committing.
  useEffect(() => {
    if (!(window as IFieldsWindow).setAccount) return;
    const timer = setTimeout(configure, 0);
    return () => clearTimeout(timer);
  }, [configure]);

  function tokenValue(id: string) {
    return (
      formRef.current?.querySelector<HTMLInputElement>(`input[data-ifields-id="${id}"]`)?.value ?? ""
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !ready) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const exp = String(data.get("exp") ?? "");

    if (!/^\d{2}\s*\/?\s*\d{2}$/.test(exp.trim())) {
      setError("Enter the expiry as MM/YY.");
      return;
    }

    setError(null);
    setPending(true);

    const w = window as IFieldsWindow;
    w.getTokens?.(
      () => void charge(data, exp),
      () => {
        // The library writes its own reason into the error label below; this is
        // the fallback for when it does not.
        setPending(false);
        setError((current) => current ?? "Check the card number and CVV.");
      },
      30_000,
    );
  }

  async function charge(data: FormData, exp: string) {
    try {
      const response = await fetch("/api/sola/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          token: tokenValue("card-number-token"),
          cvvToken: tokenValue("cvv-token"),
          exp: exp.replace(/\D/g, ""),
          cardholder: String(data.get("cardholder") ?? ""),
          postalCode: String(data.get("postal_code") ?? ""),
        }),
      });

      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? "The payment could not be completed.");

      window.location.assign("/billing?checkout=success");
    } catch (cause) {
      setPending(false);
      setError(cause instanceof Error ? cause.message : "The payment could not be completed.");
    }
  }

  return (
    <div className="card p-6">
      <Script src={`${base}/ifields.min.js`} strategy="afterInteractive" onLoad={configure} />

      <h3 className="font-semibold tracking-tight">
        Subscribe to {planName} — {priceLabel} / month
      </h3>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-subtle">
        <Lock className="size-3.5" />
        Card details go straight to Sola. They are never sent to Arrow Builders.
      </p>

      <form ref={formRef} onSubmit={onSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Name on card</span>
          <input
            name="cardholder"
            required
            autoComplete="cc-name"
            className="mt-1.5 w-full rounded-tile bg-canvas px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <div>
          <span className="text-sm font-medium">Card number</span>
          {/* Sized here rather than on the iframe's own content: the iframe is a
              separate document and cannot grow to fit what is typed into it. */}
          <div className="mt-1.5 h-11 rounded-tile bg-canvas px-3.5 py-3 focus-within:ring-2 focus-within:ring-brand-200">
            <iframe
              title="Card number"
              data-ifields-id="card-number"
              data-ifields-placeholder="0000 0000 0000 0000"
              src={`${base}/ifield.htm`}
              className="h-full w-full border-0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium">Expiry</span>
            <input
              name="exp"
              required
              inputMode="numeric"
              placeholder="MM/YY"
              autoComplete="cc-exp"
              maxLength={5}
              className="mt-1.5 w-full rounded-tile bg-canvas px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand-200"
            />
          </label>

          <div>
            <span className="text-sm font-medium">CVV</span>
            <div className="mt-1.5 h-11 rounded-tile bg-canvas px-3.5 py-3 focus-within:ring-2 focus-within:ring-brand-200">
              <iframe
                title="CVV"
                data-ifields-id="cvv"
                data-ifields-placeholder="123"
                src={`${base}/ifield.htm`}
                className="h-full w-full border-0"
              />
            </div>
          </div>

          <label className="col-span-2 block sm:col-span-1">
            <span className="text-sm font-medium">Billing ZIP</span>
            <input
              name="postal_code"
              autoComplete="postal-code"
              className="mt-1.5 w-full rounded-tile bg-canvas px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
        </div>

        {/* Where iFields writes tokenization failures, and where getTokens puts
            the tokens. Both are required by the library, by these exact ids. */}
        <input type="hidden" data-ifields-id="card-number-token" name="xCardNum" />
        <input type="hidden" data-ifields-id="cvv-token" name="xCVV" />
        <p data-ifields-id="card-data-error" className="text-sm text-status-risk" role="alert" />

        {error && (
          <p className="rounded-tile bg-rose-50 p-3 text-sm text-status-risk" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="pressable rounded-full px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-canvas"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready || pending}
            className="pressable inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {ready ? `Pay ${priceLabel} and subscribe` : "Loading card form…"}
          </button>
        </div>
      </form>
    </div>
  );
}
