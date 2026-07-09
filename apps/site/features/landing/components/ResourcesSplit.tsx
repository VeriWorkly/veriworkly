"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function ResourcesSplit() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-32 md:px-8 md:py-48">
      <div className="grid grid-cols-1 gap-24 lg:grid-cols-2 lg:gap-16">
        
        {/* Left: The Blog/Editorial focus */}
        <motion.div
          className="group relative flex aspect-square w-full flex-col justify-end overflow-hidden rounded-[2.5rem] bg-zinc-100 p-8 md:p-12 dark:bg-zinc-900"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out group-hover:scale-105"
            style={{ backgroundImage: 'url(https://picsum.photos/seed/editorial/800/800)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
          
          <div className="relative z-10">
            <h3 className="text-balance font-sans text-3xl font-medium tracking-tighter text-white md:text-5xl">
              Career insights <br /> and system updates.
            </h3>
            <Link 
              href="/blog" 
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-950 transition-transform hover:scale-105 active:scale-95"
            >
              Read the Journal <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>

        {/* Right: The Docs / Knowledge Base */}
        <div className="flex flex-col justify-center">
          <motion.h2 
            className="text-balance font-sans text-4xl font-medium tracking-tighter text-zinc-950 md:text-5xl dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Developer Documentation
          </motion.h2>
          <motion.p 
            className="mt-6 max-w-[45ch] text-lg text-zinc-600 dark:text-zinc-400"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            VeriWorkly is open-core. Read our comprehensive documentation to understand our privacy architecture, or learn how to self-host your own career workspace.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link 
              href="/docs"
              className="mt-12 inline-flex items-center gap-4 text-xl font-medium text-zinc-950 transition-colors hover:text-zinc-500 dark:text-white dark:hover:text-zinc-400"
            >
              <span className="border-b border-zinc-300 pb-1 dark:border-zinc-700">Explore the Docs</span>
              <ArrowUpRight className="h-6 w-6" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
