"use client";

import React from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Message } from "ai/react";
import { DatabaseIcon, Plus, Sidebar as SidebarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../sidebar";
import { AddDatabaseDialog } from "./ConnectDialog";
import useChatStore from "@/app/hooks/useChatStore";

interface ChatTopbarProps {
  isLoading: boolean;
  chatId?: string;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
}

export default function ChatTopbar({
  chatId,
  messages,
  setMessages,
}: ChatTopbarProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const { getSelectedDatabase } = useChatStore();
  const selectedDatabase = getSelectedDatabase();

  const handleCloseSidebar = () => {
    setSheetOpen(false);
  };

  const router = useRouter();

  return (
    <div className="w-full flex px-4 py-6 items-center justify-between ">
      <div className="flex items-center ">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <div className="p-3 cursor-pointer hover:bg-secondary rounded-lg">
              <SidebarIcon className="w-5 h-5" />
            </div>
          </SheetTrigger>

          <SheetContent side="left">
            <Sidebar
              chatId={chatId || ""}
              isCollapsed={false}
              isMobile={false}
              messages={messages}
              closeSidebar={handleCloseSidebar}
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center space-x-2">
        {selectedDatabase ? (
          <div className="flex items-center gap-2 mr-2 py text-xs text-green-400">
            <span className="capitalize font-semibold">
              {selectedDatabase.dbType}
            </span>
            @
            <span className="text-gray-400">
              {selectedDatabase.host}:{selectedDatabase.port}/
              {selectedDatabase.database}
            </span>
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          </div>
        ) : (
          <div className="flex items-center gap-2 mr-2 py text-xs text-gray-400">
            No Database Connected
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
          </div>
        )}

        <AddDatabaseDialog />

        <Button
          onClick={() => {
            router.push("/");
          }}
          variant="default"
          className="rounded-full gap-2 bg-black text-primary-foreground hover:bg-black/90"
        >
          New Chat
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
