"use client";

import React from "react";
import {
  HP_TOKENS,
  HPButton,
  HPChip,
  HPGlyph,
  IconBadge,
  ListRow,
  ListGroup,
  EmptyState,
  Row,
} from "@/components/ui";

interface RewardInventoryListProps {
  rewards: any[];
  onAdd: () => void;
  onEdit: (reward: any) => void;
  onDelete: (id: number | string) => void;
}

/**
 * HR-only catalogue management. Rows are plain (not clickable) so the Edit and
 * Delete buttons inside them stay valid — a button can't nest in a button.
 */
export default function RewardInventoryList({
  rewards,
  onAdd,
  onEdit,
  onDelete,
}: RewardInventoryListProps) {
  if (rewards.length === 0) {
    return (
      <EmptyState
        icon="gift"
        title="Inventory masih kosong"
        description="Tambahkan reward pertama supaya tim punya sesuatu untuk dituju."
        action={
          <HPButton variant="primary" icon="plus" onClick={onAdd}>
            Tambah reward
          </HPButton>
        }
      />
    );
  }

  return (
    <ListGroup>
      {rewards.map((r: any) => {
        const soldOut = r.stock !== undefined && r.stock <= 0;
        return (
          <ListRow
            key={r.id}
            leading={
              <IconBadge size={40} tone={HP_TOKENS.sunken}>
                <HPGlyph name={r.glyph || "gift"} size={19} color={HP_TOKENS.inkSoft} />
              </IconBadge>
            }
            title={r.title}
            subtitle={
              <Row gap={2} style={{ display: "inline-flex" }}>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {Number(r.points).toLocaleString("id-ID")} poin
                </span>
                <span style={{ color: HP_TOKENS.inkFade }}>·</span>
                <span>Stok {r.stock ?? "–"}</span>
              </Row>
            }
            trailing={
              <>
                {soldOut ? (
                  <HPChip tone="danger">Habis</HPChip>
                ) : r.stock !== undefined && r.stock <= 5 ? (
                  <HPChip tone="warning">Menipis</HPChip>
                ) : null}
                <HPButton size="sm" onClick={() => onEdit(r)}>
                  Edit
                </HPButton>
                <HPButton
                  size="sm"
                  variant="danger"
                  iconOnly
                  icon="trash"
                  aria-label={`Hapus reward ${r.title}`}
                  onClick={() => onDelete(r.id)}
                />
              </>
            }
          />
        );
      })}
    </ListGroup>
  );
}
