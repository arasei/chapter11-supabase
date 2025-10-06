// カテゴリー型
export interface Category {
  id: number;
  name: string;
}

// 共通ベース型（新規・更新の両方で使う）
//新規作成・更新で共通して送受信する投稿本体のデータ形を定義します。
export interface BasePostPayload {
  title: string;
  content: string;
  thumbnailImageKey: string;
  categories: { id: number }[];//関連付けるカテゴリーIDの配列（中間テーブルへ渡すため最小形）
}

// 更新APIのリクエストボディ型（エイリアス）
//PUT のリクエストボディは BasePostPayload と同一であることを示す別名
export type UpdatePostRequestBody = BasePostPayload;

// サーバーから取得する投稿データ（取得用）
//画面用DTO（APIレスポンス用)
//API レスポンス用に日時を string（ISO文字列） に統一し、カテゴリーを中間テーブル経由の形で持つ画面向けの投稿データです。
export interface Post {
  id: number;
  title: string;
  content: string;
  thumbnailImageKey: string;
  //中間テーブル経由で取得したカテゴリー（postCategories[].category の形）。
  postCategories: {
    category: Category
  }[];
  //作成日時を ISO文字列 で返す（バックエンドで Date→string に変換）。
  createdAt: string;//stringに固定
  //更新日時を ISO文字列 で返す。
  updatedAt: string;//stringに固定
}

// 共通
//成功・失敗で共通に使うレスポンスの基本形

//失敗時のレスポンス（メッセージを status に格納）。
export type ApiError = { status: string };
//成功時は固定文字 "OK" を返す判定用フィールド。
export type Ok = { status: "OK" };

// GETレスポンス
//各 HTTP メソッドごとの最終的なレスポンス構造を固定します。
//見つからなければnullを返す。
export type GetPostResponse = Ok & { post: Post | null };

// PUTレスポンス（更新後の最新記事を返す）
//各 HTTP メソッドごとの最終的なレスポンス構造を固定します。
//更新後の最新記事を返す。
export type PutPostResponse = Ok & { post: Post };

// DELETEレスポンス（成功時はOKだけ返す）
//各 HTTP メソッドごとの最終的なレスポンス構造を固定します。
export type DeletePostResponse = Ok;



// 新規投稿（送信用）
//BasePostPayload（共通の投稿データ型）をそのまま継承した新規投稿用の型
//新規作成時に送るデータは BasePostPayload と同一であることを示す別名
export type CreatePost = BasePostPayload;


// 更新投稿（送信用）
//BasePostPayload を継承しつつ、更新対象を識別するための id を必須追加した型
//更新時にクライアント側で扱う「id 付きの送信データ」の型です（API 本体は URL で id を受けます）。
export interface UpdatePost extends BasePostPayload {
  id: number;
}
