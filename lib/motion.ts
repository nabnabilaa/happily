/**
 * Motion preferences for imperative (JS-driven) animation.
 *
 * The CSS side is already handled: `app/globals.css` has a
 * `@media (prefers-reduced-motion: reduce)` block that clamps every animation
 * and transition through `*, *::before, *::after` with `!important`, so it wins
 * over component stylesheets and inline `<style>` blocks alike. The React side
 * is handled by `useSafeVariants` in `components/ui/motion`.
 *
 * Neither covers `element.scrollIntoView({ behavior: 'smooth' })`. That
 * `behavior` is an argument to a DOM method, not a CSS declaration — the
 * `scroll-behavior: auto !important` in the reduced-motion block cannot reach
 * it, and the page smooth-scrolls anyway. A long programmatic scroll is exactly
 * the motion that provokes vestibular symptoms, so it is the one that most
 * needs the preference honoured.
 */

/** True when the user has asked the OS for reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * `scrollIntoView` that respects the preference: same destination, no journey.
 * Drop-in replacement — pass the options you would have passed.
 */
export function scrollIntoViewSafely(
  el: Element | null | undefined,
  options: ScrollIntoViewOptions = { behavior: "smooth", block: "center" }
): void {
  if (!el) return;
  el.scrollIntoView(
    prefersReducedMotion() ? { ...options, behavior: "auto" } : options
  );
}
