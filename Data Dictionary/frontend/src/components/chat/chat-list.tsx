import { ChatRequestOptions, JSONValue } from "ai";
import { Message } from "ai/react";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "../ui/chat/chat-bubble";
import { ChatMessageList } from "../ui/chat/chat-message-list";
import ChatMessage from "./chat-message";

interface ChatListProps {
  messages: Message[];
  isLoading: boolean;
  loadingSubmit?: boolean;
  reload: (
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  addToolResult?: (args: { toolCallId: string; result: string }) => void;
}

export default function ChatList({
  messages,
  isLoading,
  loadingSubmit,
  reload,
  addToolResult,
}: ChatListProps) {
  return (
    <div className="flex-1 w-full overflow-y-auto">
      <ChatMessageList>
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;

          return (
            <ChatMessage
              key={message.id}
              message={message}
              isLast={isLast}
              isLoading={isLoading}
              reload={reload}
              addToolResult={addToolResult}
            />
          );
        })}
        {loadingSubmit && (
          <ChatBubble variant="received">
            <ChatBubbleAvatar
              src="/blue_logo.svg"
              width={6}
              height={6}
              className="object-contain"
            />
            <ChatBubbleMessage isLoading />
          </ChatBubble>
        )}
      </ChatMessageList>
    </div>
  );
}
