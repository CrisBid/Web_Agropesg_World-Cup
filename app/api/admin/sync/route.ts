import { syncResultsFromAPI } from "@/lib/sync-results";

export async function POST() {
  try {
    const result = await syncResultsFromAPI();
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return Response.json({ error: message }, { status: 500 });
  }
}
