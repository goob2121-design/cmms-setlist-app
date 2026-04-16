"use client";

import { useEffect } from "react";

type PrintAutoLaunchProps = {
  enabled: boolean;
};

export function PrintAutoLaunch({ enabled }: PrintAutoLaunchProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timeout = window.setTimeout(() => {
      window.print();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [enabled]);

  return null;
}
