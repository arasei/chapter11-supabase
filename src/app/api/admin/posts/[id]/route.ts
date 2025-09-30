import { NextRequest, NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { requireUser /*, assertRole */ } from "@/app/api/_lib/auth";
//自作の型定義をimport。
//UpdatePostRequestBody: PUT のボディ型（title/content/thumbnailUrl/categories）。
//GetPostResponse/PutPostResponse/DeletePostResponse: 各メソッドのレスポンス型。
//ApiError:エラー時の共通レスポンス。
//Post as PostDTO:画面用（DTO）に整形した記事型（createdAt/updatedAt が string）。
import type { UpdatePostRequestBody,
              GetPostResponse,
              PutPostResponse,
              DeletePostResponse,
              ApiError, 
              Post as PostDTO,//DTO型
} from "@/app/_types/Post";


//全体の概要
//Prisma を使って記事の「取得（GET）／更新（PUT）／削除（DELETE）」を行い、
//DBの Date を ISO文字列に直した DTO に変換して返す、管理者用の Next.js API
//管理者用「記事の個別取得・更新・削除」API。
//Next.js の API ルート /api/admin/posts/[id] に対応したもので、
//指定された記事IDに基づく「記事の取得(GET)」「記事の更新(PUT)」「記事の削除(DELETE)」の3つのHTTPメソッドを処理し、
//Prisma ORMを使ってデータベースのpostとその関連カテゴリー情報を操作する。



const prisma = new PrismaClient();

// include に一致する Prisma の戻り型
//このAPIで使うinclude内容に厳密する戻り型をPrismaから自動生成。
type PostWithCategories = Prisma.PostGetPayload<{
  include: {
    postCategories: {
      include: {
        category: { select: { id: true; name: true } };
      };
    };
  };
}>;

// DB -> DTO（Date→ISO文字列）変換
//DBの生データ（Date 型を含む）を、クライアント向け DTO（日時は string）に変換。
const toPostDTO = (row: PostWithCategories): PostDTO => ({
  id: row.id,
  title: row.title,
  content: row.content,
  thumbnailUrl: row.thumbnailUrl,
  postCategories: row.postCategories.map(pc => ({
    category: { id: pc.category.id, name: pc.category.name },
  })),
  //日時はstringで
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});


// 管理者　個別記事取得API(GET)
// ---- GET /api/admin/posts/:id ----
//指定した記事IDに該当する記事＋カテゴリーを取得
export const GET = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  // ★ 認証ガード
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  // 任意のロール制御
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });

  //URLのidを数値化&妥当性チェック。
  const postId = Number(params.id);
  if (!Number.isInteger(postId)) {
    //整数でなければ400を返す。
    return NextResponse.json<ApiError>({ status: "Invalid id" }, { status: 400 });
  }

  //指定IDの記事を1件取得。
  //カテゴリーは中間テーブル postCategories 経由で category(id,name) を取得。
  try {
    //パスパラメータから記事IDを取得し、postテーブルから該当記事を取得。
    const post = await prisma.post.findUnique({
      where: {
        id: postId
      },
      //中間テーブルpostCategoriesを通じて、関連カテゴリー(category.id,name)も取得。
      //Prismaのincludeを使用し、関連データを1回のクエリで取得可能に。
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
    //DTO に変換して返す（post が無ければ null）。
    return NextResponse.json<GetPostResponse>(
      { status: "OK", post: post ? toPostDTO(post as PostWithCategories) : null },
      { status: 200 }
    );
  } catch (error: unknown) {
    //例外発生時は、400とエラーメッセージを返す。
    const message = error instanceof Error ? error.message : "Unexpected error";
    //失敗時
    return NextResponse.json<ApiError>({ status: message }, { status: 400 });

  }
};




// PUTという命名にすることで、PUTリクエストの時にこの関数が呼ばれる
//管理者　記事更新API
// ---- PUT /api/admin/posts/:id ----
//更新時に送られるリクエストボディの型定義
//記事の内容を更新し、カテゴリー関連も更新
export const PUT = async (
  req: NextRequest,
  { params }: { params: { id: string } } // ここでリクエストパラメータを受け取る
) => {
  // ★ 認証ガード
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });


  //idの安全な数値化
  //idの妥当性チェック
  const postId = Number(params.id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json<ApiError>({ status: "Invalid id" }, { status: 400 });
  }

  //Post.ts からimportした型でボディを受け取る
  //ボディをパースして型付け（title/content/thumbnailUrl と、categories: {id:number}[]）。
  const { title, content, categories, thumbnailUrl }: UpdatePostRequestBody =
    await req.json();

  try {
    // idを指定して、Postを更新
    //title, content, thumbnailUrlを更新
    //post.updateで記事本体の更新(この戻り値は使わない方針)
    await prisma.post.update({
      where: { id: postId },
      data: { title, content, thumbnailUrl },
    });

    // 一旦、記事と関連するカテゴリーの中間テーブルのレコードを全て削除
    //送信されたカテゴリーに合わせて再登録(多対多の関係)
    //postCategory.deleteManyで中間テーブルのリセット
    await prisma.postCategory.deleteMany({
      where: { postId },
    });


    // 記事とカテゴリーの中間テーブルのレコードをDBに生成、受けとったカテゴリIDで再登録(多対多の再構築)
    // 本来複数同時生成には、createManyというメソッドがあるが、sqliteではcreateManyが使えないので、for文1つずつ実施して登録してる
    //for...of＋postCategory.createで中間テーブルの再構築
    for (const category of categories) {
      await prisma.postCategory.create({
        data: { postId, categoryId: category.id },
      });
    }

    //最終状態をinclude付きで取り直してDTOで返す。
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

    // レスポンスを返す
    //DTOに変換した最終状態を返す。
    return NextResponse.json<PutPostResponse>(
      { status: "OK", post: toPostDTO(finalRow as PostWithCategories) }, 
      { status: 200 }
    );
  } catch (error: unknown) {
    //例外時の共通エラーレスポンス
    // Prisma 既知エラーの例：対象なし(P2025) → 404
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
//DELETEという命名にすることで、DELETEリクエストの時にこの関数が呼ばれる
//指定IDの記事を削除
export const DELETE = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  // ★ 認証ガード
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });

  //idの妥当性チェック
  const postId = Number(params.id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json<ApiError>({ status: "Invalid id" }, { status: 400 });
  }

  try {
    //postテーブルの該当IDのレコードを削除
    //対象記事を削除して、成功レスポンス。
    await prisma.post.delete({ where: { id: postId } });
    return NextResponse.json<DeletePostResponse>({ status: "OK" }, { status: 200 });
  } catch (error: unknown) {
    //エラーレスポンス
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