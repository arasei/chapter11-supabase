'use client';

import { useCallback } from "react";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";

type Json = unknown;

//全体の概要
//API呼び出しは useApi を使う
//useSupabasesessionによって管理・供給されたトークンを使って管理APIを叩く
//api/admin に向けた fetch のときだけ、Authorization: Bearer <token> を自動で付ける共通フック

//Authorization は Supabase のトークンを useSupabaseSession() から取得して自動付与。
//JSON のときだけ Content-Type: application/json を自動付与。
//base を渡せば /api プレフィックスを固定で足せます（例：useApi("/api")）。

//主な用途: 管理用のAPI（/api/admin/*）を毎回安全に呼ぶ（付け忘れなし）。

export const useApi = (base = "") => {
  const { token } = useSupabaseSession();

  const toUrl = useCallback(
    (endpoint: string) => (base ? `${base}${endpoint}` : endpoint),
    [base]
  );

  //  送信先URLを見て /api/admin のときだけ Bearer を付与
  const withAuth = (fullUrl: string, extra?: HeadersInit, json = false): HeadersInit => {
    const h = new Headers(extra);
    if (json) h.set("Content-Type", "application/json");
    if (token && fullUrl.startsWith("/api/admin")) {
      h.set("Authorization", `Bearer ${token}`);
    }
    return h;
  };

  const get = useCallback(
    (endpoint: string, init?: RequestInit) => {
      const fullUrl = toUrl(endpoint);
      return fetch(fullUrl, {
        ...init,
        method: "GET",
        headers: withAuth(fullUrl, init?.headers),
      });
    },
    [toUrl, token]
  );

  const post = useCallback(
    (endpoint: string, body?: Json, init?: RequestInit) => {
      const fullUrl = toUrl(endpoint);
      return fetch(fullUrl, {
        ...init,
        method: "POST",
        headers: withAuth(fullUrl, init?.headers, true),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    },
    [toUrl, token]
  );

  const put = useCallback(
    (endpoint: string, body?: Json, init?: RequestInit) => {
      const fullUrl = toUrl(endpoint);
      return fetch(fullUrl, {
        ...init,
        method: "PUT",
        headers: withAuth(fullUrl, init?.headers, true),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    },
    [toUrl, token]
  );

  const del = useCallback(
    (endpoint: string, init?: RequestInit) => {
      const fullUrl = toUrl(endpoint);
      return fetch(fullUrl, {
        ...init,
        method: "DELETE",
        headers: withAuth(fullUrl, init?.headers),
      });
    },
    [toUrl, token]
  );

  // 使う側は api.get / api.post / api.put / api.delete を呼ぶだけ
  return { api: { get, post, put, delete: del } };


}