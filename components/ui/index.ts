/**
 * Flowbuddy UI kit — single import surface.
 *
 *   import { Stack, Row, HPCard, HPButton, StatTile } from "@/components/ui";
 *
 * Prefer these over hand-written inline styles. If something you need isn't
 * here, add it here rather than inlining it in a screen — that's how the old
 * style sprawl started. See DESIGN_SYSTEM.md.
 */

// Layout
export { Stack, Row, Grid, Spacer, Divider, IconBadge } from "./Layout";
export type { Step } from "./Layout";
export { default as PageGrid } from "./PageGrid";
export { default as ActionList } from "./ActionList";
export type { ActionItem } from "./ActionList";

// Surfaces
export { default as HPCard } from "./HPCard";
export { default as Modal } from "./Modal";
export { default as ConfirmDialog } from "./ConfirmDialog";

// Controls
export { default as HPButton } from "./HPButton";
export { default as TabBar } from "./TabBar";
export { default as HPInput, HPTextarea, HPSelect } from "./HPInput";
export { default as HPSelectMenu } from "./HPSelectMenu";
export type { SelectMenuOption } from "./HPSelectMenu";

// Data display
export { default as HPChip } from "./HPChip";
export { default as HPBar } from "./HPBar";
export { default as StatTile } from "./StatTile";
export { default as ListRow, ListGroup } from "./ListRow";
export { default as HPGlyph } from "./HPGlyph";
export { default as HPAvatar } from "./HPAvatar";

// Screen scaffolding
export { default as ScreenHeader } from "./ScreenHeader";
export { default as EmptyState } from "./EmptyState";
export { default as HPPlaceholder } from "./HPPlaceholder";

// Motion
export {
  FadeIn,
  Stagger,
  StaggerItem,
  Press,
  Reveal,
  CountUp,
  SwitchView,
  motion,
  AnimatePresence,
  useReducedMotion,
  EASE,
  EASE_OUT,
  SPRING,
  SPRING_SOFT,
} from "./motion";

// Tokens, re-exported so a screen needs one import line, not two.
export { HP_TOKENS, HP_TEXT, HP_SPACE, HP_MOTION, HP_FONT, HP_FONT_DISPLAY, HP_CATEGORICAL } from "@/lib/constants";
