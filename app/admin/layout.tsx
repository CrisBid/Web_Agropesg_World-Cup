import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getParticipants } from "@/lib/data";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const uid = jar.get("bolao_uid")?.value;

  if (!uid) redirect("/login");

  const participants = await getParticipants();
  const user = participants.find((p) => p.id === uid);

  if (!user?.isAdmin) redirect("/");

  return <>{children}</>;
}
