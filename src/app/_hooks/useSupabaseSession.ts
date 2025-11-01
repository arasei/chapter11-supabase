'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

//全体の概要
// Supabase の現在のログイン状態（Session）を初回取得し、
// その後の変化を購読して常に最新の session と JWT（access_token） を保ちつつ、
// 判定中かどうかを示す isLoading も返すカスタムフックです。

//UIやガードは useSupabaseSessionを使う
//トークンを管理・供給


//主な用途: ヘッダーのログイン表示、ガード、Authorization: Bearer <token> が必要な API 呼び出し、UI のローディング分岐。
// このusseSupabaseSession.tsで「いまログインしてる？トークンは？」をどこからでも参照可能。

//処理の流れ
// 画面が表示されたら、まず 今ログインしているか（Session）を Supabase に聞く。
// その後は、ログイン/ログアウト/トークン更新が起きたら 自動で最新状態に更新。
// 呼び出し側は isLoading が true の間は判定中としてスピナー表示などをし、
// session と token を使って 保護ページの表示切替や API 認証を行う。


//sessionの認証状態を「判定中（undefined）／未ログイン（null）／ログイン済み（Session）」の三値で扱うための型定義
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
  //未ログイン時はtoken=undefinedのまま
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    //mountedフラグ
    //非同期処理完了前にアンマウントされた場合に、setState を防ぐための安全対策
    let mounted = true;

    //即時実行の async 関数で現在のセッションを初回だけ一度取得。
    //そして、sessionとtokenを反映する。
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
      // サインイン／サインアウト／トークン更新などのイベント発生時に最新のSession s を渡す。
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      //受け取ったSession sを即時反映
      //セッションとトークンを更新
      //UIを最新状態に
      setSession(s ?? null);
      setToken(s?.access_token);//ここで s?.access_token を抜き出しておけば API 用の Bearer をどこでも使える。
    });

    return () => {
      //アンマウント時に mounted=false とし、
      // 購読を解除してリーク・二重更新を防止
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
