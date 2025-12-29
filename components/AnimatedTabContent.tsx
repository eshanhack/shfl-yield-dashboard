"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedTabContentProps {
  children: ReactNode;
  tabKey: string;
}

export default function AnimatedTabContent({ children, tabKey }: AnimatedTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{
          duration: 0.25,
          ease: [0.25, 0.46, 0.45, 0.94], // Custom ease for smooth feel
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

