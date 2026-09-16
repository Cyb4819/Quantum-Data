import fs from "node:fs";
import path from "node:path";

function loadBackendEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), "../backend/.env");
  const envFile = fs.readFileSync(envPath, "utf8");

  return Object.fromEntries(
    envFile
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator === -1) return ["", ""];

        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
        return [key, value];
      })
      .filter(([key]) => key)
  );
}

async function fetchSchema(): Promise<any> {
  const backendEnv = loadBackendEnv();
  const host = backendEnv.MYSQL_HOST;
  const port = backendEnv.MYSQL_PORT;
  const username = backendEnv.MYSQL_USER;
  const password = backendEnv.MYSQL_PASSWORD;
  const database = backendEnv.MYSQL_DB;

  if (!host || !port || !username || !password || !database) {
    throw new Error(
      "Missing MySQL configuration in backend/.env. Set MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DB."
    );
  }

  const requestBody = [
    {
      type: "mysql",
      url: `jdbc:mysql://${host}:${port}/${database}`,
      username,
      password,
      driverClassName: "com.mysql.cj.jdbc.Driver"
    }
  ];

  const response = await fetch(
    "http://localhost:8081/api/metadata/extract",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    throw new Error(`Schema fetch failed: ${response.status}`);
  }

  return response.json();
}

async function fetchMongoSchema(database?: string): Promise<any> {
  const response = await fetch("http://localhost:8000/api/extract/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      db_type: "mongodb",
      database: database || undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `MongoDB schema fetch failed: ${response.status}`);
  }

  return (await response.json()).data;
}

async function fetchPostgresSchema(config: Record<string, unknown>): Promise<any> {
  const response = await fetch("http://localhost:8000/api/extract/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ db_type: "postgresql", ...config }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `PostgreSQL schema fetch failed: ${response.status}`);
  }
  return (await response.json()).data;
}

function getSelectedDatabase(request: Request): {
  dbType?: string;
  database?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
} {
  const cookie = request.headers.get("cookie") || "";
  const value = cookie.match(/(?:^|; )selectedDatabase=([^;]*)/)?.[1];
  if (!value) return {};

  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const selectedDatabase = getSelectedDatabase(req);
    const isMongoDB = selectedDatabase.dbType === "mongodb";
    const isPostgreSQL = selectedDatabase.dbType === "postgresql";

    const schema = isMongoDB
      ? await fetchMongoSchema(selectedDatabase.database)
      : isPostgreSQL
        ? await fetchPostgresSchema(selectedDatabase)
      : await fetchSchema();

    const response = await fetch(
      isMongoDB
        ? "http://localhost:8000/api/ai/query"
        : isPostgreSQL
          ? "http://localhost:8000/api/ai/query"
        : "http://localhost:8081/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          schema,
          ...(isMongoDB
            ? {
                db_type: "mongodb",
                database: selectedDatabase.database || undefined,
              }
            : isPostgreSQL
              ? {
                  db_type: "postgresql",
                  host: selectedDatabase.host,
                  port: selectedDatabase.port,
                  user: selectedDatabase.user,
                  password: selectedDatabase.password,
                  database: selectedDatabase.database,
                }
            : {}),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SPRING ERROR]", errorText);
      throw new Error(errorText);
    }

    const result = await response.json();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        if (result.response) {
          controller.enqueue(
            encoder.encode(
              `0:${JSON.stringify(result.response)}\n`
            )
          );
        }

        if (Array.isArray(result.results) && result.results.length > 0) {
          const queryResult = {
            type: "query-result",
            results: result.results,
            sql: result.sql ?? undefined,
            intent: result.intent ?? undefined,
          };

          controller.enqueue(
            encoder.encode(
              `2:${JSON.stringify([queryResult])}\n`
            )
          );
        }

        // Finish stream
        controller.enqueue(
          encoder.encode(
            `d:${JSON.stringify({
              finishReason: "stop",
            })}\n`
          )
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[CHAT-API]", err);

    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
