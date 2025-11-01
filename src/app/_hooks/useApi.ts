'use client';

//useCallback でAPI関数の再生成を抑制してメモ化して無駄な再レンダリングを避ける
import { useCallback } from "react";
//useSupabaseSession で Supabaseのトークン を取得(常に最新に)。
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";

//POST/PUTの送信ボディ型として使う汎用の Json 型エイリアス。
//再利用しやすくする為
type Json = unknown;

//全体の概要
// Supabaseのアクセストークンを必要なときだけ自動で付与しつつ、
// GET/POST/PUT/DELETE を同じ書き方で呼べるようにした共通APIフック。
// （/api/admin/* へのときだけ Authorization: Bearer <token> を付与）。


//useSupabaseSession() で取得したログイン中ユーザーの トークン（token） を
// 管理API(/api/admin) で始まるURLのときだけ自動的に Authorization: Bearer <token>(ログイン済みトークン) を付ける。

//Content-Type: application/json はJSON送信時のみ自動付与。

//get / post / put / delete メソッドをまとめて提供することで、
// いちいち ヘッダー設定 や JSON.stringify (ヘッダー／JSON化／トークン付与)を書かずに、
// api.get('/admin/posts') のように同じ手つきでサッとAPIを呼べる“APIの窓口” を作ったフックでAPI呼び出し処理を統一。

//base 引数 に /api などを渡すと、共通のパスを自動で付与できる。



//useApi カスタムフックを宣言。オプションで base（例：/api）を受け取る。
// useSupabaseSession から JWTトークン を取得。
//すべてのAPI呼び出しで共通の前処理（URL組み立て、認可ヘッダ付与）を行う為
export const useApi = (base = "") => {
  const { token } = useSupabaseSession();

  //base が渡されたら base + endpoint を結合して現在のURLを基準にする関数。
  const toUrl = useCallback(
    (endpoint: string) => (base ? `${base}${endpoint}` : endpoint),
    [base]
  );

  //リクエストヘッダーを作成する共通関数。
  //extra をベースに Headers を生成
  //JSON送信時のみ Content-Type を付与
  //送信先URLが /api/admin で始まる時だけ Authorization: Bearer <token> を付与
  const withAuth = (fullUrl: string, extra?: HeadersInit, json = false): HeadersInit => {
    const h = new Headers(extra);
    if (json) h.set("Content-Type", "application/json");
    if (token && fullUrl.startsWith("/api/admin")) {
      h.set("Authorization", `Bearer ${token}`);
    }
    return h;
  };

  //GETリクエスト用のラッパー。
  // toUrl でURL結合し、withAuth でヘッダー整備して fetch。
  // 呼び出し側を簡潔に保つため。
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

  //POST用のラッパー。
  // JSON送信を想定して Content-Type を自動付与、body をJSON文字列化。
  // 毎回 headers と JSON.stringify を書かなくて良くする為
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

  //PUT用のラッパー。
  // JSON送信を想定して Content-Type を自動付与、body をJSON文字列化。
  // 毎回 headers と JSON.stringify を書かなくて良くする為
  // 更新系APIで共通化。
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

  //DELETE用のラッパー
  // JSON送信を想定して Content-Type を自動付与、body をJSON文字列化。
  //毎回 headers と JSON.stringify を書かなくて良くする為
  //削除系APIの共通化
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

  //使う側が
  // (例) api.getの場合
  // const { api } = useApi('/api'); 
  // api.get('/admin/posts') 
  // のように呼べるように、api 名前空間でまとめて返却(統一インターフェイスで呼べる)。
  // 使う側は api.get / api.post / api.put / api.delete を呼ぶだけ
  return { api: { get, post, put, delete: del } };


}