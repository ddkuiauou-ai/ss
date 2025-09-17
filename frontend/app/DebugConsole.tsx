"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { DebugNetworkEvent } from "../lib/debug";

export default function DebugConsole() {
  const [open, setOpen] = useState(true);
  const [logs, setLogs] = useState<DebugNetworkEvent[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<DebugNetworkEvent>).detail;
      setLogs((prev) => [detail, ...prev].slice(0, 200));
    };
    window.addEventListener("debug:network", onEvent as any);
    return () => window.removeEventListener("debug:network", onEvent as any);
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return logs;
    const q = filter.toLowerCase();
    return logs.filter((l) => `${l.method} ${l.url} ${l.status} ${l.req ?? ""} ${l.res ?? ""}`.toLowerCase().includes(q));
  }, [logs, filter]);

  const copy = () => {
    const text = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const clear = () => setLogs([]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ position: "fixed", bottom: 12, right: 12, zIndex: 99999 }}
        className="px-3 py-2 rounded-lg text-xs bg-black text-white opacity-70"
      >
        Debug
      </button>
    );
  }

  return (
    <div
      style={{ position: "fixed", bottom: 12, left: 12, width: "min(720px, 90vw)", maxHeight: "45vh", zIndex: 99999 }}
      className="rounded-xl border border-slate-300 bg-white shadow-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 p-2 border-b bg-slate-50">
        <div className="text-xs font-semibold">Debug Console</div>
        <input className="flex-1 text-xs border rounded px-2 py-1" placeholder="filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button onClick={copy} className="text-xs px-2 py-1 rounded bg-slate-900 text-white">Copy</button>
        <button onClick={clear} className="text-xs px-2 py-1 rounded border">Clear</button>
        <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded border">Hide</button>
      </div>
      <div className="overflow-auto" style={{ maxHeight: "calc(45vh - 40px)" }}>
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-gray-500">
              <th className="p-2">t</th>
              <th>m</th>
              <th>url</th>
              <th>st</th>
              <th>ms</th>
              <th>req</th>
              <th>res</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t align-top">
                <td className="p-2 text-gray-500 whitespace-nowrap">{new Date(l.t).toLocaleTimeString()}</td>
                <td className="px-1 text-gray-700 whitespace-nowrap">{l.method}</td>
                <td className="px-1 break-all text-gray-900">{l.url}</td>
                <td className="px-1 text-gray-700 whitespace-nowrap">{l.status ?? "-"}</td>
                <td className="px-1 text-gray-700 whitespace-nowrap">{l.ms ?? "-"}</td>
                <td className="px-1 text-gray-600 break-all max-w-[220px]">{l.req}</td>
                <td className="px-1 text-gray-900 break-all max-w-[360px]">{l.res}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

