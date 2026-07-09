"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

export default function SecurityEditorial() {
  return (
    <section className="w-full bg-zinc-950 py-32 text-white md:py-48">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-8">
          {/* Left: Huge headline */}
          <div className="lg:col-span-7">
            <motion.h2 
              className="text-balance font-sans text-5xl font-medium tracking-tighter sm:text-6xl md:text-8xl"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              Zero <br />
              Knowledge. <br />
              Total Control.
            </motion.h2>
          </div>
          
          {/* Right: Editorial explanation and visual */}
          <div className="flex flex-col justify-end lg:col-span-5">
            <motion.div
              className="mb-12 flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-md"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Lock className="h-8 w-8 text-white" />
            </motion.div>

            <motion.p 
              className="max-w-[45ch] text-xl leading-relaxed text-zinc-400"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              Your career data is sensitive. That is why VeriWorkly runs an entirely local-first architecture. 
              We don&apos;t store your resume on our servers. The intelligence runs in your browser, and your data stays on your machine.
            </motion.p>

            <motion.div 
              className="mt-12 w-full border-t border-white/10 pt-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <ul className="space-y-4 font-mono text-sm uppercase tracking-widest text-zinc-500">
                <li className="flex justify-between">
                  <span>Server Storage</span>
                  <span className="text-white">Disconnected</span>
                </li>
                <li className="flex justify-between">
                  <span>Browser Vault</span>
                  <span className="text-emerald-400">Encrypted</span>
                </li>
                <li className="flex justify-between">
                  <span>Open Core</span>
                  <span className="text-white">Auditable</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
