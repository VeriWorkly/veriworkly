"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CinematicCTA() {
  const ref = useRef<HTMLAnchorElement>(null);

  // Magnetic hover physics
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    // Calculate distance from center (max 30px pull)
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    x.set(distanceX * 0.2);
    y.set(distanceY * 0.2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <section className="mx-auto flex w-full flex-col items-center justify-center px-4 py-32 text-center md:py-48">
      <motion.h2 
        className="text-balance font-sans text-5xl font-medium tracking-tighter text-zinc-950 md:text-7xl lg:text-8xl dark:text-white"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        Ready to deploy <br /> your career?
      </motion.h2>

      <motion.div
        className="mt-16"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link
          href="/studio"
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <motion.div
            style={{ x: mouseXSpring, y: mouseYSpring }}
            className="group relative flex h-24 items-center justify-center gap-4 overflow-hidden rounded-full bg-zinc-950 px-12 text-2xl font-medium text-white shadow-2xl transition-shadow hover:shadow-[0_0_80px_-15px_rgba(0,0,0,0.5)] dark:bg-white dark:text-zinc-950 dark:hover:shadow-[0_0_80px_-15px_rgba(255,255,255,0.3)]"
          >
            {/* Liquid hover fill */}
            <div className="absolute inset-0 z-0 origin-left scale-x-0 bg-white/20 transition-transform duration-500 ease-[0.16,1,0.3,1] group-hover:scale-x-100 dark:bg-black/10" />
            
            <span className="relative z-10">Launch the Studio</span>
            <ArrowRight className="relative z-10 h-8 w-8 transition-transform duration-300 group-hover:translate-x-2" />
          </motion.div>
        </Link>
      </motion.div>
      
      <motion.p
        className="mt-8 text-lg text-zinc-500"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        Free forever. No credit card. No sign up required.
      </motion.p>
    </section>
  );
}
