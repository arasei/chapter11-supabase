import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireUser /* assertRole */ } from "@/app/api/_lib/auth";

//全体の概要
// Prisma + Next.js App Router の カテゴリー管理用のAPI ルートで、認証を通過したユーザーに対して、
// 指定IDのカテゴリーを「取得(GET)・更新(PUT)・削除(DELETE)」できる管理用エンドポイント

//イメージ
// まず認証：ログインしていなければ、ここは使えない。
// GET：そのIDのカテゴリーを1件取得
// PUT：そのIDのカテゴリーの名前を更新
// DELETE：そのIDのカテゴリーを削除
// → つまり、1つのIDのレコードに対する基本操作（CRUDのR/U/D） をまとめたAPI

//このAPIは「指定したIDのカテゴリー」に対する窓口。
// ドアマン（認証ガード）がまず本人確認し、
// 中に入ったら 見る（GET）・名前を変える（PUT）・消す（DELETE） を行える。

//Prismaクライアント生成。
const prisma = new PrismaClient();


//管理者カテゴリー個別取得API
//カテゴリー1件の取得

//GET処理
// 処理の流れ
// 認証→idを数値化→1件取得→JSON返却。
export const GET = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  //認証ガード(直書き)
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  //必要なら管理者限定
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });
  const { id } = params;
  //URLのidパラメータをintに変換し、Prismaでid一致のデータを取得。
  try {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id, 10) },
    });
    return NextResponse.json({ status: "OK", category });
  } catch (error) {
    if (error instanceof Error)
      return NextResponse.json({ status: error.message });
  }
};

interface UpdateCategoryRequestBody {
  name: string;
}



//管理者　カテゴリー更新API
//カテゴリーの名前を更新

//PUT処理
// 処理の流れ
// 認証→bodyからname→update→JSON返却。
export const PUT = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  //認証ガード(直書き)
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  //必要なら管理者限定
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });
  const { id } = params;
  //リクエストボディからnameを取り出し、該当カテゴリーの名前を更新します。
  const { name }: UpdateCategoryRequestBody = await req.json();
  try {
    const category = await prisma.category.update({
      where: {
        id: parseInt(id, 10),
      },
      data: {
        name
      },
    });
    return NextResponse.json({ status: "OK", category }, { status: 200 });
  } catch (error) {
    if (error instanceof Error)
      return NextResponse.json({ status: error.message }, { status: 400 });
  }
};

//管理者　カテゴリー削除API
//カテゴリーの削除

//DELETE処理
// 流れ
// 認証→削除→JSON返却。
export const DELETE = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  //認証ガード(直書き)
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });
  //必要なら管理者限定
  // const gate = assertRole(auth.user, "admin");
  // if ("error" in gate) return NextResponse.json(gate, { status: gate.status });
  const { id } = params;
  try {
    // idを指定して、Categoryを削除
    await prisma.category.delete({
      where: {
        id: parseInt(id, 10)
      },
    });
    return NextResponse.json({ status: "OK" }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ status: error.message }, { status: 400 });
    }
  }
};