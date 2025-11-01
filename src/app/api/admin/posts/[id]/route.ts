//Next.js App Router の API で使うリクエスト/レスポンス型。
import { NextRequest, NextResponse } from "next/server";
//Prisma本体の型とクライアント。Prisma はエラー型や GetPayload などで使用。
import { Prisma, PrismaClient } from "@prisma/client";
//認証ガード。ログイン状態を検証。assertRole は将来のロール制御に使える（今はコメントアウト）。
import { requireUser /*, assertRole */ } from "@/app/api/_lib/auth";

//全体の概要
// 認証済みユーザー向けに、指定記事IDの「取得（GET）／更新（PUT）／削除（DELETE）」を Prisma で実行し、
// DBの日時(Date)を ISO 文字列へ変換した DTO で返す Next.js App Router の管理API

//Prisma ORMを使ってデータベースのpostとその関連カテゴリー情報を操作する。

//イメージ
// このAPIは、記事詳細画面の裏方です。
// 画面を開く → GET で「記事＋カテゴリ」を1回で取る
// 直して保存 → PUT で「本文・サムネ・カテゴリ」を更新（カテゴリは一旦リセットして入れ直す）
// 削除ボタン → DELETE で記事を消す
// どの操作もログイン必須で、返ってくる日時はそのまま表示に使える文字列になっています。

//自作の型定義をimport。
// UpdatePostRequestBody: PUT で受け取るボディの型（title/content/thumbnailImageKey/categories）。
// GetPostResponse/PutPostResponse/DeletePostResponse: 各メソッドのレスポンス(返却)型。
// ApiError:エラー時の共通レスポンス。
// Post as PostDTO:画面表示用（DTO）に整形した記事型（createdAt/updatedAt(日時) は string）。
import type { UpdatePostRequestBody,
              GetPostResponse,
              PutPostResponse,
              DeletePostResponse,
              ApiError, 
              Post as PostDTO,//DTO型
} from "@/app/_types/Post";



//Prismaクライアントを生成
const prisma = new PrismaClient();

// include戻り型&DTO変換
// このAPIで使うincludeで取得する戻り値の型をPrismaから自動生成。
type PostWithCategories = Prisma.PostGetPayload<{
  include: {
    postCategories: {
      include: {
        category: { select: { id: true; name: true } };
      };
    };
  };
}>;

//DB生データ -> 画面用DTOへ変換
// Date → ISO文字列 に変換して、フロントでそのまま扱いやすく
// DBの生データ（Date 型を含む）を、クライアント向け DTO（日時は string）に変換。
const toPostDTO = (row: PostWithCategories): PostDTO => ({
  id: row.id,
  title: row.title,
  content: row.content,
  thumbnailImageKey: row.thumbnailImageKey,
  postCategories: row.postCategories.map(pc => ({
    category: { id: pc.category.id, name: pc.category.name },
  })),
  //日時はstringに指定して変換
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});


// 管理者　個別記事取得API(GET)
// ---- GET /api/admin/posts/:id ----
//GET(個別取得)
// GETリクエストの時にこの関数が呼ばれる
// 指定した記事IDに該当する記事＋カテゴリーを取得

//App Router の HTTPメソッド関数。
// URL の id を { params } 経由で受け取る。
export const GET = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  //認証ガード
  // 未ログインなら即リターン
  // このAPIは認証必須
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  // 任意のロール制御
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });

  //URLのidを数値化&妥当性チェック。
  const postId = Number(params.id);
  //isIntegerで値が整数かどうかを判定
  if (!Number.isInteger(postId)) {
    //整数でなければ400を返す。
    return NextResponse.json<ApiError>({ status: "Invalid id" }, { status: 400 });
  }

  //指定IDの記事を1件取得。
  // Prismaのincludeを使用し、対象記事を一度のクエリで関連カテゴリまで取得。
  // カテゴリーは中間テーブル postCategories 経由で category(id,name) を取得。
  try {
    //パスパラメータから記事IDを取得し、postテーブルから該当記事を取得。
    const post = await prisma.post.findUnique({
      where: { id: postId },
      //中間テーブルpostCategoriesを通じて、関連カテゴリー(category.id,name)も取得。
      include: {
        postCategories: {
          include: {
            category: {
              //selectにより必要なフィールドだけを取得(効率的に行うため)
              select: { id: true, name: true },
            },
          },
        },
      },
    });
    //成功時レスポンス。
    // DTO に変換して返す（post が無ければ null）。
    return NextResponse.json<GetPostResponse>(
      { status: "OK", post: post ? toPostDTO(post as PostWithCategories) : null },
      { status: 200 }
    );
  } catch (error: unknown) {
    //例外発生時は、400とエラーメッセージを返す。
    const message = error instanceof Error ? error.message : "Unexpected error";
    //失敗時
    return NextResponse.json<ApiError>({ status: message }, { status: 500 });

  }
};



//管理者　記事更新API
// ---- PUT /api/admin/posts/:id ----
//PUT(更新)
// PUTリクエストの時にこの関数が呼ばれる
// 更新時に送られるリクエストボディの型定義
// 記事の内容を更新し、カテゴリー関連も更新
export const PUT = async (
  req: NextRequest,
  { params }: { params: { id: string } } // ここでリクエストパラメータを受け取る
) => {
  //認証ガード
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });

  //URLのidを数値化&妥当性チェック。
  const postId = Number(params.id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json<ApiError>({ status: "Invalid id" }, { status: 400 });
  }

  //Post.ts からimportした型でボディを受け取る
  // ボディをパースして型付け（title/content/thumbnailImageKey と、categories: {id:number}[]）。
  const { title, content, categories, thumbnailImageKey }: UpdatePostRequestBody =
    await req.json();

  //post.updateで記事本体の更新(この戻り値は使わない方針)
  // idを指定して、Postを更新
  // title, content, thumbnailUrlを更新
  try {
    await prisma.post.update({
      where: { id: postId },
      data: { title, content, thumbnailImageKey },
    });

    //postCategory.deleteManyで一旦、記事と関連するカテゴリーの中間テーブルのレコードを全て削除
    await prisma.postCategory.deleteMany({
      where: { postId },
    });


    //for...of＋postCategory.createで中間テーブルの再構築
    // 記事とカテゴリーの中間テーブルのレコードをDBに生成し、送信、
    // 受けとったカテゴリIDに合わせて再登録(多対多の関係を再構築)
    //本来複数同時生成には、createManyというメソッドがあるが、
    // sqliteではcreateManyが使えないので、for文1つずつ実施して登録してる
    for (const category of categories) {
      await prisma.postCategory.create({
        data: { postId, categoryId: category.id },
      });
    }

    //最終状態をinclude付きで取り直してDTOで返す。
    // 無ければエラーを返す。

    //最終状態をinclude付きで取り直す。
    const finalRow = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        postCategories: { 
          include: { category: { select: { id: true, name: true } } } 
        },
      },
    });
    if (!finalRow) {
      return NextResponse.json<ApiError>({ status: "Not Found" }, { status: 404 });
    }

    //DTOに変換した最終状態を返す。
    // フロントがそのまま使える。
    return NextResponse.json<PutPostResponse>(
      { status: "OK", post: toPostDTO(finalRow as PostWithCategories) }, 
      { status: 200 }
    );

  //例外時の共通エラーレスポンス
    // 既知エラーを細かく分岐表示する。
    //Prisma 既知エラーの例：
    // P2025(対象無し) → 404
    // それ以外の Known → 400
    // 未知 → 500  
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json<ApiError>({ status: "Not Found" }, { status: 404 });
      }
      return NextResponse.json<ApiError>({ status: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json<ApiError>({ status: message }, { status: 500 });
  }
};

//管理者　記事削除API
//DELETE(削除)
// DELETEリクエストの時にこの関数が呼ばれる
// 指定IDの記事を削除
export const DELETE = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  //認証ガード
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });

  //URLのidを数値化&妥当性チェック。
  const postId = Number(params.id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json<ApiError>({ status: "Invalid id" }, { status: 400 });
  }

  try {
    //postテーブルの該当IDのレコードを削除し、
    // 対象記事を削除
    await prisma.post.delete({ where: { id: postId } });
    //成功時レスポンス
    return NextResponse.json<DeletePostResponse>({ status: "OK" }, { status: 200 });
  } catch (error: unknown) {
    //エラー時レスポンス
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return NextResponse.json<ApiError>({ status: "Not Found" }, { status: 404 });
        }
        return NextResponse.json<ApiError>({ status: error.message }, { status: 400 });
      }
      const message = error instanceof Error ? error.message : "Unexpected error";
      return NextResponse.json<ApiError>({ status: message }, { status: 500 });
  }
};