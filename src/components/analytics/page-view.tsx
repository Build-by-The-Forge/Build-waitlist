"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

export function PageView() {
  const pathname = usePathname();
  useEffect(() => {
    track("page_view", { path: pathname, referrer: document.referrer || "direct" });
  }, [pathname]);
  return null;
}
