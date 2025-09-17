
//app/admin/layout.tsxはServer Componentとして扱う('use client'は付けない)
//layoutは"枠"だけ。フックは一切使わない=Router未マウント問題を回避。

import AdminShell from './_components/AdminShell';

export default function AdminLayout({ children }: {children:React.ReactNode }) {
  //ここではuseRouteGuardを絶対に呼ばない
  return <AdminShell>{children}</AdminShell>;
}
