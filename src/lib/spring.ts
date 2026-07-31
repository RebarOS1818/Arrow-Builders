/**
 * A small, interruptible spring.
 *
 * Springs rather than CSS transitions because anything a finger can touch must
 * be grabbable mid-flight: a transition cannot be redirected without a visible
 * jump, since it interpolates from where it was told to start rather than from
 * where the element actually is. A spring animates from the current value by
 * construction, so re-targeting mid-motion is just a new target — the position
 * and velocity carry through and there is no seam.
 *
 * Parameterised the way Apple exposes it — bounce and response — rather than
 * mass/stiffness/damping, because those are the two things you actually reason
 * about when tuning a gesture.
 */

export type SpringOptions = {
  /** 0 = critically damped, no overshoot. ~0.2 for momentum-driven motion. */
  bounce?: number;
  /** Roughly how long it takes to reach the target, in seconds. Not a duration. */
  response?: number;
  /** Initial velocity in units/second — hand the release velocity in here. */
  velocity?: number;
};

export type SpringHandle = { stop: () => void };

/**
 * Animates `from` to `to`, calling `onFrame` each frame. Returns a handle whose
 * stop() cancels — call it before starting a new spring on the same element so
 * two springs never fight over one property.
 */
export function spring(
  from: number,
  to: number,
  onFrame: (value: number) => void,
  { bounce = 0, response = 0.4, velocity = 0 }: SpringOptions = {},
  onRest?: () => void,
): SpringHandle {
  // Apple's bounce maps to damping ratio: 0 bounce = critically damped.
  const dampingRatio = 1 - bounce;
  const omega = (2 * Math.PI) / response;

  let value = from;
  let v = velocity;
  let raf = 0;
  let last = 0;
  let stopped = false;

  function frame(now: number) {
    if (stopped) return;
    if (!last) last = now;
    // Clamp dt so a backgrounded tab does not resume with one enormous step.
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;

    // Semi-implicit Euler: stable at the step sizes rAF gives us.
    const displacement = value - to;
    const acceleration = -omega * omega * displacement - 2 * dampingRatio * omega * v;
    v += acceleration * dt;
    value += v * dt;

    // Settle when both the remaining distance and the speed are imperceptible.
    if (Math.abs(value - to) < 0.05 && Math.abs(v) < 0.05) {
      onFrame(to);
      onRest?.();
      return;
    }

    onFrame(value);
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
    },
  };
}

/**
 * Where a flick would come to rest, using the same exponential decay as scroll
 * deceleration. Snap to the target nearest *this*, not to the nearest target
 * from the release point — that is what makes a flick feel thrown rather than
 * merely let go.
 */
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** True when the user has asked for reduced motion. Safe before hydration. */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}
