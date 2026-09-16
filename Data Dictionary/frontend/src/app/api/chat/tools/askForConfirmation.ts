import { tool } from "ai";
import { z } from "zod";

export const askForConfirmation = tool({
  description: "Ask the user for confirmation before executing a query in the database.",
  parameters: z.object({
    actionType: z.enum(["Create", "Read", "Update", "Delete", "Send"]).describe("Type of action to be performed."),
    message: z.string().describe("Detailed message explaining the action. Here don't use any adress just explain the action."),
  }),
});