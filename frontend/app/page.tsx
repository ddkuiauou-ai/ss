import React from "react";
import { getDeals as apiGetDeals } from "../lib/api";
import HomeClient from "./page.client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  // 서버에서 초기 피드를 가져와 첫 렌더에 사용
  let initialDeals: any[] = [];
  try {
    const list = await apiGetDeals({ limit: 20 });
    if (Array.isArray(list)) initialDeals = list;
  } catch (e) {
    // 서버 오류 시 클라이언트에서 폴백 처리
    initialDeals = [];
  }
  return <HomeClient initialDeals={initialDeals as any[]} />;
}

