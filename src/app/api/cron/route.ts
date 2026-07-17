import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const expectedAuthorization = `Bearer ${process.env.CRON_SECRET}`;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!process.env.CRON_SECRET || !serviceRoleKey || authorization !== expectedAuthorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ping no Supabase pra evitar cold start
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const { error } = await supabase
    .from("keep_alive")
    .update({ pinged_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    pinged_at: new Date().toISOString(),
  });
}
