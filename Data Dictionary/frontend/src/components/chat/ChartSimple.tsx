"use client"

import { ChartSpline, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type ChartDataPoint = {
  x: string;
  y: number;
};

interface ChartSimpleProps {
  data: ChartDataPoint[];
	chartTitle: string;
	chartDescription: string;
}

const chartConfig: ChartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
};

export default function ChartSimple({ data, chartTitle, chartDescription }: ChartSimpleProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chartTitle}</CardTitle>
				<CardDescription>{chartDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="x"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="y" fill="var(--color-desktop)" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
					Bar Chart - Label <ChartSpline className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
					Visualization of SQL query results
        </div>
      </CardFooter>
    </Card>
  );
}