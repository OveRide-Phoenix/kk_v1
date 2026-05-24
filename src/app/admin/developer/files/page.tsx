"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Save,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { http, readJsonResponse } from "@/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number | null;
  modified: number | null;
}

interface OpenFile {
  path: string;
  content: string;
  originalContent: string;
  saving: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function langFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    sh: "bash",
    env: "bash",
    conf: "nginx",
    json: "json",
    md: "markdown",
    sql: "sql",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    txt: "text",
    css: "css",
    html: "html",
  };
  return map[ext] ?? "text";
}

// ─── File tree node ───────────────────────────────────────────────────────────

function TreeNode({
  entry,
  depth,
  selectedPath,
  onSelect,
}: {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  onSelect: (entry: FileEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!entry.is_dir) {
      onSelect(entry);
      return;
    }
    if (!expanded) {
      setLoading(true);
      try {
        const res = await http.get(`/api/dev/files?path=${encodeURIComponent(entry.path)}`);
        const data = await readJsonResponse<FileEntry[]>(res);
        setChildren(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    }
    setExpanded((v) => !v);
  };

  const isSelected = selectedPath === entry.path;

  return (
    <div>
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 w-full text-left px-2 py-0.5 rounded text-sm hover:bg-accent transition-colors ${
          isSelected ? "bg-accent text-accent-foreground font-medium" : "text-foreground"
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {entry.is_dir ? (
          <>
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            ) : expanded ? (
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
            {expanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-amber-500" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
        <span className="truncate">{entry.name}</span>
        {!entry.is_dir && entry.size !== null && (
          <span className="ml-auto text-xs text-muted-foreground shrink-0 pr-1">
            {fmtSize(entry.size)}
          </span>
        )}
      </button>
      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FilesPage() {
  const [roots, setRoots] = useState<FileEntry[]>([]);
  const [rootLoading, setRootLoading] = useState(true);
  const [rootError, setRootError] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const loadRoot = useCallback(async () => {
    setRootLoading(true);
    setRootError(null);
    try {
      const res = await http.get("/api/dev/files");
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await readJsonResponse<FileEntry[]>(res);
      setRoots(Array.isArray(data) ? data : []);
    } catch (err) {
      setRootError(err instanceof Error ? err.message : "Failed to load file tree");
    } finally {
      setRootLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoot();
  }, [loadRoot]);

  const openEntry = useCallback(async (entry: FileEntry) => {
    if (entry.is_dir) return;
    setFileLoading(true);
    setFileError(null);
    setSaveMsg(null);
    try {
      const res = await http.get(`/api/dev/files/read?path=${encodeURIComponent(entry.path)}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await readJsonResponse<{ path: string; content: string }>(res);
      setOpenFile({
        path: data.path,
        content: data.content,
        originalContent: data.content,
        saving: false,
      });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to open file");
    } finally {
      setFileLoading(false);
    }
  }, []);

  const save = useCallback(async () => {
    if (!openFile) return;
    setOpenFile((f) => f && { ...f, saving: true });
    setSaveMsg(null);
    try {
      const res = await http.post("/api/dev/files/write", {
        path: openFile.path,
        content: openFile.content,
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setOpenFile((f) => f && { ...f, originalContent: f.content, saving: false });
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
      setOpenFile((f) => f && { ...f, saving: false });
    }
  }, [openFile]);

  const isDirty = openFile ? openFile.content !== openFile.originalContent : false;

  return (
    <AdminLayout activePage="dev-files">
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* ── File tree ── */}
        <div className="w-64 shrink-0 flex flex-col border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
            <span className="text-sm font-medium">Files</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadRoot}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {rootLoading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : rootError ? (
              <div className="px-3 py-2 text-xs text-destructive">{rootError}</div>
            ) : (
              roots.map((entry) => (
                <TreeNode
                  key={entry.path}
                  entry={entry}
                  depth={0}
                  selectedPath={openFile?.path ?? null}
                  onSelect={openEntry}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Editor ── */}
        <div className="flex-1 min-w-0 flex flex-col border border-border rounded-xl overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {openFile ? (
                <>
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-mono truncate">{openFile.path}</span>
                  {isDirty && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      unsaved
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Select a file to edit</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saveMsg && (
                <span
                  className={`text-xs ${saveMsg === "Saved" ? "text-emerald-600" : "text-destructive"}`}
                >
                  {saveMsg}
                </span>
              )}
              {openFile && (
                <>
                  <Button size="sm" onClick={save} disabled={openFile.saving || !isDirty}>
                    {openFile.saving ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-3.5 w-3.5" />
                    )}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpenFile(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Editor body */}
          <div className="flex-1 relative overflow-hidden">
            {fileLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : fileError ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {fileError}
              </div>
            ) : openFile ? (
              <textarea
                className="w-full h-full resize-none bg-background font-mono text-sm p-4 focus:outline-none"
                value={openFile.content}
                onChange={(e) => setOpenFile((f) => f && { ...f, content: e.target.value })}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                    e.preventDefault();
                    void save();
                  }
                  // Preserve tab indentation
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const el = e.currentTarget;
                    const start = el.selectionStart;
                    const end = el.selectionEnd;
                    const newContent =
                      openFile.content.substring(0, start) + "  " + openFile.content.substring(end);
                    setOpenFile((f) => f && { ...f, content: newContent });
                    requestAnimationFrame(() => {
                      el.selectionStart = el.selectionEnd = start + 2;
                    });
                  }
                }}
                spellCheck={false}
                lang={langFromPath(openFile.path)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Open a file from the tree to start editing
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
