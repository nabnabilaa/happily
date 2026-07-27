"use client";

/**
 * Motion primitives.
 *
 * House rules, so animation stays a usability aid rather than decoration:
 *  - Transform and opacity only. Never animate layout properties.
 *  - Entrances travel a short distance (6–14px) over 220–320ms.
 *  - Presses respond within 140ms and never change layout bounds.
 *  - Everything collapses to an instant state change under reduced motion.
 *
 * Import from "@/components/ui/motion" rather than reaching for `motion/react`
 * directly, so timing stays consistent across screens.
 */

import React from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Transition,
  type Variants,
  type HTMLMotionProps,
} from "motion/react";

export { motion, AnimatePresence, useReducedMotion };

/* ── Shared transitions ────────────────────────────────────────────── */

/** Default for entrances and layout settles. */
export const EASE_OUT: Transition = {
  duration: 0.32,
  ease: [0.16, 1, 0.3, 1],
};

/** Default for state flips (colour, position of small elements). */
export const EASE: Transition = {
  duration: 0.22,
  ease: [0.22, 0.61, 0.36, 1],
};

/** For anything that should feel physical: sheets, toggles, drag release. */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.9,
};

/** Softer spring for larger surfaces so they don't overshoot visibly. */
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 1,
};

/* ── Variants ──────────────────────────────────────────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: EASE_OUT },
  exit: { opacity: 0, y: -6, transition: EASE },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: EASE_OUT },
  exit: { opacity: 0, transition: EASE },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: EASE_OUT },
  exit: { opacity: 0, scale: 0.98, transition: EASE },
};

/**
 * Parent variant for lists. Per-item delay stays small so a long list still
 * finishes revealing quickly.
 */
export const staggerParent = (stagger = 0.04, delayChildren = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
  exit: {},
});

/* ── Reduced motion ────────────────────────────────────────────────── */

/**
 * Returns the variants unchanged, or a no-movement version when the user has
 * asked for reduced motion. Content still appears — only the travel is dropped.
 */
export function useSafeVariants(variants: Variants): Variants {
  const reduce = useReducedMotion();
  return React.useMemo(() => {
    if (!reduce) return variants;
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.01 } },
      exit: { opacity: 0, transition: { duration: 0.01 } },
    };
  }, [reduce, variants]);
}

/* ── Components ────────────────────────────────────────────────────── */

type DivProps = HTMLMotionProps<"div">;

interface FadeInProps extends Omit<DivProps, "variants" | "initial" | "animate"> {
  /** Seconds to wait before starting. Keep under 0.3s. */
  delay?: number;
  /** Entrance style. `up` is the default for cards and sections. */
  variant?: "up" | "fade" | "scale";
}

/** Single element entrance. Plays once when it mounts. */
export function FadeIn({ delay = 0, variant = "up", ...rest }: FadeInProps) {
  const base = variant === "fade" ? fade : variant === "scale" ? scaleIn : fadeUp;
  const variants = useSafeVariants(base);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      variants={variants}
      transition={{ delay }}
      {...rest}
    />
  );
}

interface StaggerProps extends Omit<DivProps, "variants" | "initial" | "animate"> {
  /** Seconds between each child. */
  stagger?: number;
  delay?: number;
}

/**
 * Wraps a list so its children reveal in sequence. Children must be
 * `<StaggerItem>` (or any motion element using the `hidden`/`show` variants).
 */
export function Stagger({ stagger = 0.04, delay = 0, ...rest }: StaggerProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerParent(reduce ? 0 : stagger, delay)}
      {...rest}
    />
  );
}

/** A child of `<Stagger>`. */
export function StaggerItem({ ...rest }: Omit<DivProps, "variants">) {
  const variants = useSafeVariants(fadeUp);
  return <motion.div variants={variants} {...rest} />;
}

interface PressProps extends Omit<DivProps, "whileTap" | "whileHover"> {
  /** How far to shrink on press. 0.97 suits cards; 0.94 suits small buttons. */
  scale?: number;
  /** Lift slightly on hover. Pointer devices only. */
  lift?: boolean;
  disabled?: boolean;
}

/**
 * Press feedback for tappable surfaces. Uses transform only, so surrounding
 * content never shifts.
 */
export function Press({
  scale = 0.97,
  lift = false,
  disabled = false,
  style,
  ...rest
}: PressProps) {
  const reduce = useReducedMotion();
  const active = !disabled && !reduce;

  return (
    <motion.div
      whileTap={active ? { scale } : undefined}
      whileHover={active && lift ? { y: -2 } : undefined}
      transition={SPRING}
      style={{ cursor: disabled ? "not-allowed" : "pointer", ...style }}
      {...rest}
    />
  );
}

interface RevealProps extends Omit<DivProps, "variants" | "initial" | "whileInView"> {
  /** Fraction of the element that must be visible before it animates. */
  amount?: number;
  delay?: number;
}

/** Entrance that waits until the element scrolls into view. Plays once. */
export function Reveal({ amount = 0.15, delay = 0, ...rest }: RevealProps) {
  const variants = useSafeVariants(fadeUp);
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={variants}
      transition={{ delay }}
      {...rest}
    />
  );
}

interface CountUpProps {
  value: number;
  /** Seconds. Keep short — long counts read as lag. */
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}

/**
 * Animates a number to its new value. Falls back to the plain value under
 * reduced motion.
 */
export function CountUp({
  value,
  duration = 0.7,
  decimals = 0,
  suffix = "",
  prefix = "",
}: CountUpProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(reduce ? value : 0);
  const fromRef = React.useRef(0);

  React.useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    let frame = 0;
    const start = performance.now();
    const ms = duration * 1000;

    const tick = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
      // easeOutCubic — fast start, gentle settle
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + delta * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduce]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Crossfades between screens/tabs. Give each child a stable `key`. */
export function SwitchView({
  viewKey,
  children,
  style,
}: {
  viewKey: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const variants = useSafeVariants(fadeUp);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={viewKey}
        initial="hidden"
        animate="show"
        exit="exit"
        variants={variants}
        style={style}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
