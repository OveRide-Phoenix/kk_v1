'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { http } from '@/lib/http';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronRight, Copy, RefreshCcw, Table } from 'lucide-react';
import { useAuthStore } from '@/store/store';

type DevSchemaTable = {
  name: string;
  kind: 'TABLE' | 'VIEW';
  ddl: string;
  columns: Array<{
    name: string | null;
    type: string | null;
    nullable: string | null;
    key: string | null;
    default: string | null;
    extra: string | null;
    comment: string | null;
  }>;
};

type DevSchemaResponse = {
  schema: string;
  generated_at: string;
  tables: DevSchemaTable[];
};

const DEFAULT_SCHEMA = 'kk_v1';

function DBSchemaContent() {
  const { toast } = useToast();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<DevSchemaResponse | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sqlVisible, setSqlVisible] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const loadSchema = useCallback(
    async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams();
        params.set('schema', DEFAULT_SCHEMA);
        params.set('includeViews', 'true');
        const response = await http.get(`/api/dev/db-schema?${params.toString()}`);
        const payload = await response.json();

        if (!response.ok) {
          const status = response.status;
          if (status === 401 || status === 403) {
            setData(null);
            setExpanded({});
            setErrorMessage(
              'You are not authorized to view the database schema. Please check your permissions or log in as an admin.',
            );
            return;
          }
          const detail =
            typeof payload?.detail === 'string' && payload.detail.trim().length > 0
              ? payload.detail
              : 'Failed to load schema metadata';
          throw new Error(detail);
        }

        const schemaPayload = payload as DevSchemaResponse;
        setData(schemaPayload);
        setExpanded(
          schemaPayload.tables.reduce<Record<string, boolean>>((acc, table) => {
            acc[table.name] = true;
            return acc;
          }, {}),
        );
        setSqlVisible(
          schemaPayload.tables.reduce<Record<string, boolean>>((acc, table) => {
            acc[table.name] = false;
            return acc;
          }, {}),
        );
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unexpected error');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isAdmin) {
      setData(null);
      setExpanded({});
      setSqlVisible({});
      setErrorMessage('Admin access required to view the database schema.');
      return;
    }
    setErrorMessage(null);
    void loadSchema();
  }, [isAdmin, isHydrated, loadSchema]);

  const filteredTables = useMemo(() => {
    if (!data) return [];
    const query = searchTerm.trim().toLowerCase();
    if (query.length === 0) {
      return data.tables;
    }
    return data.tables.filter((entry) => entry.name.toLowerCase().includes(query));
  }, [data, searchTerm]);

  const handleRefresh = useCallback(() => {
    if (!isAdmin) return;
    void loadSchema();
  }, [isAdmin, loadSchema]);

  const handleCopySingle = useCallback(
    async (table: DevSchemaTable) => {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        toast({
          title: 'Clipboard unavailable',
          description: 'Copy is not supported in this environment.',
          variant: 'destructive',
        });
        return;
      }
      try {
        await navigator.clipboard.writeText(`${table.ddl.trimEnd()}\n`);
        toast({
          title: 'Copied',
          description: `${table.name} DDL copied to clipboard.`,
        });
      } catch (error) {
        toast({
          title: 'Copy failed',
          description: error instanceof Error ? error.message : 'Unable to copy DDL.',
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  const handleCopyAll = useCallback(async () => {
    if (!filteredTables.length) {
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      toast({
        title: 'Clipboard unavailable',
        description: 'Copy is not supported in this environment.',
        variant: 'destructive',
      });
      return;
    }
    const payload = filteredTables
      .map((table) => table.ddl.trimEnd())
      .join('\n\n')
      .concat('\n');
    try {
      await navigator.clipboard.writeText(payload);
      toast({
        title: 'Copied',
        description: `Copied ${filteredTables.length} ${filteredTables.length === 1 ? 'object' : 'objects'} to clipboard.`,
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: error instanceof Error ? error.message : 'Unable to copy DDL.',
        variant: 'destructive',
      });
    }
  }, [filteredTables, toast]);

  const toggleTable = useCallback((name: string) => {
    setExpanded((prev) => ({
      ...prev,
      [name]: !(prev[name] ?? true),
    }));
  }, []);

  const toggleSql = useCallback((name: string, next: boolean) => {
    setSqlVisible((prev) => ({
      ...prev,
      [name]: next,
    }));
  }, []);

  const activeSchema = data?.schema ?? '';
  const generatedAt = useMemo(() => {
    if (!data?.generated_at) return null;
    const date = new Date(data.generated_at);
    if (Number.isNaN(date.getTime())) {
      return data.generated_at;
    }
    return date.toLocaleString();
  }, [data]);

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>DB Schema</CardTitle>
            <CardDescription>Initializing developer tools…</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <CardTitle>DB Schema</CardTitle>
            <CardDescription>Read-only access to table and view definitions for developers.</CardDescription>
            <p className="text-xs text-muted-foreground">
              Active schema:{' '}
              <span className="font-medium text-foreground">{activeSchema || DEFAULT_SCHEMA}</span>
              {generatedAt ? ` · Generated ${generatedAt}` : null}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              Showing all tables and views for{' '}
              <span className="font-medium text-foreground">{activeSchema || DEFAULT_SCHEMA}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={isLoading || !isAdmin}>
                <RefreshCcw className={cn('mr-2 h-4 w-4', isLoading ? 'animate-spin' : undefined)} />
                {isLoading ? 'Refreshing…' : 'Refresh'}
              </Button>
              <Button onClick={handleCopyAll} disabled={!isAdmin || filteredTables.length === 0}>
                Copy All
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Filter tables…"
            className="max-w-md"
          />

          {errorMessage && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {!errorMessage && !filteredTables.length && (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {isLoading ? 'Loading schema metadata…' : 'No tables match the current filters.'}
            </div>
          )}

            <div className="space-y-3">
              {filteredTables.map((table) => {
                const isOpen = expanded[table.name] ?? true;
                const sqlEnabled = sqlVisible[table.name] ?? false;
                const columns = table.columns ?? [];
                return (
                  <div key={table.name} className="rounded-lg border border-border bg-card/60">
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => toggleTable(table.name)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleTable(table.name);
                        }
                      }}
                      aria-expanded={isOpen}
                      aria-controls={`ddl-${table.name}`}
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-foreground">{table.name}</span>
                        <Badge variant="secondary" className="text-[0.65rem]">
                          {table.kind === 'TABLE' ? 'TABLE' : 'VIEW'}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCopySingle(table);
                        }}
                        aria-label={`Copy ${table.name} DDL`}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                    </div>

                    {isOpen && (
                      <div
                        id={`ddl-${table.name}`}
                        className="border-t border-border bg-muted/20 px-4 py-3"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Table className="h-4 w-4" />
                              <span>{columns.length} columns</span>
                            </div>
                            <label
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <Switch
                                id={`sql-toggle-${table.name}`}
                                checked={sqlEnabled}
                                onCheckedChange={(checked) => toggleSql(table.name, Boolean(checked))}
                              />
                              Show SQL
                            </label>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[520px] border border-border text-left text-sm">
                              <thead className="bg-muted/60">
                                <tr>
                                  <th className="border-b border-border px-3 py-2 font-semibold">Field</th>
                                  <th className="border-b border-border px-3 py-2 font-semibold">Type</th>
                                  <th className="border-b border-border px-3 py-2 font-semibold">Null</th>
                                  <th className="border-b border-border px-3 py-2 font-semibold">Key</th>
                                  <th className="border-b border-border px-3 py-2 font-semibold">Default</th>
                                  <th className="border-b border-border px-3 py-2 font-semibold">Extra</th>
                                </tr>
                              </thead>
                              <tbody>
                                {columns.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="px-3 py-3 text-center text-sm text-muted-foreground">
                                      No column metadata available.
                                    </td>
                                  </tr>
                                ) : (
                                  columns.map((column, index) => (
                                    <tr key={`${table.name}-${column.name ?? index}`} className="odd:bg-background even:bg-muted/40">
                                      <td className="border-b border-border px-3 py-2 font-mono text-xs text-foreground">
                                        {column.name ?? '—'}
                                      </td>
                                      <td className="border-b border-border px-3 py-2 font-mono text-xs text-muted-foreground">
                                        {column.type ?? '—'}
                                      </td>
                                      <td className="border-b border-border px-3 py-2 text-xs">
                                        {column.nullable ?? '—'}
                                      </td>
                                      <td className="border-b border-border px-3 py-2 text-xs">
                                        {column.key ?? '—'}
                                      </td>
                                      <td className="border-b border-border px-3 py-2 text-xs">
                                        {column.default ?? '—'}
                                      </td>
                                      <td className="border-b border-border px-3 py-2 text-xs">
                                        {column.extra ?? '—'}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {sqlEnabled && (
                            <div className="max-h-80 overflow-auto rounded-md border border-border bg-background/80 p-4">
                              <pre className="whitespace-pre text-xs font-mono text-foreground">{table.ddl}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DBSchemaPage() {
  return (
    <AdminLayout activePage="dbschema">
      <DBSchemaContent />
    </AdminLayout>
  );
}
