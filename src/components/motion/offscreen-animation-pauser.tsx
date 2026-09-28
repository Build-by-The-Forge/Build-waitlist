"use client";

import { useEffect } from "react";

const LOOPING = ".animate-float, .animate-pulse-soft, .animate-ping, .animate-pulse";

/**
 * Pauses looping CSS animations while they're off-screen. Browsers keep
 * running (and restyling) infinite animations that nobody can see, which on
 * a page this long adds up to real main-thread time on low-end phones.
 */
export function OffscreenAnimationPauser() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          (entry.target as HTMLElement | SVGElement).style.animationPlayState = entry.isIntersecting ? "" : "paused";
        }
      },
      { rootMargin: "120px 0px" },
    );
    const observe = (root: ParentNode) => root.querySelectorAll(LOOPING).forEach((el) => observer.observe(el));
    observe(document);

    // Pick up looping elements that mount later (e.g. the demo's pulse).
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(LOOPING)) observer.observe(node);
          observe(node);
        });
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return null;
}
