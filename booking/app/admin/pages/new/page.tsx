import { redirect } from "next/navigation";

import { host } from "@/lib/supabase";

import { EMPTY, PageForm } from "../PageForm";

export default async function NewPage() {
  if (!(await host())) redirect("/admin");
  return <PageForm initial={EMPTY} />;
}
