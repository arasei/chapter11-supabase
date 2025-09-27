
//app/admin/layout.tsxはServer Componentとして扱う('use client'は付けない)
//layoutは"枠"だけ。フックは一切使わない=Router未マウント問題を回避。

//useApi は API を叩く各ページで使用（一覧/作成/編集など）。
// layout / AdminShell は API を叩かないので不要

import AdminShell from './_components/AdminShell';

export default function AdminLayout({ children }: {children:React.ReactNode }) {
  //ここではuseRouteGuardを絶対に呼ばない
  return <AdminShell>{children}</AdminShell>;
}
