"use client";
import React, { useMemo, useRef, useState } from "react";
import { cn } from "@veriworkly/ui";

export const BackgroundRippleEffect = ({
  rows = 8,
  cols = 27,
  cellSize = 56,
}: {
  rows?: number;
  cols?: number;
  cellSize?: number;
}) => {
  const [clickedCell, setClickedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 h-full w-full",
        "[--cell-border-color:rgba(0,0,0,0.05)] [--cell-fill-color:rgba(59,130,246,0.4)] [--cell-shadow-color:rgba(0,0,0,0.1)]",
        "dark:[--cell-border-color:rgba(255,255,255,0.05)] dark:[--cell-fill-color:rgba(59,130,246,0.5)] dark:[--cell-shadow-color:rgba(255,255,255,0.1)]",
      )}
    >
      <div className="relative flex h-full w-full items-start justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-2 h-full w-full overflow-hidden" />
        <DivGrid
          key={`base-${rippleKey}`}
          className="mask-[radial-gradient(ellipse_100%_100%_at_50%_0%,#000_50%,transparent_100%)] opacity-70"
          rows={rows}
          cols={cols}
          cellSize={cellSize}
          borderColor="var(--cell-border-color)"
          clickedCell={clickedCell}
          onCellClick={(row, col) => {
            setClickedCell({ row, col });
            setRippleKey((k) => k + 1);
          }}
          interactive
        />
      </div>
    </div>
  );
};

type DivGridProps = {
  className?: string;
  rows: number;
  cols: number;
  cellSize: number; // in pixels
  borderColor: string;
  clickedCell: { row: number; col: number } | null;
  onCellClick?: (row: number, col: number) => void;
  interactive?: boolean;
};

type CellStyle = React.CSSProperties & {
  ["--delay"]?: string;
  ["--duration"]?: string;
};

const DivGrid = ({
  className,
  rows = 7,
  cols = 30,
  cellSize = 56,
  borderColor = "#3f3f46",
  clickedCell = null,
  onCellClick = () => {},
  interactive = true,
}: DivGridProps) => {
  const cells = useMemo(() => Array.from({ length: rows * cols }, (_, idx) => idx), [rows, cols]);

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    width: cols * cellSize,
    height: rows * cellSize,
    marginInline: "auto",
  };

  return (
    <div className={cn("relative z-3", className)} style={gridStyle}>
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const distance = clickedCell
          ? Math.hypot(clickedCell.row - rowIdx, clickedCell.col - colIdx)
          : 0;
        const delay = clickedCell ? Math.max(0, distance * 55) : 0; // ms
        const duration = 200 + distance * 80; // ms

        const style: CellStyle = clickedCell
          ? {
              "--delay": `${delay}ms`,
              "--duration": `${duration}ms`,
            }
          : {};

        return (
          <div
            key={idx}
            className={cn(
              "group cell relative border-[0.5px] transition-all duration-300 ease-out will-change-transform hover:z-10 hover:scale-105 hover:shadow-[0_0_25px_var(--cell-fill-color)] dark:shadow-[0px_0px_40px_1px_var(--cell-shadow-color)_inset]",
              !interactive && "pointer-events-none",
            )}
            style={{
              borderColor: borderColor,
              ...style,
            }}
            onClick={interactive ? () => onCellClick?.(rowIdx, colIdx) : undefined}
          >
            <div
              className={cn(
                "absolute inset-0 bg-(--cell-fill-color) opacity-0 transition-opacity duration-500 ease-out will-change-[opacity] group-hover:opacity-100",
                clickedCell && "animate-cell-ripple [animation-fill-mode:none]",
              )}
            />
          </div>
        );
      })}
    </div>
  );
};
