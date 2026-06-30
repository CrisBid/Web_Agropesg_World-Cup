import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.classificationOverride.findMany({
    select: { participantId: true },
    distinct: ["participantId"],
  });
  const ids = rows.map((r) => r.participantId);
  return Response.json(ids);
}
