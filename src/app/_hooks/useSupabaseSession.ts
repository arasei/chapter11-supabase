'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

//全体の概要
//Supabaseの認証状態を初回取得しつつ変更も購読して常に最新のsessionとJWT（access_token）を保持し、
//あわせて判定中フラグisLoadingを返すカスタムフック

//認証状態を「判定中（undefined）／未ログイン（null）／ログイン済み（Session）」の三値で扱うための型定義
type SessionState =
  | undefined // 判定中
  | null      // 未ログイン
  | Session;  // ログイン済み

//カスタムフック useSupabaseSession
//画面側から呼び出して、常に最新のセッションとトークンを取得するため
export function useSupabaseSession() {
  const [session, setSession] = useState<SessionState>(undefined);//初期値undefined=判定中
  //初期値=undefined
  //Supabase の access_token（JWT）を保持
  //未ログイン時はundefinedのまま
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    //mountedフラグ
    //非同期処理完了前にアンマウントされた場合に、setState を防ぐための安全対策
    let mounted = true;

    //即時実行の async 関数で現在のセッションを一度取得。
    (async () => {
      //supabase.auth.getSession() で現時点のセッションを取得。
      const { data, error } = await supabase.auth.getSession();
      //何かエラーがあればログ出力。
      if (error) {
        console.error('[auth] getSession error:', error);
      }
      //もしアンマウント済みなら中断。
      if (!mounted) return;

      //セッションとトークンを state に反映（セッションが無ければ null、トークンは undefined）
      setSession(data.session ?? null);
      setToken(data.session?.access_token);
    })();

    const {
      //認証状態の**購読（サブスクリプション）**を開始。
      //返り値から subscription を取り出し、後で解除できるように保持。
      data: { subscription },
      //onAuthStateChange のコールバック。
      // サインイン／サインアウト／トークン更新などのイベント発生時に最新セッション s を渡す。
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      //セッションとトークンを更新
      //UIを最新状態に
      setSession(s ?? null);
      setToken(s?.access_token);
    });

    return () => {
      //アンマウント時に mounted=false とし、購読を解除してメモリリークを防止
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  
  return {
    session,       // undefined=判定中 / null=未ログイン / Session=ログイン済み
    token,         // JWT(access_token)
    isLoading: session === undefined, //isLoading: session === undefined をそのままフラグ化して、呼び出し側がローディング分岐しやすいように
  };
}
