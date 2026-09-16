import { tool } from 'ai';
import { z } from 'zod';

export const selectTable = tool({
  description: "Select relevant tables from the extracted schema data.",
  parameters: z.object({
    selectedTables: z
      .array(z.string())
      .describe("The relevant tables based on the user's request."),
  }),
  execute: async ({ selectedTables }) => {
    console.log('Selected tables:\n', selectedTables);

    // The schema is provided by the server when invoking the chat API.
    // This tool should not call the backend directly to avoid duplicate/concurrent extraction calls.
    // Return a minimal response indicating which tables were selected; the caller (AI pipeline)
    // can use the previously fetched schema to provide detailed table info.
    const selectedTablesString = selectedTables.join(', ');
    return JSON.stringify({
      description: `The relevant tables based on your request are ${selectedTablesString}`,
      selectedTables,
      tables: [],
    });
  },
});
