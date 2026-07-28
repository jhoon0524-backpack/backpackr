import { redirect } from "next/navigation";

/** 루트에 보여줄 것이 없다. 공개 페이지는 /b/{slug} 로만 들어온다. */
export default function Home() {
  redirect("/admin");
}
