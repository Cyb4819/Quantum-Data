import { tool } from "ai";
import { z } from "zod";

export const displayResults = tool({
	description:
		`If the result of the SQL query can be represented as a simple chart (x, y), format the data to display a chart. Returns an array of objects with keys 'x' (string) and 'y' (number).
Example: 
\`\`\`
[
	{ x: "January", y: 10 },
	{ x: "February", y: 20 },
	{ x: "March", y: 30 },
	{ x: "April", y: 40 },
	{ x: "May", y: 50 },
	{ x: "June", y: 60 },
]
\`\`\`
`,
	parameters: z.object({
		chartData: z.array(z.object({ x: z.string(), y: z.number() })),
		title: z.string().describe("Title of the chart."),
		description: z.string().describe("Description of the chart."),
	}),
	execute: async ({ chartData, title, description }) => {
		// Now returning an object with the needed properties
		return { data: chartData, title, description };
	},
});