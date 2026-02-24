"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Send, Bot, Plus, Trash2 } from "lucide-react";
import type { Note } from "../types/note";
import type { ChatSession, Message } from "@/types/ai-chat";
import axios from "axios";
import { AppConfig } from "../config/config";
import type { BaseResponse } from "../dto/base-response";
import type {
  CreateSessionResponse,
  DeleteSessionRequest,
  DeleteSessionResponse,
  GetAllSessionsResponse,
  GetChatHistoryResponse,
  SendChatRequest,
  SendChatResponse,
} from "../dto/chatbot";
import ReactMarkdown from "react-markdown";

interface AIChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
}

export function AIChatDialog({ open, onOpenChange, notes }: AIChatDialogProps) {
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const fetchData = async (): Promise<ChatSession[]> => {
    const res = await axios.get<BaseResponse<GetAllSessionsResponse[]>>(
      `${AppConfig.baseURL}/api/chatbot/v1/sessions`,
    );

    const newSession = res.data.data.map((d) => ({
      id: d.id,
      name: d.title,
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at ?? d.created_at),
      messages: [],
    }));
    setSessions(newSession);
    return newSession;
  };

  const sessionClickHandler = async (sessionId: string) => {
    setActiveSessionId(sessionId);

    const res = await axios.get<BaseResponse<GetChatHistoryResponse[]>>(
      `${AppConfig.baseURL}/api/chatbot/v1/chat-history?chat_session_id=${sessionId}`,
    );

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          return {
            ...session,
            messages: res.data.data.map<Message>((d) => ({
              id: d.id,
              role: d.role === "model" ? "assistant" : "user",
              content: d.chat,
              timestamp: new Date(d.created_at),
            })),
          };
        }
        return session;
      }),
    );
  };

  const createNewSession = async () => {
    const res = await axios.post<BaseResponse<CreateSessionResponse>>(
      `${AppConfig.baseURL}/api/chatbot/v1/create-session`,
    );

    await fetchData();
    sessionClickHandler(res.data.data.id);
  };

  const deleteSession = async (sessionId: string) => {
    if (sessions.length <= 1) return;

    const data: DeleteSessionRequest = {
      chat_session_id: sessionId,
    };
    await axios.delete<BaseResponse<DeleteSessionResponse>>(
      `${AppConfig.baseURL}/api/chatbot/v1/delete-session`,
      {
        data,
      },
    );

    await fetchData();

    setSessions((prev) => prev.filter((s) => s.id !== sessionId));

    if (activeSessionId === sessionId) {
      const remainingSessions = sessions.filter((s) => s.id !== sessionId);
      sessionClickHandler(remainingSessions[0]?.id ?? "");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeSession) return;

    setInput("");
    setIsLoading(true);

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [
              ...s.messages,
              {
                id: "awur",
                role: "user",
                content: input,
                timestamp: new Date(),
              },
            ],
          };
        }
        return { ...s };
      }),
    );

    const request: SendChatRequest = {
      chat_session_id: activeSessionId,
      chat: input,
    };

    const res = await axios.post<BaseResponse<SendChatResponse>>(
      `${AppConfig.baseURL}/api/chatbot/v1/send-chat`,
      request,
    );

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            name: res.data.data.title,
            messages: [
              ...s.messages.slice(0, -1),
              {
                id: res.data.data.sent.id,
                role:
                  res.data.data.sent.role === "model" ? "assistant" : "user",
                content: res.data.data.sent.chat,
                timestamp: new Date(res.data.data.sent.created_at),
              },
              {
                id: res.data.data.reply.id,
                role:
                  res.data.data.reply.role === "model" ? "assistant" : "user",
                content: res.data.data.reply.chat,
                timestamp: new Date(res.data.data.reply.created_at),
              },
            ],
          };
        }
        return { ...s };
      }),
    );

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const fetchList = async () => {
      const newSessions = await fetchData();
      if (newSessions.length > 0) {
        sessionClickHandler(newSessions[0]?.id ?? "");
      }
    };

    if (open) {
      fetchList();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] overflow-hidden p-0 gap-0 bg-white border-0 shadow-2xl rounded-2xl sm:rounded-2xl flex flex-col">
        <DialogHeader className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Ask AI
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={createNewSession}
              className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2 text-gray-500" />
              New Chat
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 bg-white">
          {/* Session Sidebar */}
          <div className="w-64 border-r border-gray-100 bg-[#f8f9fc] flex flex-col">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4 py-3 pb-0 flex-shrink-0">
              Chat Sessions
            </h4>
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-1 group"
                  >
                    <Button
                      variant={
                        activeSessionId === session.id ? "secondary" : "ghost"
                      }
                      size="sm"
                      className={`flex-1 justify-start h-auto py-2.5 px-3 text-left flex-col items-start transition-all duration-200 rounded-xl ${
                        activeSessionId === session.id
                          ? "bg-white text-indigo-700 shadow-sm border border-gray-200 font-medium"
                          : "hover:bg-white text-gray-600 hover:text-gray-900 border border-transparent"
                      }`}
                      onClick={() => sessionClickHandler(session.id)}
                    >
                      <span className="truncate w-full text-sm">
                        {session.name.length > 20
                          ? session.name.substring(0, 20) + "..."
                          : session.name}
                      </span>
                      <span className="text-[10px] text-gray-400 w-full mt-1">
                        {session.createdAt.toLocaleDateString()}
                      </span>
                    </Button>
                    {sessions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 rounded-lg ${activeSessionId === session.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                        onClick={() => deleteSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <ScrollArea className="flex-1 pr-6 pl-4">
              <div className="space-y-6 p-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex gap-4 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {message.role === "user" ? (
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs shadow-sm">
                            JD
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-5 py-3.5 shadow-sm text-[15px] leading-relaxed ${
                          message.role === "user"
                            ? "bg-[#f8f9fc] text-gray-900 border border-gray-100 rounded-tr-sm"
                            : "bg-white text-gray-900 border border-gray-100 rounded-tl-sm"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <ReactMarkdown
                            className={"prose prose-sm prose-indigo"}
                          >
                            {message.content}
                          </ReactMarkdown>
                        )}

                        {message.role === "user" && (
                          <div className="whitespace-pre-wrap">
                            {message.content}
                          </div>
                        )}
                        <div
                          className={`text-[10px] mt-2 ${message.role === "user" ? "text-gray-400 text-right" : "text-gray-400"}`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 mt-1 bg-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-3.5 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                        </div>
                        <span className="text-sm text-gray-500 font-medium">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-3 pt-4 border-t border-gray-100 bg-white px-6 pb-6">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your notes..."
                className="flex-1 min-h-[52px] max-h-[120px] bg-white border-2 border-indigo-500 focus-visible:ring-0 focus-visible:border-indigo-600 shadow-sm rounded-xl py-3.5 px-4 transition-all resize-none text-base"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="self-end h-[52px] w-[52px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
