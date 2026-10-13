import { getBackendEnv } from "@/lib/backend-env";

type SelectedDatabase = {
  dbType?: string;
  database?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
};

type DatabaseConfig = {
  type: string;
  url?: string;
  uri?: string;
  username?: string;
  password?: string;
  database?: string;
};

const springApiUrl = process.env.SPRING_API_URL || "http://localhost:8081";

function getSelectedDatabase(request: Request): SelectedDatabase {
  const cookie = request.headers.get("cookie") || "";
  const value = cookie.match(/(?:^|; )selectedDatabase=([^;]*)/)?.[1];
  if (!value) return {};

  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return {};
  }
}

function getDatabaseConfig(selected: SelectedDatabase): DatabaseConfig {
  const databaseType = selected.dbType || "mysql";

  if (databaseType === "mysql") {
    const host = getBackendEnv("MYSQL_HOST");
    const port = getBackendEnv("MYSQL_PORT");
    const username = getBackendEnv("MYSQL_USER");
    const password = getBackendEnv("MYSQL_PASSWORD");
    const database = getBackendEnv("MYSQL_DB");
    if (!host || !port || !username || !password || !database) {
      throw new Error(
        "Missing MySQL configuration. Set MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DB."
      );
    }
    return {
      type: "mysql",
      url: `jdbc:mysql://${host}:${port}/${database}`,
      username,
      password,
      database,
    };
  }

  if (databaseType === "postgresql") {
    if (!selected.host || !selected.user || !selected.database) {
      throw new Error("PostgreSQL connection details are missing.");
    }
    return {
      type: "postgresql",
      url: `jdbc:postgresql://${selected.host}:${selected.port || 5432}/${selected.database}`,
      username: selected.user,
      password: selected.password || "",
      database: selected.database,
    };
  }

  if (databaseType === "mongodb") {
    const uri = getBackendEnv("MONGODB_URI");
    if (!uri) {
      throw new Error("Missing MongoDB configuration. Set MONGODB_URI in the server environment.");
    }
    return {
      type: "mongodb",
      uri,
      database: selected.database || undefined,
    };
  }

  throw new Error(`Unsupported database type: ${databaseType}`);
}

function metadataSource(config: DatabaseConfig): Record<string, string> {
  const source: Record<string, string> = { type: config.type };
  if (config.url) source.url = config.url;
  if (config.uri) source.uri = config.uri;
  if (config.username) source.username = config.username;
  if (config.password) source.password = config.password;
  if (config.database) source.database = config.database;
  if (config.type === "mysql") source.driverClassName = "com.mysql.cj.jdbc.Driver";
  if (config.type === "postgresql") source.driverClassName = "org.postgresql.Driver";
  return source;
}

async function extractSchema(config: DatabaseConfig): Promise<unknown> {
  const response = await fetch(`${springApiUrl}/api/metadata/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([metadataSource(config)]),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Schema extraction failed (${response.status}): ${details}`);
  }
  return response.json();
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const databaseConfig = getDatabaseConfig(getSelectedDatabase(req));
    const schema = await extractSchema(databaseConfig);
    const response = await fetch(`${springApiUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, schema, databaseConfig }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMessage =
        typeof errorBody?.error === "string"
          ? errorBody.error
          : typeof errorBody?.detail === "string"
            ? errorBody.detail
            : response.statusText || "Chat request failed";
      console.error("[SPRING ERROR]", errorMessage);
      return new Response(errorMessage, {
        status: response.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const result = await response.json();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        if (result.response) {
          controller.enqueue(encoder.encode(`0:${JSON.stringify(result.response)}\n`));
        }

        if (Array.isArray(result.results) && result.results.length > 0) {
          const queryResult = {
            type: "query-result",
            results: result.results,
            sql: result.sql ?? undefined,
            collection: result.collection ?? undefined,
            filter: result.filter ?? undefined,
            intent: result.intent ?? undefined,
          };
          controller.enqueue(encoder.encode(`2:${JSON.stringify([queryResult])}\n`));
        }

        controller.enqueue(
          encoder.encode(`d:${JSON.stringify({ finishReason: "stop" })}\n`)
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
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
