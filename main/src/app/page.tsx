import { redirect } from "next/navigation";
import { requireUserForPage } from "@/lib/auth";

export default async function Home() {
  await requireUserForPage("/");
  redirect("/sprints/current");
}
