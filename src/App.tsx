"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./components/sidebar";
import { NoteEditor } from "./components/note-editor";
import { SearchDialog } from "./components/search-dialog";
import { AIChatDialog } from "./components/ai-chat-dialog";
import { Button } from "./components/ui/button";
import {
  Search,
  XCircle,
  Book,
  BookCheck,
  Brain,
  FilePlus,
  Sparkles,
  Settings,
  DiamondPlus,
  Bot,
} from "lucide-react";
import type { Note } from "./types/note";
import type { Notebook } from "./types/notebook";
import "./App.css";
import axios from "axios";
import type { BaseResponse } from "./dto/base-response";
import type {
  CreateNotebookRequest,
  CreateNotebookResponse,
  GetAllNotebooksResponse,
  MoveNotebookRequest,
  MoveNotebookResponse,
} from "./dto/notebook";
import { AppConfig } from "./config/config";
import type {
  CreateNoteRequest,
  CreateNoteResponse,
  MoveNoteRequest,
  MoveNoteResponse,
  UpdateNoteRequest,
  UpdateNoteResponse,
} from "./dto/note";

export default function App() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(
    new Set(),
  );
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [isProcessingMove, setIsProcessingMove] = useState(false); // State for move operations
  const [isDeletingNotebook, setIsDeletingNotebook] = useState<string | null>(
    null,
  ); // State for deleting notebook
  const [isDeletingNote, setIsDeletingNote] = useState<string | null>(null); // State for deleting note

  const currentNote = notes.find((note) => note.id === selectedNote);

  const fetchAllNotebooks = async () => {
    const res = await axios.get<BaseResponse<GetAllNotebooksResponse[]>>(
      `${AppConfig.baseURL}/api/notebook/v1`,
    );

    setNotebooks(
      res.data.data.map((notebook) => ({
        id: notebook.id,
        name: notebook.name,
        parentId: notebook.parent_id ?? null,
        createdAt: new Date(notebook.created_at),
        updatedAt: new Date(notebook.updated_at ?? notebook.created_at),
      })),
    );

    const notes = res.data.data.reduce<Note[]>((currentNotes, notebook) => {
      return [
        ...currentNotes,
        ...notebook.notes.map<Note>((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          notebookId: notebook.id,
          createdAt: new Date(n.created_at),
          updatedAt: new Date(n.updated_at ?? n.created_at),
        })),
      ];
    }, []);
    setNotes(notes);
  };

  useEffect(() => {
    fetchAllNotebooks();
  }, []);

  const handleNoteUpdate = async (noteId: string, updates: Partial<Note>) => {
    const request: UpdateNoteRequest = {
      title: updates.title ?? "",
      content: updates.content ?? "",
    };
    await axios.put<BaseResponse<UpdateNoteResponse>>(
      `${AppConfig.baseURL}/api/note/v1/${noteId}`,
      request,
    );

    await fetchAllNotebooks(); // Refresh notebooks and notes after update
  };

  const handleNotebookUpdate = () => {
    fetchAllNotebooks();
  };

  const handleDeleteNotebook = async (notebookId: string) => {
    if (isDeletingNotebook === notebookId) return; // Prevent double deletion

    setIsDeletingNotebook(notebookId); // Set loading for this specific notebook

    await axios.delete(`${AppConfig.baseURL}/api/notebook/v1/${notebookId}`);

    await fetchAllNotebooks(); // Refresh notebooks after deletion

    // Clear selection if deleted
    if (selectedNotebook === notebookId) {
      setSelectedNotebook(null);
      setSelectedNote(null);
    }

    setIsDeletingNotebook(null); // Clear loading
  };

  const handleDeleteNote = async (noteId: string) => {
    if (isDeletingNote === noteId) return; // Prevent double deletion

    setIsDeletingNote(noteId); // Set loading for this specific note

    await axios.delete(`${AppConfig.baseURL}/api/note/v1/${noteId}`);

    await fetchAllNotebooks(); // Refresh notebooks and notes after deletion

    // Clear selection if deleted
    if (selectedNote === noteId) {
      setSelectedNote(null);
    }

    setIsDeletingNote(null); // Clear loading
  };

  const getAllChildNotebooks = (parentId: string): string[] => {
    const children = notebooks.filter((nb) => nb.parentId === parentId);
    const allIds = [parentId];

    children.forEach((child) => {
      allIds.push(...getAllChildNotebooks(child.id));
    });

    return allIds;
  };

  const handleMoveNote = async (noteId: string, targetNotebookId: string) => {
    setIsProcessingMove(true); // Start global loading for move
    await new Promise((resolve) => setTimeout(resolve, 800)); // Dummy delay

    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, notebookId: targetNotebookId, updatedAt: new Date() }
          : note,
      ),
    );

    const req: MoveNoteRequest = {
      notebook_id: targetNotebookId,
    };
    await axios.put<BaseResponse<MoveNoteResponse>>(
      `${AppConfig.baseURL}/api/note/v1/${noteId}/move`,
      req,
    );

    await fetchAllNotebooks(); // Refresh notebooks and notes after move

    // Auto-expand target notebook
    setExpandedNotebooks((prev) => new Set([...prev, targetNotebookId]));
    setIsProcessingMove(false); // End global loading
  };

  const handleMoveNotebook = async (
    notebookId: string,
    targetParentId: string | null,
  ) => {
    // Prevent moving a notebook into itself or its children
    const childIds = getAllChildNotebooks(notebookId);
    if (targetParentId && childIds.includes(targetParentId)) {
      return;
    }

    setIsProcessingMove(true); // Start global loading for move
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Dummy delay

    const request: MoveNotebookRequest = {
      parent_id: targetParentId,
    };
    await axios.put<BaseResponse<MoveNotebookResponse>>(
      `${AppConfig.baseURL}/api/notebook/v1/${notebookId}/move`,
      request,
    );

    await fetchAllNotebooks(); // Refresh notebooks after move

    // Auto-expand target parent if it exists
    if (targetParentId) {
      setExpandedNotebooks((prev) => new Set([...prev, targetParentId]));
    }
    setIsProcessingMove(false); // End global loading
  };

  const handleCreateNote = async () => {
    if (!selectedNotebook || isCreatingNote) return;

    setIsCreatingNote(true);

    const request: CreateNoteRequest = {
      title: "Untitled Note",
      content: "# Untitled Note\n\nStart writing...",
      notebook_id: selectedNotebook,
    };

    const res = await axios.post<BaseResponse<CreateNoteResponse>>(
      `${AppConfig.baseURL}/api/note/v1`,
      request,
    );

    await fetchAllNotebooks(); // Refresh notebooks and notes after creation

    setSelectedNote(res.data.data.id);

    // Auto-expand the notebook when adding a note
    setExpandedNotebooks((prev) => new Set([...prev, selectedNotebook]));

    setIsCreatingNote(false);
  };

  const handleCreateNotebook = async () => {
    if (isCreatingNotebook) return;

    setIsCreatingNotebook(true);

    const request: CreateNotebookRequest = {
      name: "New Notebook",
      parent_id: selectedNotebook ?? null,
    };

    axios.post<BaseResponse<CreateNotebookResponse>>(
      `${AppConfig.baseURL}/api/notebook/v1`,
      request,
    );

    await fetchAllNotebooks(); // Refresh notebooks after creation

    // Auto-expand parent notebook when adding a child notebook
    if (selectedNotebook) {
      setExpandedNotebooks((prev) => new Set([...prev, selectedNotebook]));
    }

    setIsCreatingNotebook(false);
  };

  const handleClearSelection = () => {
    setSelectedNotebook(null);
    setSelectedNote(null);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-100 flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-800 to-purple-800 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-grad text-gray-900 tracking-tight">
                Knowledge OS
              </h1>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="">
            <Button
              variant="outline"
              size="default"
              onClick={handleCreateNote}
              disabled={!selectedNotebook || isCreatingNote}
              className="w-full bg-gradient-to-r from-blue-800 to-purple-800 text-white hover:text-white font-normal shadow-sm"
            >
              {isCreatingNote ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : (
                <>
                  <FilePlus className="h-4 w-4 mr-2 text-white" />
                  New Note
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNotebook}
              disabled={isCreatingNotebook}
              className="flex-1 h-9 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-normal shadow-sm"
            >
              {isCreatingNotebook ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : (
                <>
                  <Book className="h-4 w-4 mr-2 text-gray-500" />
                  Notebook
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setChatOpen(true)}
              className="flex-1 h-9 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-normal shadow-sm"
            >
              <Bot className="h-4 w-4 mr-2 text-gray-500" />
              Ask AI
            </Button>

            {/* <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNote}
              disabled={!selectedNotebook || isCreatingNote}
              className="flex-1 h-9 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-normal shadow-sm"
            >
              {isCreatingNote ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2 text-gray-500" />
                  Ask AI
                </>
              )}
            </Button> */}
          </div>
          {(selectedNotebook || selectedNote) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-8 text-xs text-gray-500 hover:text-gray-900 justify-center gap-1.5"
            >
              <XCircle className="h-3.5 w-3.5" />
              Clear Selection
            </Button>
          )}
        </div>

        <Sidebar
          notebooks={notebooks}
          notes={notes}
          selectedNotebook={selectedNotebook}
          selectedNote={selectedNote}
          onNotebookSelect={setSelectedNotebook}
          onNoteSelect={setSelectedNote}
          onNotebookUpdate={handleNotebookUpdate}
          onDeleteNotebook={handleDeleteNotebook}
          onDeleteNote={handleDeleteNote}
          onMoveNote={handleMoveNote}
          onMoveNotebook={handleMoveNotebook}
          expandedNotebooks={expandedNotebooks}
          setExpandedNotebooks={setExpandedNotebooks}
          isProcessingMove={isProcessingMove}
          isDeletingNotebook={isDeletingNotebook}
          isDeletingNote={isDeletingNote}
        />

        {/* User Profile */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-items-start gap-3 bg-white">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-600">Settings</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        <div className="flex-1 overflow-auto">
          {currentNote ? (
            <NoteEditor note={currentNote} onUpdate={handleNoteUpdate} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
              <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-indigo-100/50 rounded-full animate-pulse"></div>
                <BookCheck className="h-12 w-12 text-blue-400 relative z-10" />
                <div className="absolute top-4 right-4 w-2 h-2 bg-purple-400 rounded-full"></div>
                <div className="absolute bottom-6 left-4 w-3 h-3 bg-blue-300 rounded-full"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Select a note to start editing
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Choose a note from the sidebar or create a new one to begin
                capturing your ideas with the power of AI.
              </p>
              <Button
                // disabled={!selectedNotebook || isCreatingNote}
                onClick={() => {
                  if (selectedNotebook) {
                    handleCreateNote();
                  } else {
                    handleCreateNotebook();
                  }
                }}
                className="bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-800 hover:to-purple-800 text-white px-8 h-12 rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <DiamondPlus className="h-5 w-5" />
                Create New Note
              </Button>

              <div className="mt-8 flex items-center gap-6">
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <kbd className="text-sm font-sans bg-gray-50 rounded-lg border border-gray-100 px-2 py-1 text-gray-400">
                    ⌘ N
                  </kbd>
                  <span className="text-sm text-gray-500 font-medium">
                    New Note
                  </span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <kbd className="text-sm font-sans bg-gray-50 rounded-lg border border-gray-100 px-2 py-1 text-gray-400">
                    ⌘ K
                  </kbd>
                  <span className="text-sm text-gray-500 font-medium">
                    Search
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating AI Button */}
        <button
          onClick={() => setChatOpen(true)}
          className="absolute bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-800 to-purple-800 hover:from-blue-900 hover:to-purple-900 text-white rounded-full shadow-xl shadow-blue-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
        >
          <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Dialogs */}
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        notes={notes}
        onNoteSelect={(noteId) => {
          setSelectedNote(noteId);
          const note = notes.find((n) => n.id === noteId);
          if (note) {
            setSelectedNotebook(note.notebookId);
          }
          setSearchOpen(false);
        }}
      />

      <AIChatDialog open={chatOpen} onOpenChange={setChatOpen} notes={notes} />
    </div>
  );
}
