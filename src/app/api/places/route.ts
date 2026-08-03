import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Address autocomplete, proxied.
 *
 * The Google key never reaches the browser. A key in client JavaScript can be
 * lifted from the page and spent by anyone who finds it — referrer restrictions
 * help but are trivially forged — and Places is billed per request. Proxying
 * also means the sign-in check below applies: only members of an organization
 * can spend the quota.
 *
 * Two operations rather than two routes, because they share the session token
 * that Google uses to bill a search plus its selection as one event.
 */

const AUTOCOMPLETE = "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS = "https://places.googleapis.com/v1/places";

export type Suggestion = { id: string; primary: string; secondary: string };

export type Diagnostic = {
  environment: string;
  build: string;
  /**
   * "absent" — no such variable on this deployment.
   * "empty"  — the name is defined but its value is an empty string, which is
   *            a different mistake with a different fix, and indistinguishable
   *            from absent unless it is said outright.
   */
  key: "absent" | "empty";
  relatedNames: string[];
};

export type PlaceDetail = {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
};

function component(
  components: { longText: string; shortText: string; types: string[] }[],
  type: string,
  short = false,
) {
  const hit = components.find((c) => c.types.includes(type));
  if (!hit) return "";
  return short ? hit.shortText : hit.longText;
}

/**
 * What the running deployment can see, for when the key appears to be set but
 * the server disagrees.
 *
 * Names and the deployment's own identity only — never a value, never a length.
 * The name filter is deliberately narrow: "is GOOGLE_MAPS_API_KEY present" is
 * the question, and listing every variable would answer far more than that.
 *
 * Returned only to a signed-in member, which is why the session check now comes
 * before the key check rather than after.
 */
function diagnostic() {
  return {
    // Defined-but-blank is the failure that reads as "I already set that".
    key: process.env.GOOGLE_MAPS_API_KEY === undefined ? ("absent" as const) : ("empty" as const),
    // Which environment is actually serving. A variable ticked for Preview only
    // is invisible here, and this is what makes that visible.
    environment: process.env.VERCEL_ENV ?? "local",
    // If this build predates saving the variable, no redeploy happened.
    build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown",
    // Catches a typo in the name: the intended variable is absent but something
    // close to it is present.
    relatedNames: Object.keys(process.env)
      .filter((name) => /GOOGLE|MAPS|PLACES/i.test(name))
      .sort(),
  };
}

export async function POST(request: Request) {
  // Session first. An anonymous caller should learn nothing about how this
  // deployment is configured, including whether a key exists.
  const db = await createClient();
  if (!db) {
    return NextResponse.json({ error: "Address lookup needs a signed-in session." }, { status: 503 });
  }
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    // 501 rather than 500: the feature is absent, not broken. The field falls
    // back to plain typing when it sees this.
    return NextResponse.json(
      { error: "Address lookup is not configured.", diagnostic: diagnostic() },
      { status: 501 },
    );
  }

  let body: { input?: string; placeId?: string; sessionToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const sessionToken = typeof body.sessionToken === "string" ? body.sessionToken : undefined;

  try {
    if (body.placeId) {
      const response = await fetch(
        `${DETAILS}/${encodeURIComponent(body.placeId)}?${new URLSearchParams({
          ...(sessionToken ? { sessionToken } : {}),
        })}`,
        {
          headers: {
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": "formattedAddress,addressComponents,location",
          },
        },
      );

      if (!response.ok) {
        return NextResponse.json({ error: "Could not read that address." }, { status: 502 });
      }

      const place = (await response.json()) as {
        addressComponents?: { longText: string; shortText: string; types: string[] }[];
        location?: { latitude: number; longitude: number };
      };
      const parts = place.addressComponents ?? [];

      const streetNumber = component(parts, "street_number");
      const route = component(parts, "route");

      const detail: PlaceDetail = {
        address: [streetNumber, route].filter(Boolean).join(" "),
        // Google labels the city differently depending on the country; locality
        // covers most of it, with the two common fallbacks after.
        city:
          component(parts, "locality") ||
          component(parts, "postal_town") ||
          component(parts, "administrative_area_level_2"),
        state: component(parts, "administrative_area_level_1", true),
        postalCode: component(parts, "postal_code"),
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
      };

      return NextResponse.json({ detail });
    }

    const input = typeof body.input === "string" ? body.input.trim() : "";
    if (input.length < 3) return NextResponse.json({ suggestions: [] });

    const response = await fetch(AUTOCOMPLETE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({
        input,
        ...(sessionToken ? { sessionToken } : {}),
        ...(process.env.GOOGLE_PLACES_REGION
          ? { includedRegionCodes: [process.env.GOOGLE_PLACES_REGION] }
          : {}),
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Address lookup failed." }, { status: 502 });
    }

    const data = (await response.json()) as {
      suggestions?: {
        placePrediction?: {
          placeId: string;
          structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
        };
      }[];
    };

    const suggestions: Suggestion[] = (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        id: p.placeId,
        primary: p.structuredFormat?.mainText?.text ?? "",
        secondary: p.structuredFormat?.secondaryText?.text ?? "",
      }));

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ error: "Address lookup is unavailable." }, { status: 502 });
  }
}
