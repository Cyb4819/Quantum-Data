import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

type FieldDisplayProps = {
  label: string;
  value: any;
};

function FieldDisplay({ label, value }: FieldDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  // Si la valeur est une primitive, on l'affiche directement
  if (value === null || typeof value !== "object") {
    return (
      <div className="flex flex-col">
        <span className="text-muted-foreground uppercase text-xs">{label}</span>
        <span className="font-medium break-all">{String(value)}</span>
      </div>
    );
  }

  // Si la valeur est un objet ou un tableau, on affiche un toggle
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground uppercase text-xs">{label}</span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronUp size={16} />
          ) : (
            <>
              Show details <ChevronDown size={16} />
            </>
          )}
        </Button>
      </div>
      {expanded && (
        <div className="w-full mt-1 space-y-2 p-4 max-h-64 overflow-y-auto">
          {Array.isArray(value)
            ? value.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  {typeof item === "object"
                    ? Object.entries(item).map(([subKey, subValue]) => (
                        <FieldDisplay key={subKey} label={subKey} value={subValue} />
                      ))
                    : <span>{String(item)}</span>}
                </div>
              ))
            : Object.entries(value).map(([subKey, subValue]) => (
                <FieldDisplay key={subKey} label={subKey} value={subValue} />
              ))}
        </div>
      )}
    </div>
  );
}

function SendResultDialog({
  open,
  onOpenChange,
  result,
}: {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  result: string;
}) {
  const parsedResult = useMemo(() => {
    try {
      return JSON.parse(result);
    } catch (error) {
      return { error: "Invalid JSON result" };
    }
  }, [result]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
					<Button size="sm" className="gap-2" variant="ghost">
						Show details
						<ChevronRight className="w-4 h-4"/>
					</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-6 bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Action details</DialogTitle>
          <DialogDescription>A summary of what happened.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4 text-sm">
          {Object.entries(parsedResult).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <FieldDisplay label={key.replace(/_/g, " ")} value={value} />
              <Separator className="mt-2" />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SendResultDialog;