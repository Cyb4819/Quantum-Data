async function fetchSchema(): Promise<any> {
  const requestBody = [
    {
      type: "mysql",
      url: "jdbc:mysql://localhost:3306/customers",
      username: "root",
      password: "vansh4542",
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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const schema = await fetchSchema();

    const response = await fetch(
      "http://localhost:8081/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          schema,
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
