"use client";

import dynamic from "next/dynamic";
import useChatStore from "@/app/hooks/useChatStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ColourfulText from "@/components/ui/colourful-text";
import { ChatRequestOptions, generateId, JSONValue } from "ai";
import { Message, useChat } from "ai/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import Header from "../landing/Header";
const PlaceholdersAndVanishInput = dynamic(
  () =>
    import("../ui/placeholders-and-vanish-input").then(
      (mod) => mod.PlaceholdersAndVanishInput,
    ),
  { ssr: false },
);
import ChatBottombar from "./chat-bottombar";
import ChatList from "./chat-list";
import ChatTopbar from "./chat-topbar";

export interface ChatProps {
  id: string;
  initialMessages: Message[] | [];
}

export default function Chat({ initialMessages, id }: ChatProps) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    setInput,
    reload,
    addToolResult,
    data,
  } = useChat({
    id,
    initialMessages,
    onResponse: (response) => {
      if (response) {
        setLoadingSubmit(false);
      }
    },
    onFinish: (message) => {
      const queryResult = dataRef.current.findLast(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          !Array.isArray(item) &&
          "type" in item &&
          item.type === "query-result",
      );

      const assistantMessage = {
        ...message,
        ...(queryResult
          ? {
              queryResult,
            }
          : {}),
      };

      setMessages((currentMessages) =>
        currentMessages.map((m) =>
          m.id === message.id ? assistantMessage : m,
        ),
      );

      const savedMessages = getMessagesById(id);

      saveMessages(id, [...savedMessages, assistantMessage]);
      setLoadingSubmit(false);

      dataRef.current = [];

      router.replace(`/c/${id}`);
    },
    onError: (error) => {
      setLoadingSubmit(false);
      console.error("Chat error:", error.message, error.cause);
      toast.error(`Error: ${error.message}`);
    },
    onToolCall: (tool) => {
      if (tool.toolCall.toolName == "queryDatabase") {
        toast.success("Querying database");
      } else if (tool.toolCall.toolName == "selectTable") {
        toast.success("Selecting table");
      } else if (tool.toolCall.toolName == "displayResults") {
        toast.success("Displaying results");
      }
    },
  });
  const dataRef = React.useRef<JSONValue[]>([]);

  React.useEffect(() => {
    if (data) {
      dataRef.current = data;
    }
  }, [data]);

  const [loadingSubmit, setLoadingSubmit] = React.useState(false);
  const saveMessages = useChatStore((state) => state.saveMessages);
  const getMessagesById = useChatStore((state) => state.getMessagesById);
  const router = useRouter();

  const isToolInProgress = messages.some(
    (m: Message) =>
      m.role === "assistant" &&
      m.toolInvocations?.some((tool) => !("result" in tool)),
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    window.history.replaceState({}, "", `/c/${id}`);
    dataRef.current = [];

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input,
    };

    setLoadingSubmit(true);

    const requestOptions: ChatRequestOptions = {
      body: {},
    };

    handleSubmit(e, requestOptions);
    saveMessages(id, [...messages, userMessage]);
  };

  const removeLatestMessage = () => {
    const updatedMessages = messages.slice(0, -1);
    setMessages(updatedMessages);
    saveMessages(id, updatedMessages);
    return updatedMessages;
  };

  const handleStop = () => {
    stop();
    saveMessages(id, [...messages]);
    setLoadingSubmit(false);
  };

  const placeholders = [
    "Info about client with email: jul@gmail.com",
    "Show me the list of customers",
    "Revenue of the last quarter",
    "Show me the pricing plans",
  ];

  return (
    <div className="flex flex-col w-full max-w-3xl h-full mx-auto">
      {messages.length === 0 ? (
        <>
          <Header />
          <div className="flex flex-col flex-grow justify-center items-center px-4 space-y-8">
            {/* Header section: title and image */}
            <div className="text-center">
              <h1 className="text-2xl md:text-5xl lg:text-7xl font-bold text-foreground font-sans">
                Talk with your <ColourfulText text="Data" />
              </h1>
              <p className="font-normal text-lg text-muted-foreground tracking-normal mt-4 mb-8 max-w-xl mx-auto text-center">
                Query, analyse, and unlock insights with natural language.{" "}
                <br /> AI-powered SQL agent for effortless data exploration.
              </p>
            </div>
            {/* Bottom section: avatar, text and input */}
            <div className="w-full px-4 py-4 shadow-md rounded-lg bg-zinc-50">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-6 h-6">
                  <AvatarImage src="/black_logo.svg" alt="datai Logo" />
                  <AvatarFallback>DT</AvatarFallback>
                </Avatar>
                <p className="text-sm text-muted-foreground italic">
                  Hey, which data do you want to see?
                </p>
              </div>
              <PlaceholdersAndVanishInput
                value={input}
                placeholders={placeholders}
                onChange={handleInputChange}
                onSubmit={onSubmit}
              />
            </div>
            <div className="w-full">
              <Image
                src="/all_logos.svg"
                alt="Datai logo"
                width={1000}
                height={1000}
                className="w-full mx-auto h-48"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <ChatTopbar
            isLoading={isLoading}
            chatId={id}
            messages={messages}
            setMessages={setMessages}
          />
          <ChatList
            messages={messages}
            isLoading={isLoading}
            loadingSubmit={loadingSubmit}
            reload={async () => {
              removeLatestMessage();

              dataRef.current = [];
              const requestOptions: ChatRequestOptions = {
                body: {},
              };

              setLoadingSubmit(true);
              return reload(requestOptions);
            }}
            addToolResult={addToolResult}
          />
          <ChatBottombar
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={onSubmit}
            isLoading={isLoading}
            stop={handleStop}
            setInput={setInput}
            isToolInProgress={isToolInProgress}
            isMiddle={false}
          />
        </>
      )}
    </div>
  );
}
