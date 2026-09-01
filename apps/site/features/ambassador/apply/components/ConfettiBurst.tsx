import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export type ConfettiPiece = {
  id: number;
  emoji: string;
  x: number;
  y: number;
  rotate: number;
  delay: number;
};

export function generateConfetti(): ConfettiPiece[] {
  return Array.from({ length: 18 }, (_, i) => ({
    id: i,
    emoji: ["🎉", "✨", "🎊", "🚀", "💎"][i % 5],
    x: (Math.random() - 0.5) * 360,
    y: -(Math.random() * 220 + 60),
    rotate: (Math.random() - 0.5) * 180,
    delay: Math.random() * 0.15,
  }));
}

export const ConfettiBurst = () => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPieces(generateConfetti());
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0.6 }}
          animate={{ opacity: 0, x: piece.x, y: piece.y, rotate: piece.rotate, scale: 1.1 }}
          transition={{ duration: 1.4, delay: piece.delay, ease: "easeOut" }}
          className="absolute top-1/3 text-2xl"
        >
          {piece.emoji}
        </motion.span>
      ))}
    </div>
  );
};

export default ConfettiBurst;
