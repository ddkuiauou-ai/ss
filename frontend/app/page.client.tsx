"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDeals as apiGetDeals, getRules as apiGetRules, postRule as apiPostRule, deleteRule as apiDeleteRule, saveProfile as apiSaveProfile, getDailyReportsLatest, getDailyReportsRange } from "../lib/api";

// —— helpers ——
function krw(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function formatCarrier(c: string) {
  if (c === 'LGU+') return 'LG U+';
  if (c === 'MVNO') return '알뜰';
  return c;
}
function formatChannel(ch?: string | null) {
  if (!ch) return '';
  if (ch === 'offline') return '오프라인';
  if (ch === 'online') return '온라인';
  return ch;
}

function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "brand" | "warn" | "danger" | "good" }) {
  const tones: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-700",
    brand: "bg-blue-100 text-blue-700",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-700",
    good: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${tones[tone]}`}>{label}</span>
  );
}

// —— Deal Detail Modal ——
function DealDetailModal({ d, onClose }: { d: Deal; onClose: () => void }) {
  const nz = (v?: number | null) => (typeof v === 'number' ? v : 0);
  const monthly24 = (value?: number | null) => value == null ? null : Math.floor((value + 23) / 24);
  const plan1 = nz(d.plan_high_fee) * nz(d.plan_high_months);
  const plan2 = nz(d.plan_after_fee) * nz(d.plan_after_months);
  const tail = nz(d.mvno_tail_fee) * nz(d.mvno_tail_months);
  const addons = nz(d.addons_monthly) * nz(d.addons_months);
  const device = nz(d.device_finance_total);
  const tco = nz(d.tco_total) || (nz(d.upfront) + plan1 + plan2 + tail + addons + device);
  const net = (d.tco_net != null ? d.tco_net : tco - nz(d.support_cash)) || 0;
  const netMonthly = d.tco_net_monthly_24m ?? monthly24(net) ?? 0;
  const tcoMonthly = d.tco_monthly_24m ?? monthly24(tco) ?? 0;
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[12px] text-gray-500">{d.model} ({d.capacity ?? '용량 미상'})</div>
            <div className="text-[12px] text-gray-500 mt-0.5">{formatCarrier(d.carrier)}{d.channel ? ` · ${formatChannel(d.channel)}` : ''}{d.city ? ` · ${d.city}` : ''}</div>
            {(d.sourceUrl || (d as any).url) && (
              <a href={(d.sourceUrl || (d as any).url)!} target="_blank" rel="noreferrer" className="text-[12px] text-blue-600 underline">원문 링크</a>
            )}
          </div>
          <button className="text-sm" onClick={onClose}>닫기</button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-[12px] text-gray-500">순지출(Net)</div>
            <div className="text-lg font-bold">{Number(net).toLocaleString()}원</div>
            <div className="text-[12px] text-gray-500">{Number(netMonthly).toLocaleString()}원/월</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-[12px] text-gray-500">총비용(TCO)</div>
            <div className="text-lg font-bold">{Number(tco).toLocaleString()}원</div>
            <div className="text-[12px] text-gray-500">{Number(tcoMonthly).toLocaleString()}원/월</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-sm font-semibold mb-1">비용 구성 Breakdown</div>
          <table className="w-full text-[12px]">
            <tbody>
              {nz(d.upfront) > 0 && (
                <tr><td className="py-1 text-gray-600">일시금</td><td className="py-1 text-right">{nz(d.upfront).toLocaleString()}원</td></tr>
              )}
              {plan1 > 0 && (
                <tr title={`요금제 1구간 ${nz(d.plan_high_fee).toLocaleString()}원 × ${nz(d.plan_high_months)}개월 = ${plan1.toLocaleString()}원`}>
                  <td className="py-1 text-gray-600">요금제 1구간</td><td className="py-1 text-right">{plan1.toLocaleString()}원</td>
                </tr>
              )}
              {plan2 > 0 && (
                <tr title={`요금제 2구간 ${nz(d.plan_after_fee).toLocaleString()}원 × ${nz(d.plan_after_months)}개월 = ${plan2.toLocaleString()}원`}>
                  <td className="py-1 text-gray-600">요금제 2구간</td><td className="py-1 text-right">{plan2.toLocaleString()}원</td>
                </tr>
              )}
              {tail > 0 && (
                <tr title={`MVNO 꼬리 ${nz(d.mvno_tail_fee).toLocaleString()}원 × ${nz(d.mvno_tail_months)}개월 = ${tail.toLocaleString()}원`}>
                  <td className="py-1 text-gray-600">MVNO 꼬리</td><td className="py-1 text-right">{tail.toLocaleString()}원</td>
                </tr>
              )}
              {addons > 0 && (
                <tr title={`부가서비스 ${nz(d.addons_monthly).toLocaleString()}원 × ${nz(d.addons_months)}개월 = ${addons.toLocaleString()}원`}>
                  <td className="py-1 text-gray-600">부가서비스 합계</td><td className="py-1 text-right">{addons.toLocaleString()}원</td>
                </tr>
              )}
              {device > 0 && (
                <tr>
                  <td className="py-1 text-gray-600">단말(할부)</td>
                  <td className="py-1 text-right">{device.toLocaleString()}원{d.device_finance_monthly && d.device_finance_months ? ` (월 ${nz(d.device_finance_monthly).toLocaleString()}원 × ${nz(d.device_finance_months)}개월)` : ''}</td>
                </tr>
              )}
              {typeof d.support_cash === 'number' && d.support_cash > 0 && (
                <tr title={`지원금(차비/캐시백 등) = ${nz(d.support_cash).toLocaleString()}원`}>
                  <td className="py-1 text-gray-600">지원금</td><td className="py-1 text-right">- {nz(d.support_cash).toLocaleString()}원</td>
                </tr>
              )}
              <tr className="border-t">
                <td className="py-1 font-semibold">총비용(TCO)</td><td className="py-1 text-right font-semibold">{tco.toLocaleString()}원</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">순지출(Net)</td><td className="py-1 text-right font-semibold">{net.toLocaleString()}원</td>
              </tr>
            </tbody>
          </table>
          {Array.isArray(d.addons_detail) && d.addons_detail.length > 0 && (
            <div className="mt-2">
              <div className="text-[12px] text-gray-600 mb-1">부가서비스 상세</div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-gray-500"><th className="text-left">이름</th><th className="text-right">월</th><th className="text-right">개월</th><th className="text-right">비고</th></tr>
                </thead>
                <tbody>
                  {d.addons_detail.map((a, i) => (
                    <tr key={i}><td className="py-1">{a.name}</td><td className="py-1 text-right">{nz(a.fee).toLocaleString()}원</td><td className="py-1 text-right">{nz(a.months)}</td><td className="py-1 text-right">{a.note || ''}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(d.contract_type || d.contract) && <Badge label={(d.contract_type || d.contract)!} />}
          {d.contract_months && <Badge label={`약정 ${d.contract_months}개월`} />}
          {d.contract_extra_support && <Badge label="추가지원" tone="brand" />}
          {d.retention_line_months && <Badge label={`유지(라인) ${d.retention_line_months}개월`} />}
          {d.retention_plan_months && <Badge label={`유지(요금제) ${d.retention_plan_months}개월`} />}
          {d.retention_addons_months && <Badge label={`유지(부가) ${d.retention_addons_months}개월`} />}
        </div>
      </div>
    </div>
  );
}
function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <div className="text-gray-500">{label}</div>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  );
}

// —— TCO engine (simplified for MVP preview, 24M) ——
export type Deal = {
  id: string;
  model: string;
  capacity: string | null;
  carrier: "SKT" | "KT" | "LGU+" | "MVNO" | "미상";
  parsedAt?: string | null;
  channel?: "online" | "offline" | "unknown" | string | null;
  moveType?: "번호이동" | "기기변경" | "자급";
  contract?: "공시지원" | "선택약정" | "무약정" | null;
  contract_support_amount?: number | null; // 공시지원금(원), TCO 합산 제외
  payment?: "현금완납" | "할부" | null;
  summary_raw: string; // 원문 요약(슬랭 포함)
  city?: string | null;
  // pricing blocks
  upfront: number; // device upfront(현완/선납)
  planHigh?: { fee: number; months: number } | null;
  planAfter?: { fee: number; months: number } | null; // e.g., 6만원x18
  mvnoTail?: { fee: number; months: number } | null; // migrate to MVNO tail
  addons?: { monthly: number; months: number; label?: string } | null;
  misc?: { sim: number } | null;
  baselineUnlocked?: { devicePrice: number; mvnoFee: number; months: number } | null; // compare vs 자급+알뜰
  // risk & flags
  flags?: string[]; // 좌표 필요, 조건 일부 추정 등
  badges?: { label: string; tone?: "neutral" | "brand" | "warn" | "danger" | "good" }[];
  sourceUrl?: string;
  slang?: string[]; // 원문 슬랭 토큰(툴팁/학습용)
  tco_total?: number | null;
  tco_monthly_24m?: number | null;
  tco_net?: number | null;
  tco_net_monthly_24m?: number | null;
  // raw fields for breakdown
  plan_high_fee?: number | null;
  plan_high_months?: number | null;
  plan_after_fee?: number | null;
  plan_after_months?: number | null;
  mvno_tail_fee?: number | null;
  mvno_tail_months?: number | null;
  addons_monthly?: number | null;
  addons_months?: number | null;
  addons_count?: number | null;
  device_finance_total?: number | null;
  device_finance_months?: number | null;
  device_finance_monthly?: number | null;
  support_cash?: number | null;
  contract_type?: string | null;
  contract_months?: number | null;
  contract_extra_support?: boolean | null;
  addons_detail?: { name: string; fee: number; months: number; note?: string | null }[] | null;
  retention_line_months?: number | null;
  retention_plan_months?: number | null;
  retention_addons_months?: number | null;
  store?: string | null;
};

function tco(deal: Deal) {
  let total = 0;
  const parts: { label: string; cost: number }[] = [];
  const add = (label: string, cost: number) => {
    if (!cost || Number.isNaN(cost)) return;
    total += cost;
    parts.push({ label, cost });
  };
  add("기기비(현금/선납)", deal.upfront);
  if (deal.planHigh) add(`요금제 ${krw(deal.planHigh.fee)} × ${deal.planHigh.months}개월`, deal.planHigh.fee * deal.planHigh.months);
  if (deal.planAfter) add(`요금제 ${krw(deal.planAfter.fee)} × ${deal.planAfter.months}개월`, deal.planAfter.fee * deal.planAfter.months);
  if (deal.mvnoTail) add(`알뜰 ${krw(deal.mvnoTail.fee)} × ${deal.mvnoTail.months}개월`, deal.mvnoTail.fee * deal.mvnoTail.months);
  if (deal.addons) add(`부가 ${krw(deal.addons.monthly)} × ${deal.addons.months}개월`, deal.addons.monthly * deal.addons.months);
  if (deal.misc) add("유심/기타", deal.misc.sim);
  let monthly24 = Math.round(total / 24);
  if (deal.tco_monthly_24m != null) monthly24 = Number(deal.tco_monthly_24m);
  if (deal.tco_total != null) total = Number(deal.tco_total);
  let baseline: null | { label: string; value: number; delta: number } = null;
  if (deal.baselineUnlocked) {
    const b = deal.baselineUnlocked.devicePrice + deal.baselineUnlocked.mvnoFee * deal.baselineUnlocked.months;
    baseline = { label: `자급+알뜰 (${krw(deal.baselineUnlocked.devicePrice)} + ${krw(deal.baselineUnlocked.mvnoFee)}×${deal.baselineUnlocked.months})`, value: b, delta: total - b };
  }
  return { total, monthly24, parts, baseline };
}

// —— 표준화 블록 ——
function StandardizedBlock({ d }: { d: Deal }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="text-[13px] font-medium mb-2">표준화된 조건</div>
      <div className="grid grid-cols-1 gap-2 text-[13px]">
        <Line label="거래 유형" value={`${(d.moveType ?? (d as any).move_type) ?? "미정"} · ${(d.contract_type || d.contract) ?? "약정 미정"} · ${d.payment ?? "결제 미정"}`} />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">요금제 흐름</span>
            <span className="text-[11px] text-gray-400">원문 용어는 숨김</span>
          </div>
          <ul className="mt-1 text-gray-800 space-y-1">
            {d.planHigh && (<li>초기: {krw(d.planHigh.fee)} × {d.planHigh.months}개월</li>)}
            {d.planAfter && (<li>이후: {krw(d.planAfter.fee)} × {d.planAfter.months}개월</li>)}
            {d.mvnoTail && (<li>알뜰 꼬리구간: {krw(d.mvnoTail.fee)} × {d.mvnoTail.months}개월</li>)}
          </ul>
        </div>
        {d.addons && (<Line label="부가서비스" value={`${krw(d.addons.monthly)} × ${d.addons.months}개월${d.addons.label ? ` (${d.addons.label})` : ""}`} />)}
        <Line label="모델/용량" value={`${d.model} (${d.capacity ?? '용량 미상'})`} />
      </div>
    </div>
  );
}

// —— 집계 헤더(현재 카드 기준 7일 요약) ——
function AggregateHeader({ model, capacity, dailyRows }: { model?: string | null; capacity?: string | null; dailyRows?: any[] }) {
  const row = useMemo(() => {
    if (!model || !dailyRows || dailyRows.length === 0) return null;
    const cap = normalizeCapacityLabel(capacity ?? null);
    return dailyRows.find((r: any) => r.model === model && normalizeCapacityLabel(r.capacity) === cap) || null;
  }, [model, capacity, dailyRows]);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 mb-3">
      <div className="text-[12px] text-gray-500">현재 카드 · 7일 요약</div>
      {row ? (
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-[11px] text-gray-500">최저</div>
            <div className="text-lg font-bold">{krw(Number(row.min || 0))}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-[11px] text-gray-500">중앙값</div>
            <div className="text-lg font-bold">{krw(Number(row.median || 0))}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-[11px] text-gray-500">최고</div>
            <div className="text-lg font-bold">{krw(Number(row.max || 0))}</div>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-[12px] text-gray-500">해당 모델·용량의 7일 집계가 없습니다.</div>
      )}
    </div>
  );
}

// —— 모델 선택 유틸 ——
type Brand = 'GALAXY' | 'IPHONE' | 'OTHER';

function detectBrand(model: string): Brand {
  if (!model) return 'OTHER';
  if (model.startsWith('갤럭시')) return 'GALAXY';
  if (model.startsWith('아이폰')) return 'IPHONE';
  return 'OTHER';
}

function extractFamily(model: string): string {
  if (!model) return '';
  // iPhone: 아이폰 <number>
  const ip = model.match(/^아이폰\s*(\d+)/);
  if (ip) return `아이폰 ${ip[1]}`;
  // Galaxy S: 갤럭시 S<number>
  const gs = model.match(/^갤럭시\s*S\s*(\d+)/);
  if (gs) return `갤럭시 S${gs[1]}`;
  // Galaxy Z Fold/Flip: 갤럭시 Z 폴드 <n>, 갤럭시 Z 플립 <n>
  const gf = model.match(/^갤럭시\s*Z\s*폴드\s*(\d+)/);
  if (gf) return `갤럭시 Z 폴드 ${gf[1]}`;
  const gl = model.match(/^갤럭시\s*Z\s*플립\s*(\d+)/);
  if (gl) return `갤럭시 Z 플립 ${gl[1]}`;
  // Galaxy other with number: 갤럭시 <name> <n>
  const go = model.match(/^갤럭시\s*([^\d]+?)\s*(\d+)/);
  if (go) return `갤럭시 ${go[1].trim()} ${go[2]}`;
  // Fallback: strip trailing variant words
  return model.replace(/\s+(프로\s*맥스|프로|맥스|울트라|엣지|에어)$/,'');
}

function modelBelongsToFamily(model: string, family: string | null): boolean {
  if (!family) return true;
  return model.startsWith(family);
}

function normalizeCapacityLabel(cap: any): string {
  if (cap == null || cap === '' || cap === '미상') return '미상';
  return String(cap);
}

// —— Swipe Deck (모바일 스와이프 전환) ——
function SwipeDeck({ deals, onLike, onSkip, onNeedMore }: { deals: Deal[]; onLike: (d: Deal) => void; onSkip: (d: Deal) => void; onNeedMore?: () => void }) {
  const [stack, setStack] = useState(deals);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const lock = useRef<"x" | "y" | null>(null);
  const topEl = useRef<HTMLDivElement | null>(null);

  const MIN_ACTIVATE = 12; // px: 제스처 방향 판별 최소 이동량
  const top = stack[0];

  // 동기화: 상위 deals가 늘어나면 중복 없이 스택에 합치기
  useEffect(() => {
    setStack((prev) => {
      if (!prev.length) return deals;
      const ids = new Set(prev.map((d) => d.id));
      const toAdd = deals.filter((d) => !ids.has(d.id));
      return toAdd.length ? [...prev, ...toAdd] : prev;
    });
  }, [deals]);

  // 프리패치 트리거: 스택이 얕아지면 상위에 알리기
  useEffect(() => {
    if (onNeedMore && stack.length <= 3) onNeedMore();
  }, [stack.length, onNeedMore]);

  const handleStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    lock.current = null; // 아직 방향 미결정
    // 드래그 상태는 X로 잠긴 뒤에만 true로 변경 (오버레이가 스크롤에 반응하지 않도록)
    setDragging(false);
  };
  const handleMove = (e: React.TouchEvent) => {
    if (!start.current) return;
    const t = e.touches[0];
    const curX = t.clientX;
    const curY = t.clientY;
    const dxNow = curX - start.current.x;
    const dyNow = curY - start.current.y;

    // 방향 잠금이 정해지지 않았다면 판별
    if (!lock.current) {
      const dist = Math.hypot(dxNow, dyNow);
      if (dist < MIN_ACTIVATE) return; // 아직 의도 파악 전
      const ratio = Math.abs(dxNow) / (Math.abs(dyNow) + 1e-6);
      const angle = Math.abs(Math.atan2(dyNow, dxNow)) * (180 / Math.PI);
      // 좌우 모두 허용: 0° 부근 또는 180° 부근을 가로로 인정
      if (ratio > 2 && (angle < 20 || angle > 160)) {
        lock.current = "x";
        setDragging(true);
      } else {
        lock.current = "y"; // 세로 스크롤 의도
      }
    }

    if (lock.current === "x") {
      // 수평 스와이프 동작. 스크롤 방지를 위해 기본 동작 취소
      e.preventDefault();
      setDx(dxNow);
      setDy(dyNow);
    } else {
      // 세로 스크롤 의도: 스와이프 무시
      return;
    }
  };
  const handleEnd = () => {
    if (!start.current) return;
    // 카드 폭 기준 실행 임계치 계산 (기본 최소 72px)
    const w = topEl.current ? topEl.current.offsetWidth : 320;
    const execThreshold = Math.max(72, Math.floor(w * 0.35));
    const swipedRight = dx > execThreshold;
    const swipedLeft = dx < -execThreshold;
    if (lock.current === "x") {
      if (swipedRight && top) {
        onLike(top);
        setStack((prev) => prev.slice(1));
      } else if (swipedLeft && top) {
        onSkip(top);
        setStack((prev) => prev.slice(1));
      }
    }
    setDragging(false);
    setDx(0);
    setDy(0);
    start.current = null;
    lock.current = null;
  };

  if (!top) return (
    <div className="text-center text-gray-500 py-10 text-sm">표시할 카드가 없습니다. 내일 다시 확인해 보세요.</div>
  );

  return (
    <div className="relative">
      {/* Sizer: measure top card height so deck matches full content */}
      <div className="invisible pointer-events-none">
        <DealCard d={top} compact />
      </div>

      {/* Overlay actual swipe stack matching sizer height */}
      <div className="absolute inset-0">
      {stack.slice(0, 3).map((d, idx) => {
        const isTop = idx === 0;
        const offset = idx * 8; // stacked offset
        const rotate = isTop ? Math.max(Math.min(dx / 20, 10), -10) : 0;
        const style: React.CSSProperties = isTop
          ? { transform: `translate(${dx}px, ${dy}px) rotate(${rotate}deg)` }
          : {
              transform: `translateY(${offset}px) scale(${1 - idx * 0.03})`,
              filter: "blur(3px)",
              opacity: 0.85,
            };
        const w = isTop && topEl.current ? topEl.current.offsetWidth : 320;
        const thresholdUI = Math.max(72, Math.floor(w * 0.35));
        const opacityLike = isTop ? Math.min(Math.max((dx - thresholdUI) / 40, 0), 1) : 0;
        const opacitySkip = isTop ? Math.min(Math.max((-dx - thresholdUI) / 40, 0), 1) : 0;

        return (
          <div
            key={`${d.id}-${idx}`}
            ref={isTop ? topEl : undefined}
            className={`absolute inset-0 select-none ${isTop ? "z-20" : idx === 1 ? "z-10" : "z-0"}`}
            style={{ ...style, touchAction: isTop ? (lock.current === "x" ? "none" : "pan-y") : undefined }}
            onTouchStart={isTop ? handleStart : undefined}
            onTouchMove={isTop ? handleMove : undefined}
            onTouchEnd={isTop ? handleEnd : undefined}
          >
            <DealCard d={d} compact />

            {/* Overlays */}
            <div className="pointer-events-none absolute top-4 left-4">
              <div className={`rounded-lg px-2 py-1 text-xs font-bold border ${dragging ? "" : "opacity-0"} ${opacityLike > 0 ? "opacity-100" : "opacity-0"} border-emerald-500 text-emerald-700 bg-emerald-50`} style={{ opacity: opacityLike }}>
                관심등록
              </div>
            </div>
            <div className="pointer-events-none absolute top-4 right-4">
              <div className={`rounded-lg px-2 py-1 text-xs font-bold border ${dragging ? "" : "opacity-0"} ${opacitySkip > 0 ? "opacity-100" : "opacity-0"} border-rose-500 text-rose-700 bg-rose-50`} style={{ opacity: opacitySkip }}>
                숨기기
              </div>
            </div>
          </div>
        );
      })}

      {/* Action buttons */}
      <div className="absolute -bottom-2 left-0 right-0 flex items-center justify-center gap-6">
        <button className="h-12 w-12 rounded-full border flex items-center justify-center" onClick={() => top && (setDx(-200), setTimeout(() => { setDx(0); setDy(0); setDragging(false); setStack((p)=>p.slice(1)); onSkip(top); }, 120))}>
          <span className="text-sm">✖</span>
        </button>
        <button className="h-14 w-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow" onClick={() => top && (setDx(200), setTimeout(() => { setDx(0); setDy(0); setDragging(false); setStack((p)=>p.slice(1)); onLike(top); }, 120))}>
          <span className="text-base">★</span>
        </button>
      </div>
      </div>
    </div>
  );
}

// —— DealCard (기존 카드 + compact 모드) ——
function DealCard({ d, compact = false }: { d: Deal; compact?: boolean }) {
  const r = tco(d);
  const net = d.tco_net ?? (r.total - (d.support_cash ?? 0));
  const netMonthly = d.tco_net_monthly_24m ?? Math.floor(((d.tco_net ?? net) + 23) / 24);
  const tcoMonthly = d.tco_monthly_24m ?? r.monthly24;
  const nz = (v?: number | null) => (typeof v === 'number' ? v : 0);
  const plan1 = nz(d.plan_high_fee) * nz(d.plan_high_months);
  const plan2 = nz(d.plan_after_fee) * nz(d.plan_after_months);
  const tail = nz(d.mvno_tail_fee) * nz(d.mvno_tail_months);
  const addons = nz(d.addons_monthly) * nz(d.addons_months);
  const device = nz(d.device_finance_total);
  const tcoVal = nz(d.tco_total) || (nz(d.upfront) + plan1 + plan2 + tail + addons + device);
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm p-4 ${compact ? "h-full" : ""} break-words`}>
      {/* 헤더: 모델(용량) */}
      <h2 className="text-lg font-bold tracking-tight">{d.model} ({d.capacity ?? '용량 미상'})</h2>
      {/* 핵심 라인: 통신사 · 번호이동/기변 · 부가 개수 */}
      <div className="mt-0.5 text-[13px] text-gray-600">
        {formatCarrier(d.carrier)}{(d.moveType ?? (d as any).move_type) ? ` · ${(d.moveType ?? (d as any).move_type)}` : ''}{Number(d.addons_count || 0) > 0 ? ` · 부가 ${Number(d.addons_count)}개` : ''}
      </div>
      {/* 채널/매장/지역 + 원문 링크 */}
      <div className="text-[12px] text-gray-600">
        {d.channel ? `${formatChannel(d.channel)}` : ''}{d.store ? ` · ${d.store}` : ''}{d.city ? ` · ${d.city}` : ''}
        {(d.sourceUrl || (d as any).url) && (
          <a href={(d.sourceUrl || (d as any).url)!} target="_blank" rel="noreferrer" className="ml-2 underline text-blue-700">원문 보기</a>
        )}
      </div>

      {/* 2x2 금액 요약: 좌열 TCO/Net 월(24개월), 우열 총비용/순지출 총액 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-[12px] text-gray-600">TCO</div>
          <div className="text-base font-bold">{Number(tcoMonthly || 0).toLocaleString()}원/월 <span className="text-[11px] text-gray-500">(24개월)</span></div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-right">
          <div className="text-[12px] text-gray-600">총비용</div>
          <div className="text-base font-bold">{Number((d.tco_total ?? tcoVal) || 0).toLocaleString()}원</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-[12px] text-gray-600">Net</div>
          <div className="text-base font-bold">{Number(netMonthly || 0).toLocaleString()}원/월 <span className="text-[11px] text-gray-500">(24개월)</span></div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-right">
          <div className="text-[12px] text-gray-600">순지출</div>
          <div className="text-base font-bold">{Number(net || 0).toLocaleString()}원</div>
        </div>
      </div>

      {/* 조건 요약 */}
      {!compact && (
        <div className="mt-3 rounded-xl border border-slate-200 p-3">
          <div className="text-[13px] font-medium mb-2">조건</div>
          <ul className="text-[13px] text-gray-800 space-y-1">
            <li>
              계약: {d.contract || d.contract_type || '미정'}
              {typeof d.contract_support_amount === 'number' ? ` · 지원금 ${nz(d.contract_support_amount).toLocaleString()}원` : ''}
            </li>
            <li>결제: {d.payment ?? '미정'}{nz(d.upfront) ? ` · 일시금 ${nz(d.upfront).toLocaleString()}원` : ''}</li>
            {d.plan_high_fee && d.plan_high_months ? (
              <li>요금제 1구간: {nz(d.plan_high_fee).toLocaleString()}원 × {nz(d.plan_high_months)}개월 = {plan1.toLocaleString()}원</li>
            ) : null}
            {d.plan_after_fee && d.plan_after_months ? (
              <li>요금제 2구간: {nz(d.plan_after_fee).toLocaleString()}원 × {nz(d.plan_after_months)}개월 = {plan2.toLocaleString()}원</li>
            ) : null}
            {d.mvno_tail_fee && d.mvno_tail_months ? (
              <li>알뜰 꼬리구간: {nz(d.mvno_tail_fee).toLocaleString()}원 × {nz(d.mvno_tail_months)}개월 = {tail.toLocaleString()}원</li>
            ) : null}
            {d.addons_monthly && d.addons_months ? (
              <li>부가서비스: {nz(d.addons_monthly).toLocaleString()}원 × {nz(d.addons_months)}개월 = {addons.toLocaleString()}원</li>
            ) : null}
            {device ? (
              <li>단말(할부): {device.toLocaleString()}원{d.device_finance_monthly && d.device_finance_months ? ` (월 ${nz(d.device_finance_monthly).toLocaleString()}원 × ${nz(d.device_finance_months)}개월)` : ''}</li>
            ) : null}
            {typeof d.support_cash === 'number' && d.support_cash > 0 ? (
              <li>지원금: - {nz(d.support_cash).toLocaleString()}원 (수령)
              </li>
            ) : null}
          </ul>
        </div>
      )}

      {/* Breakdown (시트 느낌 테이블) */}
      <div className="mt-3">
        <div className="text-[13px] font-semibold mb-1">비용 구성 Breakdown</div>
        <table className="w-full text-[12px] border border-slate-200">
          <tbody>
            {nz(d.upfront) > 0 && (
              <tr className="border-t">
                <td className="py-1 px-2 text-gray-600">일시금</td>
                <td className="py-1 px-2 text-right">{nz(d.upfront).toLocaleString()}원</td>
              </tr>
            )}
            {plan1 > 0 && (
              <tr className="border-t" title={`요금제 1구간 ${nz(d.plan_high_fee).toLocaleString()}원 × ${nz(d.plan_high_months)}개월 = ${plan1.toLocaleString()}원`}>
                <td className="py-1 px-2 text-gray-600">요금제 1구간</td>
                <td className="py-1 px-2 text-right">{nz(d.plan_high_fee).toLocaleString()}원 × {nz(d.plan_high_months)}개월 = {plan1.toLocaleString()}원</td>
              </tr>
            )}
            {plan2 > 0 && (
              <tr className="border-t" title={`요금제 2구간 ${nz(d.plan_after_fee).toLocaleString()}원 × ${nz(d.plan_after_months)}개월 = ${plan2.toLocaleString()}원`}>
                <td className="py-1 px-2 text-gray-600">요금제 2구간</td>
                <td className="py-1 px-2 text-right">{nz(d.plan_after_fee).toLocaleString()}원 × {nz(d.plan_after_months)}개월 = {plan2.toLocaleString()}원</td>
              </tr>
            )}
            {tail > 0 && (
              <tr className="border-t" title={`알뜰 꼬리구간 ${nz(d.mvno_tail_fee).toLocaleString()}원 × ${nz(d.mvno_tail_months)}개월 = ${tail.toLocaleString()}원`}>
                <td className="py-1 px-2 text-gray-600">알뜰 꼬리구간</td>
                <td className="py-1 px-2 text-right">{nz(d.mvno_tail_fee).toLocaleString()}원 × {nz(d.mvno_tail_months)}개월 = {tail.toLocaleString()}원</td>
              </tr>
            )}
            {addons > 0 && (
              <tr className="border-t" title={`부가서비스 ${nz(d.addons_monthly).toLocaleString()}원 × ${nz(d.addons_months)}개월 = ${addons.toLocaleString()}원`}>
                <td className="py-1 px-2 text-gray-600">부가서비스 합계</td>
                <td className="py-1 px-2 text-right">{nz(d.addons_monthly).toLocaleString()}원 × {nz(d.addons_months)}개월 = {addons.toLocaleString()}원</td>
              </tr>
            )}
            {device > 0 && (
              <tr className="border-t">
                <td className="py-1 px-2 text-gray-600">단말(할부)</td>
                <td className="py-1 px-2 text-right">{device.toLocaleString()}원{d.device_finance_monthly && d.device_finance_months ? ` (월 ${nz(d.device_finance_monthly).toLocaleString()}원 × ${nz(d.device_finance_months)}개월)` : ''}</td>
              </tr>
            )}
            {typeof d.support_cash === 'number' && d.support_cash > 0 && (
              <tr className="border-t" title={`지원금(차비/캐시백 등) = ${nz(d.support_cash).toLocaleString()}원`}>
                <td className="py-1 px-2 text-gray-600">지원금</td>
                <td className="py-1 px-2 text-right">- {nz(d.support_cash).toLocaleString()}원</td>
              </tr>
            )}
            <tr className="border-t">
              <td className="py-1 px-2 font-semibold">총비용(TCO)</td>
              <td className="py-1 px-2 text-right font-semibold">{(d.tco_total ?? tcoVal).toLocaleString()}원</td>
            </tr>
            <tr>
              <td className="py-1 px-2 font-semibold">순지출(Net)</td>
              <td className="py-1 px-2 text-right font-semibold">{(net).toLocaleString()}원</td>
            </tr>
          </tbody>
        </table>

        {/* 부가서비스 상세 (이름/월/개월/합계) */}
        {Array.isArray(d.addons_detail) && d.addons_detail.length > 0 && (
          <div className="mt-2">
            <div className="text-[12px] text-gray-700 mb-1">부가서비스 상세</div>
            <table className="w-full text-[12px] border border-slate-200">
              <thead>
                <tr className="text-gray-600"><th className="text-left px-2 py-1">이름</th><th className="text-right px-2 py-1">월</th><th className="text-right px-2 py-1">개월</th><th className="text-right px-2 py-1">합계</th></tr>
              </thead>
              <tbody>
                {d.addons_detail.map((a, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">{a.name}</td>
                    <td className="px-2 py-1 text-right">{(typeof a.fee === 'number' ? a.fee : 0).toLocaleString()}원</td>
                    <td className="px-2 py-1 text-right">{(typeof a.months === 'number' ? a.months : 0)}</td>
                    <td className="px-2 py-1 text-right">{(((typeof a.fee === 'number' ? a.fee : 0) * (typeof a.months === 'number' ? a.months : 0))).toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 계산 경로(재무제표 스타일) */}
        <div className="mt-3">
          <div className="text-[12px] text-gray-700 mb-1">계산 경로</div>
          <table className="w-full text-[12px]">
            <tbody>
              {nz(d.upfront) > 0 && (<tr><td className="py-0.5">+ 일시금</td><td className="py-0.5 text-right">{nz(d.upfront).toLocaleString()}원</td></tr>)}
              {plan1 > 0 && (<tr><td className="py-0.5">+ 요금제 1구간</td><td className="py-0.5 text-right">{plan1.toLocaleString()}원</td></tr>)}
              {plan2 > 0 && (<tr><td className="py-0.5">+ 요금제 2구간</td><td className="py-0.5 text-right">{plan2.toLocaleString()}원</td></tr>)}
              {tail > 0 && (<tr><td className="py-0.5">+ 알뜰 꼬리구간</td><td className="py-0.5 text-right">{tail.toLocaleString()}원</td></tr>)}
              {addons > 0 && (<tr><td className="py-0.5">+ 부가서비스</td><td className="py-0.5 text-right">{addons.toLocaleString()}원</td></tr>)}
              {device > 0 && (<tr><td className="py-0.5">+ 단말(할부)</td><td className="py-0.5 text-right">{device.toLocaleString()}원</td></tr>)}
              <tr className="border-t"><td className="py-0.5 font-semibold">= 총비용(TCO)</td><td className="py-0.5 text-right font-semibold">{(d.tco_total ?? tcoVal).toLocaleString()}원</td></tr>
              {typeof d.support_cash === 'number' && d.support_cash > 0 && (
                <tr><td className="py-0.5">- 지원금</td><td className="py-0.5 text-right">{nz(d.support_cash).toLocaleString()}원</td></tr>
              )}
              <tr><td className="py-0.5 font-semibold">= 순지출(Net)</td><td className="py-0.5 text-right font-semibold">{net.toLocaleString()}원</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {d.flags && d.flags.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <div className="text-[13px] font-semibold text-amber-800">주의/가정</div>
          <ul className="mt-1 text-[12px] text-amber-800 list-disc pl-5 space-y-0.5">
            {d.flags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// —— Voice Chat (풀스크린 채팅 온보딩) ——
function VoiceChatFullScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([
    { role: "assistant", text: "휴대폰 조건을 알려주시면 규칙을 만들어 드릴게요. 예) ‘아이폰17, 월 1만원 절감 시 알림, 온라인만’" },
  ]);
  const [input, setInput] = useState("");
  const [tip, setTip] = useState("");
  const scroller = useRef<HTMLDivElement | null>(null);

  // Speech Recognition
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  useEffect(() => {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SR) {
      const recog = new SR();
      recog.lang = "ko-KR";
      recog.interimResults = true;
      recog.continuous = false;
      recog.onresult = (e: any) => {
        let t = "";
        for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
        setInput(t.trim());
      };
      recog.onend = () => setListening(false);
      recognitionRef.current = recog;
    }
  }, []);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages]);

  const startVoice = () => {
    if (recognitionRef.current) { setListening(true); recognitionRef.current.start(); }
  };
  const stopVoice = () => { if (recognitionRef.current) recognitionRef.current.stop(); };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    // Stub: 슬롯핑/규칙 초안 생성 응답
    setTimeout(() => {
      const reply = `요청 확인: ${text}
– 예시 규칙: 오늘 최저가 + 급락10% + 정밀매칭(선택약정/현완) 중 선택 가능. 전송 버튼을 누르면 규칙으로 저장할게요.`;
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    }, 400);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <header className="h-[56px] flex items-center justify-between px-4 border-b">
        <div className="font-semibold">설정 챗봇</div>
        <button className="text-sm" onClick={onClose}>닫기</button>
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`${m.role === "user" ? "bg-slate-900 text-white" : "bg-white"} max-w-[78%] rounded-2xl px-3 py-2 text-[14px] border ${m.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-3 bg-white">
        {tip && <div className="text-[11px] text-gray-500 mb-1">{tip}</div>}
        <div className="flex items-center gap-2">
          <button
            aria-label="음성 입력"
            className={`h-11 w-11 rounded-xl ${listening ? "bg-rose-600 text-white" : "bg-slate-900 text-white"}`}
            onClick={() => (listening ? stopVoice() : startVoice())}
          >🎤</button>
          <input
            className="flex-1 h-11 rounded-xl border px-3 text-[14px]"
            placeholder="말하거나 입력하세요…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setTip("음성이 더 편해요. 🎤 버튼을 탭해보세요.")}
            onBlur={() => setTip("")}
          />
          <button className="h-11 px-4 rounded-xl bg-slate-900 text-white" onClick={send}>전송</button>
        </div>
        <div className="text-[11px] text-gray-500 mt-1">* 브라우저가 음성 인식을 지원하지 않으면 키보드 입력으로 진행합니다.</div>
      </div>
    </div>
  );
}

// —— Floating Mic (물방울 버튼, 상시 표시) ——
function FloatingMic({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center"
      aria-label="음성 채팅 열기"
    >
      🎤
    </button>
  );
}

// —— Alerts 모드 토글 ——
function AlertModeToggles() {
  const [strict, setStrict] = useState(true);
  const [cheapest, setCheapest] = useState(true);
  const [bigDrop, setBigDrop] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 mb-3">
      <div className="text-[12px] text-gray-500 mb-2">알림 모드</div>
      <div className="flex items-center gap-2">
        <Toggle checked={strict} onChange={setStrict} label="정밀 매칭" />
        <Toggle checked={cheapest} onChange={setCheapest} label="오늘 최저가" />
        <Toggle checked={bigDrop} onChange={setBigDrop} label="급락" />
      </div>
    </div>
  );
}
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!checked)} className={`px-3 py-2 rounded-xl text-[13px] border ${checked ? "bg-slate-900 text-white border-slate-900" : "bg-white"}`}>{label}</button>
  );
}

// —— Alerts 화면 ——
function AlertsScreen({ userId }: { userId: string }) {
  const [rules, setRules] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState("CHEAPEST");
  const [newFrequency, setNewFrequency] = useState("immediate");
  const [newCooldown, setNewCooldown] = useState<number>(3);
  const [newEnabled, setNewEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (!userId) return;
    let aborted = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await apiGetRules(userId);
        if (!aborted) setRules(Array.isArray(list) ? list : []);
      } catch (e: any) {
        if (!aborted) { setRules([]); setError("규칙을 불러오지 못했습니다."); }
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    run();
    return () => { aborted = true; };
  }, [userId]);

  const refresh = async () => {
    try {
      const list = await apiGetRules(userId);
      setRules(Array.isArray(list) ? list : []);
    } catch (e) {
      // ignore
    }
  };

  const createRule = async () => {
    setCreating(true);
    setError(null);
    try {
      await apiPostRule(userId, {
        type: newType,
        frequency: newFrequency,
        cooldown_hours: newCooldown,
        enabled: newEnabled,
        constraints: {},
        thresholds: {},
        filters: {},
      });
      await refresh();
    } catch (e: any) {
      setError("규칙 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const toggleRule = async (r: any) => {
    try {
      await apiPostRule(userId, { id: r.id, enabled: !r.enabled });
      await refresh();
    } catch (e) {
      setError("규칙 업데이트에 실패했습니다.");
    }
  };

  const removeRule = async (r: any) => {
    try {
      await apiDeleteRule(userId, Number(r.id));
      await refresh();
    } catch (e) {
      setError("규칙 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border p-3 bg-white">
        <div className="text-sm font-semibold mb-1">알림 규칙</div>
        {loading && <div className="text-[12px] text-gray-500">불러오는 중…</div>}
        {error && <div className="text-[12px] text-rose-600">{error}</div>}
        {/* 생성 폼 */}
        <div className="mb-3 flex flex-wrap items-end gap-2 text-[13px]">
          <div>
            <div className="text-[11px] text-gray-500 mb-1">유형</div>
            <select value={newType} onChange={(e) => setNewType(e.target.value)} className="h-9 border rounded-lg px-2">
              <option value="CHEAPEST">CHEAPEST</option>
              <option value="STRICT_MATCH">STRICT_MATCH</option>
              <option value="BIG_DROP">BIG_DROP</option>
            </select>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 mb-1">빈도</div>
            <select value={newFrequency} onChange={(e) => setNewFrequency(e.target.value)} className="h-9 border rounded-lg px-2">
              <option value="immediate">immediate</option>
              <option value="daily">daily</option>
            </select>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 mb-1">쿨다운(시간)</div>
            <input type="number" min={0} value={newCooldown} onChange={(e) => setNewCooldown(Number(e.target.value))} className="h-9 w-20 border rounded-lg px-2" />
          </div>
          <label className="inline-flex items-center gap-1 h-9">
            <input type="checkbox" checked={newEnabled} onChange={(e) => setNewEnabled(e.target.checked)} />
            <span>활성</span>
          </label>
          <button disabled={creating} onClick={createRule} className="h-9 px-3 rounded-lg bg-slate-900 text-white disabled:opacity-60">규칙 추가</button>
        </div>
        {rules !== null && (
          rules.length > 0 ? (
            <ul className="space-y-2">
              {rules.map((r) => (
                <li key={r.id} className="rounded-lg border p-2 flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <Badge label={r.type} />
                    <span className="text-gray-600">{r.frequency}</span>
                    <span className="text-gray-400 text-[12px]">cooldown {r.cooldown_hours ?? 0}h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleRule(r)} className={`px-2 py-1 rounded border text-[12px] ${r.enabled ? "bg-emerald-600 text-white border-emerald-600" : ""}`}>{r.enabled ? "ON" : "OFF"}</button>
                    <button onClick={() => removeRule(r)} className="px-2 py-1 rounded border text-[12px]">삭제</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[12px] text-gray-500">등록된 규칙이 없습니다.</div>
          )
        )}
        <div className="mt-2 text-[12px] text-gray-500">* 규칙 추가/토글/삭제가 서버와 동기화됩니다.</div>
      </div>

      <div className="rounded-2xl border p-3 bg-white">
        <div className="text-sm font-semibold mb-2">임계치</div>
        <div className="grid grid-cols-2 gap-2 text-[13px]">
          <Line label="월 절감 최소" value="10,000원" />
          <Line label="급락 임계치" value="10%" />
        </div>
      </div>

      <div className="rounded-2xl border p-3 bg-white">
        <div className="text-sm font-semibold mb-2">알림 빈도</div>
        <div className="flex items-center gap-2 text-[13px]">
          <button className="px-3 py-2 rounded-xl border bg-slate-900 text-white">즉시</button>
          <button className="px-3 py-2 rounded-xl border">데일리 요약</button>
        </div>
      </div>
    </div>
  );
}

// —— Settings 화면 ——
function SettingsScreen({ userId, onOpenChat, onInstallPrompt }: { userId: string; onOpenChat: () => void; onInstallPrompt: () => void }) {
  const [pushStatus, setPushStatus] = useState<NotificationPermission | "unsupported">("default");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string>("");
  const [currentPlanFee, setCurrentPlanFee] = useState<string>("25000");
  const [addonsMonthly, setAddonsMonthly] = useState<string>("0");
  const [mvnoFlag, setMvnoFlag] = useState<boolean>(true);
  const [channelPref, setChannelPref] = useState<string>("온라인만");
  const [city, setCity] = useState<string>("");

  const requestPush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushStatus("unsupported");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setPushStatus(perm);
    } catch {
      setPushStatus("unsupported");
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const payload = {
        current_plan_fee: currentPlanFee ? Number(currentPlanFee) : null,
        addons_monthly: addonsMonthly ? Number(addonsMonthly) : null,
        mvno_flag: mvnoFlag,
        channel_pref: channelPref || null,
        city: city || null,
      };
      await apiSaveProfile(userId || "dev", payload);
      setSaveMsg("저장되었습니다.");
      setEditing(false);
    } catch (e) {
      setSaveMsg("저장에 실패했습니다.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 1500);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border p-3 bg-white">
        <div className="text-sm font-semibold mb-2">내 프로필</div>
        {!editing ? (
          <>
            <div className="grid grid-cols-1 gap-2 text-[13px]">
              <Line label="현재 요금" value={`${Number(currentPlanFee).toLocaleString()}원 ${mvnoFlag ? "(MVNO)" : ""}`} />
              <Line label="부가서비스" value={`${Number(addonsMonthly).toLocaleString()}원`} />
              <Line label="채널 선호" value={channelPref || "-"} />
              <Line label="지역" value={city || "-"} />
            </div>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setEditing(true)}>프로필 수정</button>
              <button className="px-3 py-2 rounded-xl bg-slate-900 text-white" onClick={onOpenChat}>음성으로 설정</button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500">현재 요금(원)</span>
                <input className="h-10 border rounded-lg px-2" value={currentPlanFee} onChange={(e) => setCurrentPlanFee(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500">부가(원)</span>
                <input className="h-10 border rounded-lg px-2" value={addonsMonthly} onChange={(e) => setAddonsMonthly(e.target.value)} />
              </label>
              <label className="flex items-center gap-2 col-span-2">
                <input type="checkbox" checked={mvnoFlag} onChange={(e) => setMvnoFlag(e.target.checked)} />
                <span>알뜰(MVNO) 사용</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500">채널 선호</span>
                <input className="h-10 border rounded-lg px-2" value={channelPref} onChange={(e) => setChannelPref(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500">지역</span>
                <input className="h-10 border rounded-lg px-2" value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
            </div>
            <div className="mt-3 flex gap-2 items-center">
              <button disabled={saving} className="px-3 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-60" onClick={saveProfile}>저장</button>
              <button className="px-3 py-2 rounded-xl border" onClick={() => setEditing(false)}>취소</button>
              {saveMsg && <span className="text-[12px] text-gray-600">{saveMsg}</span>}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border p-3 bg-white">
        <div className="text-sm font-semibold mb-2">PWA & 푸시</div>
        <ul className="text-[13px] list-disc pl-5 space-y-1 text-gray-700">
          <li><button className="underline" onClick={onInstallPrompt}>홈 화면에 추가(설치)</button></li>
          <li>
            <button className="underline" onClick={requestPush}>푸시 권한 요청</button>
            <span className="ml-2 text-gray-500 text-[12px]">{pushStatus === "default" ? "대기" : pushStatus === "unsupported" ? "미지원" : pushStatus}</span>
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border p-3 bg-white">
        <div className="text-sm font-semibold mb-2">정보</div>
        <div className="text-[12px] text-gray-600">버전: MVP 프리뷰 · 데이터 출처: 뽐뿌(phone)</div>
      </div>
    </div>
  );
}

// —— Bottom Nav ——
function BottomNav({ active, onChange, onOpenChat }: { active: "home" | "deal" | "alerts" | "settings"; onChange: (t: "home" | "deal" | "alerts" | "settings") => void; onOpenChat: () => void }) {
  const Item = ({ t, icon, label }: { t: "home" | "deal" | "alerts" | "settings"; icon: string; label: string }) => (
    <button
      onClick={() => onChange(t)}
      className={`flex flex-col items-center gap-0.5 text-[12px] text-slate-900 ${active === t ? "font-semibold" : "font-normal"}`}
      aria-current={active === t ? "page" : undefined}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-[64px] flex items-center justify-around z-30 pb-[env(safe-area-inset-bottom)]">
      <Item t="home" icon="🏠" label="홈" />
      <Item t="deal" icon="💸" label="딜" />
      <Item t="alerts" icon="🔔" label="알림" />
      <button
        onClick={() => { onChange("settings"); onOpenChat(); }}
        className={`flex flex-col items-center gap-0.5 text-[12px] text-slate-900 ${active === "settings" ? "font-semibold" : "font-normal"}`}
        aria-current={active === "settings" ? "page" : undefined}
      >
        <span className="text-lg">⚙️</span>
        <span>설정</span>
      </button>
    </nav>
  );
}

// —— Price Trend Chart (SVG, median line + p25–p75 band) ——
function PriceTrendChart({ rows }: { rows: { model: string; capacity?: string | null; ts: string; min: number; p25?: number; median: number; p75?: number; max: number; avg?: number; n: number }[] }) {
  const width = 560, height = 200, pad = 28;
  // group by capacity
  const seriesMap = new Map<string, { ts: string; min: number; p25?: number; median: number; p75?: number; max: number; n: number }[]>();
  const dateSet = new Set<string>();
  rows.forEach((r) => { dateSet.add(r.ts); });
  const dates = Array.from(dateSet).sort();
  rows.forEach((r) => {
    const key = (r.capacity ?? '__NULL__');
    if (!seriesMap.has(key)) seriesMap.set(key, []);
    seriesMap.get(key)!.push(r as any);
  });
  // normalize per capacity: ensure sorted by date and fill missing with undefined
  const series = Array.from(seriesMap.entries()).map(([cap, arr]) => {
    const byDate: Record<string, any> = {};
    arr.forEach((r) => { byDate[r.ts] = r; });
    const list = dates.map((d) => byDate[d] || { ts: d, capacity: cap === '__NULL__' ? null : cap, median: NaN, min: NaN, max: NaN, p25: NaN, p75: NaN, n: 0 });
    return { capacity: cap, data: list };
  });
  const allVals = rows.flatMap((r) => [r.min, r.max, r.median, r.p25 ?? r.median, r.p75 ?? r.median]).filter((x) => typeof x === 'number' && !Number.isNaN(x)) as number[];
  const yMin = Math.min(...allVals);
  const yMax = Math.max(...allVals);
  const sx = (i: number) => pad + (i * (width - pad * 2)) / Math.max(1, dates.length - 1);
  const sy = (v: number) => height - pad - ((v - yMin) * (height - pad * 2)) / Math.max(1, (yMax - yMin) || 1);
  const colors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px]">
        {/* axes */}
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e5e7eb" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#e5e7eb" />
        {/* y-axis labels (min/mid/max) */}
        {([yMin, (yMin + yMax) / 2, yMax] as number[]).map((v, idx) => (
          <g key={idx}>
            <line x1={pad - 4} x2={width - pad} y1={sy(v)} y2={sy(v)} stroke="#f1f5f9" />
          <text x={4} y={sy(v) - 2} fontSize="10" fill="#64748b">{Math.round(v).toLocaleString()}원</text>
          </g>
        ))}
        {/* x ticks */}
        {dates.map((d, i) => (
          <text key={d} x={sx(i)} y={height - pad + 12} fontSize="10" fill="#64748b" textAnchor="middle">{d.slice(5)}</text>
        ))}
        {/* series */}
        {series.map((s, si) => {
          const color = colors[si % colors.length];
          // median line path
          const mPath = s.data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(p.median)}`).join(' ');
          // p25-p75 band
          const top = s.data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(p.p75 ?? p.median)}`).join(' ');
          const bottom = s.data.slice().reverse().map((p, ri) => `L ${sx(s.data.length - 1 - ri)} ${sy(p.p25 ?? p.median)}`).join(' ');
          const band = `${top} ${bottom} Z`;
          // min/max thin lines
          const minPath = s.data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(p.min)}`).join(' ');
          const maxPath = s.data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(p.max)}`).join(' ');
          return (
            <g key={s.capacity}>
              <path d={band} fill={color} opacity={0.12} />
              <path d={minPath} stroke={color} strokeWidth={0.8} opacity={0.25} fill="none" />
              <path d={maxPath} stroke={color} strokeWidth={0.8} opacity={0.25} fill="none" />
              <path d={mPath} stroke={color} strokeWidth={2} fill="none" />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
        {Array.from(seriesMap.keys()).map((cap, i) => (
          <span key={cap} className="inline-flex items-center gap-1 text-gray-700">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
            {cap === '__NULL__' ? '용량 미상' : cap}
          </span>
        ))}
      </div>
    </div>
  );
}

// —— 샘플 데이터 ——
// 기본 샘플 데이터 (API 실패 시 폴백)
const sample: Deal[] = [
  {
    id: "A",
    model: "Galaxy Z Fold7",
    capacity: "256GB",
    carrier: "SKT",
    moveType: "번호이동",
    contract: null,
    payment: "현금완납",
    summary_raw: "현완 97 / 번이 / 10.5요금제 M+6 → 이후 6만원 18개월(가정)",
    upfront: 970000,
    planHigh: { fee: 109000, months: 6 },
    planAfter: { fee: 60000, months: 18 },
    addons: null,
    mvnoTail: null,
    misc: { sim: 0 },
    baselineUnlocked: { devicePrice: 2100000, mvnoFee: 25000, months: 24 },
    flags: ["조건 일부 추정", "좌표 필요 가능성", "댓글 근거 기반 계산"],
    badges: [
      { label: "SKT", tone: "brand" },
      { label: "번호이동" },
      { label: "현금완납" },
      { label: "주의: 조건누락", tone: "warn" },
    ],
    slang: ["번이", "현완", "10.5요금제", "M+6"],
    tco_total: 0,
    tco_monthly_24m: 0,
    tco_net: 0,
    tco_net_monthly_24m: 0,
  },
  {
    id: "B",
    model: "Galaxy Z Fold7",
    capacity: "512GB",
    carrier: "SKT",
    moveType: "번호이동",
    contract: "선택약정",
    payment: "현금완납",
    summary_raw: "선약 / 현완 185 / 109욕 M+3 · 라인유지 M+6 / 부가 다수(가정)",
    upfront: 1850000,
    planHigh: { fee: 109000, months: 3 },
    planAfter: { fee: 60000, months: 3 },
    mvnoTail: { fee: 25000, months: 18 },
    addons: { monthly: 15000, months: 3, label: "부가 3개×5천 가정" },
    misc: { sim: 0 },
    baselineUnlocked: { devicePrice: 2100000, mvnoFee: 25000, months: 24 },
    flags: ["용량 상이(512)", "부가/라인 유지 조건 상이"],
    badges: [
      { label: "SKT", tone: "brand" },
      { label: "번호이동" },
      { label: "선택약정" },
      { label: "현금완납" },
      { label: "주의: 추정 포함", tone: "warn" },
    ],
    slang: ["선약", "현완", "109욕", "M+3", "M+6"],
  },
];

export default function HomeClient({ initialDeals }: { initialDeals: Deal[] }) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
  const API_DEALS_PATH = process.env.NEXT_PUBLIC_DEALS_PATH || "/deals"; // 유지(백호환)

  const [liked, setLiked] = useState<Deal[]>([]);
  const [skipped, setSkipped] = useState<Deal[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [tab, setTab] = useState<"home" | "deal" | "alerts" | "settings">("home");
  const [deals, setDeals] = useState<Deal[] | null>(Array.isArray(initialDeals) && initialDeals.length ? initialDeals : null);
  const [offset, setOffset] = useState<number>(0);
  const pageSize = 30;
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [usingSample, setUsingSample] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [daily, setDaily] = useState<{ ts: string; rows: { model: string; capacity: string; ts: string; min: number; p25?: number; median: number; p75?: number; max: number; avg?: number; n: number }[] } | null>(null);
  const [trend, setTrend] = useState<{ rows: any[]; model: string } | null>(null);
  // 선택 상태(브랜드 → 라인업 → 용량)
  const [selectedBrand, setSelectedBrand] = useState<Brand>('GALAXY');
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedCapacity, setSelectedCapacity] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'latest' | 'net_asc' | 'tco_asc'>('latest');

  // Install prompt (PWA)
  const deferredPrompt = useRef<any>(null);
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      deferredPrompt.current = e;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const handleInstall = async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
    } else {
      alert("설치 가능 상태가 아닙니다. 홈 화면에 추가를 지원하지 않는 환경일 수 있어요.");
    }
  };

  const handleLike = (d: Deal) => setLiked((p) => [...p, d]);
  const handleSkip = (d: Deal) => setSkipped((p) => [...p, d]);

  // API 결과 -> Deal 매핑
  const mapFromApi = useCallback((x: any): Deal => {
    const id = x.id || `${x.model || ""}-${x.parsed_at || ""}-${x.url || Math.random().toString(36).slice(2)}`;
    const planHigh = x.plan_high_fee && x.plan_high_months ? { fee: Number(x.plan_high_fee), months: Number(x.plan_high_months) } : null;
    const planAfter = x.plan_after_fee && x.plan_after_months ? { fee: Number(x.plan_after_fee), months: Number(x.plan_after_months) } : null;
    const mvnoTail = x.mvno_tail_fee && x.mvno_tail_months ? { fee: Number(x.mvno_tail_fee), months: Number(x.mvno_tail_months) } : null;
    const addons = x.addons_monthly && x.addons_months ? { monthly: Number(x.addons_monthly), months: Number(x.addons_months) } : null;
    const badges: { label: string; tone?: any }[] = [];
    if (x.carrier) badges.push({ label: x.carrier, tone: x.carrier === "SKT" ? "brand" : undefined });
    if (x.move_type) badges.push({ label: x.move_type });
    if (x.contract) badges.push({ label: x.contract });
    if (x.payment) badges.push({ label: x.payment });
    if (x.city) badges.push({ label: x.city });
    if (x.channel) badges.push({ label: x.channel });
    return {
      id,
      model: x.model,
      capacity: x.capacity ?? null,
      carrier: x.carrier || "미상",
      parsedAt: x.parsed_at || null,
      channel: x.channel || null,
      moveType: x.move_type || undefined,
      contract: x.contract || null,
      contract_support_amount: x.contract_support_amount != null ? Number(x.contract_support_amount) : null,
      payment: x.payment || null,
      summary_raw: x.summary_raw || "",
      city: x.city || null,
      upfront: Number(x.upfront || 0),
      planHigh,
      planAfter,
      mvnoTail,
      addons,
      misc: x.misc ? { sim: Number(x.misc.sim || 0) } : undefined,
      baselineUnlocked: null,
      flags: Array.isArray(x.flags) ? x.flags : undefined,
      badges,
      sourceUrl: x.url,
      slang: Array.isArray(x.slang) ? x.slang : undefined,
      tco_total: x.tco_total != null ? Number(x.tco_total) : null,
      tco_monthly_24m: x.tco_monthly_24m != null ? Number(x.tco_monthly_24m) : null,
      tco_net: x.tco_net != null ? Number(x.tco_net) : null,
      tco_net_monthly_24m: x.tco_net_monthly_24m != null ? Number(x.tco_net_monthly_24m) : null,
      plan_high_fee: x.plan_high_fee != null ? Number(x.plan_high_fee) : null,
      plan_high_months: x.plan_high_months != null ? Number(x.plan_high_months) : null,
      plan_after_fee: x.plan_after_fee != null ? Number(x.plan_after_fee) : null,
      plan_after_months: x.plan_after_months != null ? Number(x.plan_after_months) : null,
      mvno_tail_fee: x.mvno_tail_fee != null ? Number(x.mvno_tail_fee) : null,
      mvno_tail_months: x.mvno_tail_months != null ? Number(x.mvno_tail_months) : null,
      addons_monthly: x.addons_monthly != null ? Number(x.addons_monthly) : null,
      addons_months: x.addons_months != null ? Number(x.addons_months) : null,
      addons_count: x.addons_count != null ? Number(x.addons_count) : null,
      device_finance_total: x.device_finance_total != null ? Number(x.device_finance_total) : null,
      device_finance_months: x.device_finance_months != null ? Number(x.device_finance_months) : null,
      device_finance_monthly: x.device_finance_monthly != null ? Number(x.device_finance_monthly) : null,
      support_cash: x.support_cash != null ? Number(x.support_cash) : (x.cash_delta != null && Number(x.cash_delta) < 0 ? Math.abs(Number(x.cash_delta)) : null),
      contract_type: x.contract_type || null,
      contract_months: x.contract_months != null ? Number(x.contract_months) : null,
      contract_extra_support: Boolean(x.contract_extra_support ?? false),
      addons_detail: Array.isArray(x.addons_detail) ? x.addons_detail : null,
      retention_line_months: x.retention_line_months != null ? Number(x.retention_line_months) : null,
      retention_plan_months: x.retention_plan_months != null ? Number(x.retention_plan_months) : null,
      retention_addons_months: x.retention_addons_months != null ? Number(x.retention_addons_months) : null,
      store: x.store || null,
    };
  }, []);

  // 페이지네이션으로 더 불러오기
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || tab !== 'deal') return;
    setLoadingMore(true);
    setUsingSample(false);
    try {
      let data: any[] | null = null;
      try {
        data = await apiGetDeals({ limit: pageSize, offset });
      } catch {
        const res = await fetch(`${API_BASE}${API_DEALS_PATH}?limit=${pageSize}&offset=${offset}`, { cache: "no-store" });
        if (res.ok) data = await res.json();
      }
      if (Array.isArray(data)) {
        const mapped = data.map(mapFromApi);
        setDeals((prev) => {
          const ex = new Set((prev ?? []).map((d) => d.id));
          return [...(prev ?? []), ...mapped.filter((d) => !ex.has(d.id))];
        });
        setOffset((o) => o + data!.length);
        if (data.length < pageSize) setHasMore(false);
      } else if (!deals || deals.length === 0) {
        setUsingSample(true);
        setHasMore(false);
      }
    } catch {
      if (!deals || deals.length === 0) setUsingSample(true);
    } finally {
      setLoadingMore(false);
    }
  }, [API_BASE, API_DEALS_PATH, deals, hasMore, loadingMore, mapFromApi, offset, pageSize, tab]);

  // userId bootstrap (localStorage)
  useEffect(() => {
    try {
      const key = "ssf_user_id";
      let id = localStorage.getItem(key);
      if (!id) {
        id = `u_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        localStorage.setItem(key, id);
      }
      setUserId(id);
    } catch {
      setUserId("dev");
    }
  }, []);

  // 실제 API에서 피드 불러오기 (Deal 탭에서만, 페이지네이션)
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      if (tab !== 'deal') return;
      setLoading(true);
      try {
        if (!deals || deals.length === 0) {
          setOffset(0);
          setHasMore(true);
          await loadMore();
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    run();
    return () => { aborted = true; };
  }, [tab, loadMore]);

  // 주간 요약(최신) 불러오기 및 정렬
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const rows = await getDailyReportsLatest();
        if (!Array.isArray(rows) || rows.length === 0) return;
        const sorted = [...rows].sort((a: any, b: any) => (Number(a.median || 0) - Number(b.median || 0)));
        const ts = sorted[0]?.ts || "";
        if (!aborted) setDaily({ ts, rows: sorted });
      } catch {}
    })();
    return () => { aborted = true; };
  }, []);

  // 파생: 브랜드별 라인업, 라인업별 용량 목록
  const familiesByBrand = React.useMemo(() => {
    const map: Record<Brand, string[]> = { GALAXY: [], IPHONE: [], OTHER: [] };
    (daily?.rows || []).forEach((r: any) => {
      const brand = detectBrand(r.model);
      const fam = extractFamily(r.model);
      if (!map[brand].includes(fam)) map[brand].push(fam);
    });
    // sort by natural order
    (Object.keys(map) as Brand[]).forEach((k) => { map[k] = map[k].sort(); });
    return map;
  }, [daily]);

  const capacitiesForFamily = React.useMemo(() => {
    const out: string[] = [];
    if (!daily?.rows || !selectedFamily) return out;
    daily.rows.forEach((r: any) => {
      if (!modelBelongsToFamily(r.model, selectedFamily)) return;
      const cap = normalizeCapacityLabel((r as any).capacity);
      if (!out.includes(cap)) out.push(cap);
    });
    return out.sort();
  }, [daily, selectedFamily]);

  // 초기/영속 선택값 로드 및 유효성 보정
  useEffect(() => {
    try {
      const sb = (localStorage.getItem('ssf_sel_brand') as Brand | null) || null;
      const sf = localStorage.getItem('ssf_sel_family');
      const sc = localStorage.getItem('ssf_sel_capacity');
      if (sb) setSelectedBrand(sb);
      if (sf) setSelectedFamily(sf);
      if (sc) setSelectedCapacity(sc);
    } catch {}
  }, []);

  useEffect(() => {
    // 보정: 현재 데이터에 없는 선택값이면 재설정
    const list = familiesByBrand[selectedBrand] || [];
    if (!selectedFamily || !list.includes(selectedFamily)) {
      setSelectedFamily(list[0] || null);
      setSelectedCapacity(null);
    }
  }, [familiesByBrand, selectedBrand]);

  useEffect(() => {
    // 용량 선택 보정
    if (!selectedFamily) return;
    if (selectedCapacity && !capacitiesForFamily.includes(selectedCapacity)) {
      setSelectedCapacity(null);
    }
  }, [selectedFamily, capacitiesForFamily]);

  // 선택값 저장
  useEffect(() => {
    try {
      localStorage.setItem('ssf_sel_brand', selectedBrand);
      if (selectedFamily) localStorage.setItem('ssf_sel_family', selectedFamily);
      if (selectedCapacity != null) localStorage.setItem('ssf_sel_capacity', selectedCapacity);
    } catch {}
  }, [selectedBrand, selectedFamily, selectedCapacity]);

  // 시세 추이 수집(최근 14일, 현재 피드의 첫 모델 기준)
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const family = selectedFamily;
        if (!family) return;
        const days = 14;
        const dates: string[] = [];
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          dates.push(d.toISOString().slice(0, 10));
        }
        const map = await getDailyReportsRange(dates);
        const rows: any[] = [];
        for (const [date, arr] of Object.entries(map)) {
          (arr || []).forEach((r: any) => {
            if (!modelBelongsToFamily(r.model, family)) return;
            if (selectedCapacity != null && normalizeCapacityLabel(r.capacity) !== selectedCapacity) return;
            rows.push({ ...r, ts: date });
          });
        }
        if (!aborted) setTrend({ rows, model: family });
      } catch {}
    })();
    return () => { aborted = true; };
  }, [selectedFamily, selectedCapacity]);

  // 정렬(클라이언트)
  const sortedFeed = React.useMemo(() => {
    if (!deals) return [] as Deal[];
    const arr = [...deals];
    if (sortKey === 'net_asc') {
      return arr.sort((a, b) => ((a.tco_net ?? ((a.tco_total ?? 0) - (a.support_cash ?? 0))) - (b.tco_net ?? ((b.tco_total ?? 0) - (b.support_cash ?? 0)))));
    } else if (sortKey === 'tco_asc') {
      return arr.sort((a, b) => ((a.tco_total ?? 0) - (b.tco_total ?? 0)));
    }
    return arr;
  }, [deals, sortKey]);

  const feed = deals ?? (usingSample ? sample : []);
  const likedSet = new Set(liked.map((d) => d.id));
  const skippedSet = new Set(skipped.map((d) => d.id));
  const remaining = feed.filter((d) => !likedSet.has(d.id) && !skippedSet.has(d.id));
  const sortedRemaining = React.useMemo(() => {
    const arr = [...remaining];
    if (sortKey === 'net_asc') arr.sort((a, b) => (a.tco_net ?? 0) - (b.tco_net ?? 0));
    else if (sortKey === 'tco_asc') arr.sort((a, b) => (a.tco_total ?? 0) - (b.tco_total ?? 0));
    else arr.sort((a, b) => new Date(b.parsedAt || 0).getTime() - new Date(a.parsedAt || 0).getTime());
    return arr;
  }, [remaining, sortKey]);
  const currentTop = sortedRemaining[0] || null;

  // 현재 선택 조합에 해당하는 최신 스냅샷 날짜 라벨
  const latestSnapshotLabel = React.useMemo(() => {
    const all = (daily?.rows || []).filter((r: any) => {
      const brandOk = detectBrand(r.model) === selectedBrand || (selectedBrand === 'OTHER' && !(['GALAXY','IPHONE'] as Brand[]).includes(detectBrand(r.model)));
      const familyOk = modelBelongsToFamily(r.model, selectedFamily);
      const capOk = selectedCapacity == null || normalizeCapacityLabel(r.capacity) === selectedCapacity;
      return brandOk && familyOk && capOk;
    });
    const tsSet = new Set(all.map((r: any) => r.ts));
    if (tsSet.size === 1) return [...tsSet][0];
    if (tsSet.size > 1) return '여러 날짜';
    return null;
  }, [daily, selectedBrand, selectedFamily, selectedCapacity]);

  return (
    <div className="min-h-screen w-full bg-white pb-[80px]">
      <div className="mx-auto max-w-md p-4">
        <header className="mb-3">
          <h1 className="text-xl font-bold tracking-tight">
            {tab === "home" && "MVP – 홈"}
            {tab === "deal" && "딜 피드"}
            {tab === "alerts" && "알림 설정"}
            {tab === "settings" && "설정"}
          </h1>
          {tab === "home" && (
            <p className="text-gray-500 mt-1 text-[13px]">
              집계 요약 · 모델/용량 선택 · 시세 추이
              {loading && <span className="ml-2 text-gray-400">불러오는 중…</span>}
              {!loading && usingSample && <span className="ml-2 text-amber-600">오프라인 모드(샘플 표시)</span>}
              {!loading && !usingSample && <span className="ml-2 text-emerald-700">실시간 데이터</span>}
            </p>
          )}
        </header>

        {tab === "home" && (
          <>
            {/* 모델 선택 (브랜드 → 라인업 → 용량) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 mb-3">
              <div className="text-sm font-semibold mb-2">모델 선택</div>
              <div className="flex gap-2 mb-2">
                {([
                  { key: 'GALAXY', label: '갤럭시' },
                  { key: 'IPHONE', label: '아이폰' },
                  { key: 'OTHER', label: '기타' },
                ] as { key: Brand; label: string }[]).map((b) => (
                  <button
                    key={b.key}
                    onClick={() => { setSelectedBrand(b.key); }}
                    className={`px-3 py-1.5 rounded-lg border ${selectedBrand === b.key ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-slate-300'}`}
                  >{b.label}</button>
                ))}
              </div>

              {familiesByBrand[selectedBrand]?.length ? (
                <div className="mb-2">
                  <div className="text-[12px] text-gray-500 mb-1">라인업</div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {familiesByBrand[selectedBrand].map((fam) => (
                      <button
                        key={fam}
                        onClick={() => { setSelectedFamily(fam); setSelectedCapacity(null); }}
                        className={`px-3 py-1.5 whitespace-nowrap rounded-lg border ${selectedFamily === fam ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-700 border-slate-300'}`}
                      >{fam}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-gray-400">해당 브랜드의 집계가 없습니다.</div>
              )}

              {selectedFamily && capacitiesForFamily.length > 0 && (
                <div className="mt-2">
                  <div className="text-[12px] text-gray-500 mb-1">용량</div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setSelectedCapacity(null)}
                      className={`px-3 py-1.5 rounded-lg border ${selectedCapacity == null ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-700 border-slate-300'}`}
                    >전체</button>
                    {capacitiesForFamily.map((cap) => (
                      <button
                        key={cap}
                        onClick={() => setSelectedCapacity(cap)}
                        className={`px-3 py-1.5 whitespace-nowrap rounded-lg border ${selectedCapacity === cap ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-700 border-slate-300'}`}
                      >{cap === '미상' ? '용량 미상' : cap}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 주간 요약(최신) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">주간 요약</div>
                {latestSnapshotLabel && (
                  <div className="text-[12px] text-gray-500">스냅샷: {latestSnapshotLabel}</div>
                )}
              </div>
              {daily?.rows?.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[12px]">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left py-1 pr-4">모델(용량)</th>
                        <th className="text-right py-1 pr-2">최소</th>
                        <th className="text-right py-1 pr-2">p25</th>
                        <th className="text-right py-1 pr-2">중앙값</th>
                        <th className="text-right py-1 pr-2">p75</th>
                        <th className="text-right py-1 pr-2">최대</th>
                        <th className="text-right py-1 pr-2">평균</th>
                        <th className="text-right py-1">샘플 수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const rows = (daily?.rows || []).filter((r: any) => {
                          const brandOk = detectBrand(r.model) === selectedBrand || selectedBrand === 'OTHER' && !(['GALAXY','IPHONE'] as Brand[]).includes(detectBrand(r.model));
                          const familyOk = modelBelongsToFamily(r.model, selectedFamily);
                          const capOk = selectedCapacity == null || normalizeCapacityLabel(r.capacity) === selectedCapacity;
                          return brandOk && familyOk && capOk;
                        });
                        if (!rows.length) {
                          return (
                            <tr>
                              <td className="py-2 text-center text-gray-500" colSpan={8}>선택한 조합에 대한 집계가 없습니다.</td>
                            </tr>
                          );
                        }
                        return rows.map((r: any, i: number) => (
                          <tr key={`${r.model}-${(r as any).capacity ?? 'NULL'}-${i}`} className="border-t">
                            <td className="py-1 pr-4">{r.model} ({(r as any).capacity ?? '용량 미상'})</td>
                            <td className="py-1 pr-2 text-right">{Number(r.min || 0).toLocaleString()}원</td>
                            <td className="py-1 pr-2 text-right">{Number((r as any).p25 || 0).toLocaleString()}원</td>
                            <td className="py-1 pr-2 text-right font-semibold">{Number(r.median || 0).toLocaleString()}원</td>
                            <td className="py-1 pr-2 text-right">{Number((r as any).p75 || 0).toLocaleString()}원</td>
                            <td className="py-1 pr-2 text-right">{Number(r.max || 0).toLocaleString()}원</td>
                            <td className="py-1 pr-2 text-right">{Number((r as any).avg || 0).toLocaleString()}원</td>
                            <td className="py-1 text-right">{Number(r.n || 0).toLocaleString()}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-[12px] text-gray-500">요약 데이터를 불러오는 중…</div>
              )}
            </div>
            {/* 시세 추이 차트 */}
            {trend && trend.rows && trend.rows.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">시세 추이 — {trend.model}</div>
                </div>
                <PriceTrendChart rows={trend.rows} />
              </div>
            )}

            {/* 홈 화면에서는 딜 피드 관련 위젯 제거 (리포트 중심) */}
          </>
        )}

        {tab === "deal" && (
          <div className="space-y-3">
            {/* 정렬 옵션 (딜 탭 전용) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center gap-2 text-[13px]">
              <div className="text-[12px] text-gray-500">정렬</div>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)} className="h-9 border rounded-lg px-2">
                <option value="latest">최신순</option>
                <option value="net_asc">순지출 오름차순</option>
                <option value="tco_asc">총비용 오름차순</option>
              </select>
            </div>
            {remaining.length > 0 ? (
              <>
                <AggregateHeader model={currentTop?.model} capacity={currentTop?.capacity ?? null} dailyRows={daily?.rows} />
                <SwipeDeck
                  deals={sortedRemaining}
                  onLike={(d) => { handleLike(d); }}
                  onSkip={(d) => { handleSkip(d); }}
                  onNeedMore={() => { if (!loadingMore && hasMore) loadMore(); }}
                />
              </>
            ) : (
              hasMore ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-[13px] text-gray-500">딜을 불러오는 중…</div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-[13px] text-gray-500">표시할 카드가 없습니다. 내일 다시 확인해 보세요.</div>
              )
            )}
          </div>
        )}

        {tab === "alerts" && <AlertsScreen userId={userId} />}
        {tab === "settings" && <SettingsScreen userId={userId} onOpenChat={() => setChatOpen(true)} onInstallPrompt={handleInstall} />}
      </div>

      {/* 상시 음성 버튼 */}
      <FloatingMic onClick={() => setChatOpen(true)} />

      {/* 풀스크린 온보딩 채팅 */}
      <VoiceChatFullScreen open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* 하단 네비 */}
      <BottomNav active={tab} onChange={setTab} onOpenChat={() => setChatOpen(true)} />
    </div>
  );
}
