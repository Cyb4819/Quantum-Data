import { CheckIcon, CopyIcon } from "@radix-ui/react-icons";
import { ChatRequestOptions, JSONValue } from "ai";
import { Message } from "ai/react";
import { motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";
import { memo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ButtonWithTooltip from "../button-with-tooltip";
import { Button } from "../ui/button";

import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "../ui/chat/chat-bubble";
import QueryResultTable from "./QueryResultTable";

export type ChatMessageProps = {
  message: ChatMessageWithQueryResult;
  isLast: boolean;
  isLoading: boolean | undefined;
  reload: (
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  addToolResult?: (args: { toolCallId: string; result: string }) => void;
};

const MOTION_CONFIG = {
  initial: { opacity: 0, scale: 1, y: 20, x: 0 },
  animate: { opacity: 1, scale: 1, y: 0, x: 0 },
  exit: { opacity: 0, scale: 1, y: 20, x: 0 },
  transition: {
    opacity: { duration: 0.1 },
    layout: {
      type: "spring",
      bounce: 0.3,
      duration: 0.2,
    },
  },
};

type QueryResultData = {
  type: "query-result";
  results: Record<string, unknown>[];
  sql?: string;
  intent?: string;
};

type ChatMessageWithQueryResult = Message & {
  queryResult?: QueryResultData;
};

function ChatMessage({ message, isLast, isLoading, reload }: ChatMessageProps) {
  const [isCopied, setIsCopied] = useState(false);

  console.log("MESSAGE:", message);
  console.log("MESSAGE DATA:", message.data);

  const queryResult = message.queryResult as QueryResultData | undefined;

  console.log("QUERY RESULT:", queryResult);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 1500);
  };

  const renderActionButtons = () =>
    message.role === "assistant" && (
      <div className="pt-4 flex gap-1 items-center text-muted-foreground">
        {!isLoading && (
          <ButtonWithTooltip side="bottom" toolTipText="Copy">
            <Button
              onClick={handleCopy}
              variant="ghost"
              size="icon"
              className="h-4 w-4"
            >
              {isCopied ? (
                <CheckIcon className="w-3.5 h-3.5" />
              ) : (
                <CopyIcon className="w-3.5 h-3.5" />
              )}
            </Button>
          </ButtonWithTooltip>
        )}

        {!isLoading && isLast && (
          <ButtonWithTooltip side="bottom" toolTipText="Regenerate">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4"
              onClick={() => reload()}
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </Button>
          </ButtonWithTooltip>
        )}
      </div>
    );

  return (
    <motion.div
      {...MOTION_CONFIG}
      className="flex flex-col gap-2 whitespace-pre-wrap"
    >
      <ChatBubble
        variant={message.role === "user" ? "sent" : "received"}
        className={message.role === "assistant" ? "w-full" : ""}
      >
        {message.role === "assistant" && (
          <ChatBubbleAvatar
            src="/blue_logo_bold.svg"
            width={6}
            height={6}
            className="object-contain"
          />
        )}

        <ChatBubbleMessage
          className={message.role === "assistant" ? "w-full max-w-full" : ""}
        >
          {/* AI text */}
          {message.content && (
            <div className="text-foreground">
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>
          )}

          {/* Database table */}
          {queryResult?.results && queryResult.results.length > 0 && (
            <div className="mt-4">
              <QueryResultTable results={queryResult.results} />
            </div>
          )}

          {/* Actions */}
          {renderActionButtons()}
        </ChatBubbleMessage>
      </ChatBubble>
    </motion.div>
  );
}

export default memo(ChatMessage, (prevProps, nextProps) => {
  if (nextProps.isLast) return false;
  return (
    prevProps.isLast === nextProps.isLast &&
    prevProps.message === nextProps.message
  );
});
