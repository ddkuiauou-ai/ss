"use client";

import { useEffect, useState } from "react";
import { isDebugEnabled, setupDebugNetworkLogging } from "../lib/debug";
import DebugConsole from "./DebugConsole";

export default function DebugBootstrap() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const onLoad = () => {
      const ok = isDebugEnabled();
      if (ok) setupDebugNetworkLogging();
      setEnabled(ok);
    };
    onLoad();
  }, []);
  return enabled ? <DebugConsole /> : null;
}

