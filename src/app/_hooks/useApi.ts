'use client';

import { useCallback } from "react";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";

//全体の概要
//API呼び出しは useApi を使う
//useSupabasesessionによって管理・供給されたトークンを使って管理APIを叩く
//api/admin に向けた fetch のときだけ、Authorization: Bearer <token> を自動で付ける共通フック

//主な用途: 管理用のAPI（/api/admin/*）を毎回安全に呼ぶ（付け忘れなし）。

export function useApi() {
  const { token } = useSupabaseSession();

  //共通fetchラッパー。
  const apiFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      //リクエスト先とヘッダーを作成
      const url = typeof input === 'string' ? input : input.toString();
      const headers = new Headers(init.headers);

      //パスが/api/adminで始まる場合のみ、JWTをAuthorizationに付与
      //admin配下だけ自動でAuthorizationを付与
      //トークンが無い＝未ログインとして明示的にエラーを投げる。
      if (url.startsWith('/api/admin')) {
        if (!token) throw new Error('未ログイン (トークン無し)');
        headers.set('Authorization', `Bearer ${token}`);
      }

      //fetch を実行。
      // credentials: 'same-origin' で同一オリジンの Cookie 送信を許可
      return fetch(input, {
        ...init,
        headers,
        credentials: 'same-origin',
      });
    },
    //トークンが変わったときだけ関数を再生成(常に最新を維持)
    [token]
  );

  return { apiFetch };
}