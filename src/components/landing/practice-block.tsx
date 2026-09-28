"use client";

import { useCallback, useState } from "react";
import { Flow, Showcase } from "@/components/landing/showcase-parts";
import { PRACTICE_STAGES, PracticeSession } from "@/components/visuals/practice-session";
import { ProductWindow } from "@/components/visuals/product-window";

/** The one interactive showcase: its step pills follow the live practice session. */
export function PracticeBlock() {
  const [stage, setStage] = useState(0);
  const onStage = useCallback((s: number) => setStage(s), []);
  return (
    <Showcase
      index="02"
      title="Practice what matters."
      body="Practice tests built around your course, not generic question banks. Every answer is checked and explained, then you move straight to the next."
      flow={<Flow steps={PRACTICE_STAGES} active={stage} />}
      reverse
    >
      <ProductWindow title="BUILD · Practice">
        <PracticeSession onStage={onStage} />
      </ProductWindow>
    </Showcase>
  );
}
