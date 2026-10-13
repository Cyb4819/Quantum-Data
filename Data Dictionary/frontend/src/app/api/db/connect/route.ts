import { getBackendEnv } from "@/lib/backend-env";

const springApiUrl = process.env.SPRING_API_URL || "http://localhost:8081";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const type = String(input.type || input.db_type || "").toLowerCase();
    let config: Record<string, string> = { type };

    if (type === "postgresql") {
      const host = String(input.host || "");
      const port = Number(input.port || 5432);
      const database = String(input.database || "");
      if (!host || !database || !Number.isInteger(port)) {
        return Response.json({ detail: "PostgreSQL connection details are incomplete." }, { status: 400 });
      }
      config = {
        type,
        url: `jdbc:postgresql://${host}:${port}/${database}`,
        username: String(input.user || ""),
        password: String(input.password || ""),
        database,
      };
    } else if (type === "mongodb") {
      const uri = getBackendEnv("MONGODB_URI");
      if (!uri) {
        return Response.json(
          { detail: "Missing MongoDB configuration. Set MONGODB_URI in the server environment." },
          { status: 500 }
        );
      }
      config = { type, uri, database: String(input.database || "") };
    } else if (type === "mysql") {
      config = {
        type,
        url: String(input.url || ""),
        username: String(input.username || ""),
        password: String(input.password || ""),
      };
    } else {
      return Response.json({ detail: `Unsupported database type: ${type || "(missing)"}` }, { status: 400 });
    }

    const response = await fetch(`${springApiUrl}/api/db/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[DB-CONNECT]", error);
    return Response.json(
      { detail: error instanceof Error ? error.message : "Database connection failed." },
      { status: 500 }
    );
  }
}
