"use client";

import React from "react";
import {
  HP_TOKENS,
  HP_TEXT,
  Grid,
  Row,
  Stack,
  Spacer,
  HPButton,
  TabBar,
  EmptyState,
  Stagger,
  StaggerItem,
} from "@/components/ui";
import RewardCard from "@/components/recognize/RewardCard";

type Filter = "all" | "ready" | "wishlist";

interface RewardGridProps {
  rewards: any[];
  points: number;
  wishlistId?: number | string | null;
  onToggleWishlist?: (reward: any) => void;
  onRedeem: (reward: any) => void;
  pageSize?: number;
}

/**
 * The reward catalogue: filter, grid, pagination.
 *
 * Lives here rather than in the three role screens, which each had their own
 * copy of this loop and drifted apart. Role screens compose it; they don't
 * reimplement it.
 */
export default function RewardGrid({
  rewards,
  points,
  wishlistId,
  onToggleWishlist,
  onRedeem,
  pageSize = 6,
}: RewardGridProps) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [page, setPage] = React.useState(1);

  const inStock = (r: any) => r.stock === undefined || r.stock > 0;
  const readyCount = rewards.filter((r) => r.points <= points && inStock(r)).length;
  const wishlistCount = rewards.filter((r) => r.id === wishlistId).length;

  const visible = React.useMemo(() => {
    const filtered = rewards.filter((r) => {
      if (filter === "ready") return r.points <= points && inStock(r);
      if (filter === "wishlist") return r.id === wishlistId;
      return true;
    });

    // Starred first, then what's affordable now, then by price. Sold-out items
    // sink to the bottom rather than disappearing — stock comes back.
    return [...filtered].sort((a, b) => {
      if (a.id === wishlistId) return -1;
      if (b.id === wishlistId) return 1;
      if (inStock(a) !== inStock(b)) return inStock(a) ? -1 : 1;
      const aReady = a.points <= points;
      const bReady = b.points <= points;
      if (aReady !== bReady) return aReady ? -1 : 1;
      return a.points - b.points;
    });
  }, [rewards, filter, points, wishlistId]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, totalPages);
  const slice = visible.slice((current - 1) * pageSize, current * pageSize);

  // Switching filter while deep in the pages would otherwise land on nothing.
  const changeFilter = (next: string) => {
    setFilter(next as Filter);
    setPage(1);
  };

  if (rewards.length === 0) {
    return (
      <EmptyState
        icon="gift"
        title="Belum ada reward"
        description="Katalog reward masih kosong. HR bisa menambahkannya dari halaman ini."
      />
    );
  }

  return (
    <Stack gap={4}>
      <TabBar
        label="Filter reward"
        value={filter}
        onChange={changeFilter}
        options={[
          { key: "all", label: "Semua", count: rewards.length },
          { key: "ready", label: "Bisa ditukar", count: readyCount },
          { key: "wishlist", label: "Wishlist", count: wishlistCount },
        ]}
      />

      {slice.length === 0 ? (
        <EmptyState
          icon={filter === "wishlist" ? "star" : "target"}
          title={filter === "wishlist" ? "Belum ada wishlist" : "Belum ada yang terjangkau"}
          description={
            filter === "wishlist"
              ? "Tandai satu reward dengan ikon bintang supaya progres poinmu mengarah ke sana."
              : "Kumpulkan poin lagi dari task harian dan kebiasaan untuk membuka reward pertama."
          }
          action={
            <HPButton size="sm" onClick={() => changeFilter("all")}>
              Lihat semua reward
            </HPButton>
          }
          compact
        />
      ) : (
        <Stagger>
          {/*
            Two things make the cards one size.

            `gridAutoRows: 1fr` equalises the row heights — implicit rows
            otherwise size to their own tallest card, so a row of affordable
            rewards came out shorter than a row carrying progress bars.

            And the StaggerItem stays a plain block. It used to be
            `display: flex`, which made the card a flex item: flex items don't
            grow by default and size to their content, so each card was only as
            wide as its own text rather than filling its column. As a block, the
            grid stretches the item to the full column and the card fills it.
          */}
          <Grid min={280} gap={4} style={{ gridAutoRows: "1fr" }}>
            {slice.map((r: any) => (
              <StaggerItem key={r.id}>
                <RewardCard
                  title={r.title}
                  points={r.points}
                  tone={r.tone}
                  glyph={r.glyph}
                  category={r.category}
                  description={r.description}
                  stock={r.stock}
                  isWishlist={r.id === wishlistId}
                  onToggleWishlist={
                    onToggleWishlist ? () => onToggleWishlist(r) : undefined
                  }
                  onRedeem={() => onRedeem(r)}
                />
              </StaggerItem>
            ))}
          </Grid>
        </Stagger>
      )}

      {totalPages > 1 && (
        <Row gap={3}>
          <HPButton
            size="sm"
            icon="chevronLeft"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            Sebelumnya
          </HPButton>
          <Spacer />
          <span style={{ ...HP_TEXT.small, fontVariantNumeric: "tabular-nums", color: HP_TOKENS.inkMute }}>
            {current} / {totalPages}
          </span>
          <Spacer />
          <HPButton
            size="sm"
            iconEnd="chevronRight"
            disabled={current === totalPages}
            onClick={() => setPage(current + 1)}
          >
            Berikutnya
          </HPButton>
        </Row>
      )}
    </Stack>
  );
}
