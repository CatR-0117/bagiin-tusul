"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { PropsWithChildren } from "react";
import { motionTokens, revealViewport } from "./motion-tokens";

export default function MotionReveal({
  children,
  className = "",
  delay = 0,
}: PropsWithChildren<{ className?: string; delay?: number }>) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={revealViewport}
      transition={{
        duration: motionTokens.duration.slow,
        delay,
        ease: motionTokens.ease.enter,
      }}
    >
      {children}
    </motion.div>
  );
}
