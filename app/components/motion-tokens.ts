export const motionTokens = {
  duration: {
    quick: 0.22,
    base: 0.46,
    slow: 0.78,
  },
  ease: {
    standard: [0.22, 1, 0.36, 1] as [number, number, number, number],
    enter: [0.16, 1, 0.3, 1] as [number, number, number, number],
  },
  spring: {
    gentle: { type: "spring" as const, stiffness: 210, damping: 26 },
    placement: { type: "spring" as const, stiffness: 250, damping: 22 },
  },
};

export const revealViewport = { once: true, amount: 0.22 } as const;
