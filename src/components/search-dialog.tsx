"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, FileText, Zap, ArrowRight, Code } from "lucide-react";
import type { Note } from "../types/note";
import axios from "axios";
import { AppConfig } from "../config/config";
import type { BaseResponse } from "@/dto/base-response";
import type { GetSemanticSearchResponse } from "@/dto/note";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  onNoteSelect: (noteId: string) => void;
}

const highlightText = (text: string, query: string) => {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span
            key={i}
            className="bg-yellow-100 text-yellow-800 px-1 rounded-sm"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
};

function SearchDialog({
  open,
  onOpenChange,
  notes,
  onNoteSelect,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    // Simulate semantic search with a delay
    const searchTimeout = setTimeout(async () => {
      const res = await axios.get<BaseResponse<GetSemanticSearchResponse[]>>(
        `${AppConfig.baseURL}/api/note/v1/semantic-search?q=${query}`,
      );

      const data: Note[] = res.data.data.map((note) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        notebookId: note.notebook_id,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at ?? note.created_at),
      }));

      setResults(data);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, notes]);

  const handleNoteSelect = (noteId: string) => {
    onNoteSelect(noteId);
    setQuery("");
    setResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 gap-0 bg-white border-0 shadow-2xl rounded-2xl sm:rounded-2xl">
        <DialogHeader className="px-6 py-5 pb-2">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Semantic Search
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col">
          <div className="px-6 pt-2 pb-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-indigo-500" />
              <Input
                placeholder="Search your notes semantically..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-12 py-6 text-base rounded-xl border-2 border-indigo-500 focus-visible:ring-0 focus-visible:border-indigo-600 shadow-sm transition-all"
                autoFocus
              />
            </div>
            <div className="flex items-center mt-3 text-xs text-gray-400 font-medium px-2">
              <span>Press</span>
              <kbd className="mx-1.5 px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500 font-sans shadow-sm">
                Enter
              </kbd>
              <span>to search</span>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-auto px-6 pb-2">
            {isSearching && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-600">
                  Searching...
                </span>
              </div>
            )}

            {!isSearching && results.length > 0 && (
              <div className="space-y-3 pb-4">
                {results.map((note) => {
                  const isCode =
                    note.title.toLowerCase().includes("setup") ||
                    note.title.toLowerCase().includes("config") ||
                    note.title.toLowerCase().includes("code");
                  return (
                    <Button
                      key={note.id}
                      variant="ghost"
                      className="w-full justify-start h-auto p-4 text-left bg-[#f8f9fc] hover:bg-[#f0f3ff] rounded-xl border border-transparent hover:border-indigo-100 transition-all group/item"
                      onClick={() => handleNoteSelect(note.id)}
                    >
                      <div className="flex gap-4 w-full">
                        <div className="mt-1 flex-shrink-0 text-gray-400 group-hover/item:text-indigo-500 transition-colors">
                          {isCode ? (
                            <Code className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm truncate">
                            {note.title}
                          </div>
                          <div className="text-sm text-gray-500 mt-1.5 leading-relaxed break-words whitespace-normal line-clamp-2">
                            {note.content.length > 150
                              ? highlightText(
                                  note.content
                                    .replace(/[#*\n]/g, " ")
                                    .substring(0, 150) + "...",
                                  query,
                                )
                              : highlightText(
                                  note.content.replace(/[#*\n]/g, " "),
                                  query,
                                )}
                          </div>
                          <div className="text-xs text-indigo-600 mt-2.5 font-medium flex items-center opacity-90 group-hover/item:opacity-100">
                            Click to open{" "}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}

            {!isSearching && query && results.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-base font-medium text-gray-900">
                  No notes found for "{query}"
                </p>
                <p className="text-sm mt-2">
                  Try different keywords or create a new note
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50/80 border-t border-gray-100 px-6 py-4 flex items-center justify-between text-xs text-gray-500 mt-auto">
            <div>© 2024 Knowledge OS. Advanced semantic search technology.</div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <Zap className="h-3.5 w-3.5 text-yellow-500" /> AI Powered
              </span>
              <span className="text-gray-400">|</span>
              <span>{results.length} results found</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { SearchDialog };
