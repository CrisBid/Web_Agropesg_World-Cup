import { exec } from "child_process";

export async function POST() {
  // Fire-and-forget: PM2 will restart the process gracefully.
  // The response may or may not arrive before the old process is killed.
  exec("pm2 restart web-agropesg-bolao", (err) => {
    if (err) console.error("[restart] pm2 error:", err.message);
  });

  return Response.json({ ok: true, restarting: true });
}
