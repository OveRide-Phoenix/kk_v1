"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileJson,
  RefreshCcw,
  Search,
  Shield,
} from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { http } from "@/lib/http";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/store";

type OpenApiTag = {
  name: string;
  description?: string;
};

type OpenApiParameter = {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  schema?: {
    type?: string;
  };
};

type OpenApiRequestBody = {
  description?: string;
  required?: boolean;
  content?: Record<string, unknown>;
};

type OpenApiResponse = {
  description?: string;
};

type OpenApiOperation = {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
  security?: Array<Record<string, unknown>>;
};

type OpenApiPathItem = Partial<Record<Lowercase<HttpMethod>, OpenApiOperation>>;

type OpenApiSpec = {
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  tags?: OpenApiTag[];
  paths?: Record<string, OpenApiPathItem>;
};

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

type EndpointEntry = {
  id: string;
  collection: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  operationId: string;
  parameterCount: number;
  requestBodyTypes: string[];
  responseCodes: string[];
  requiresAuth: boolean;
};

type EndpointCollection = {
  name: string;
  description: string;
  endpoints: EndpointEntry[];
};

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
const ALL_COLLECTIONS = "__all__";

function normalizeMethodStyles(method: HttpMethod): string {
  switch (method) {
    case "GET":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "POST":
      return "bg-sky-500/10 text-sky-700 border-sky-500/20";
    case "PUT":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "PATCH":
      return "bg-violet-500/10 text-violet-700 border-violet-500/20";
    case "DELETE":
      return "bg-rose-500/10 text-rose-700 border-rose-500/20";
    default:
      return "bg-slate-500/10 text-slate-700 border-slate-500/20";
  }
}

function buildCollections(spec: OpenApiSpec | null): EndpointCollection[] {
  if (!spec?.paths) {
    return [];
  }

  const tagDescriptions = new Map<string, string>();
  for (const tag of spec.tags ?? []) {
    if (!tag?.name) {
      continue;
    }
    tagDescriptions.set(tag.name, tag.description?.trim() ?? "");
  }

  const grouped = new Map<string, EndpointEntry[]>();

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem) {
      continue;
    }

    for (const method of METHODS) {
      const operation = pathItem[method.toLowerCase() as Lowercase<HttpMethod>];
      if (!operation) {
        continue;
      }

      const collection = operation.tags?.[0]?.trim() || "General";
      const summary =
        operation.summary?.trim() || operation.operationId?.trim() || `${method} ${path}`;
      const entry: EndpointEntry = {
        id: `${method}:${path}`,
        collection,
        method,
        path,
        summary,
        description: operation.description?.trim() ?? "",
        operationId: operation.operationId?.trim() ?? "",
        parameterCount: operation.parameters?.length ?? 0,
        requestBodyTypes: Object.keys(operation.requestBody?.content ?? {}),
        responseCodes: Object.keys(operation.responses ?? {}),
        requiresAuth: (operation.security?.length ?? 0) > 0,
      };

      const existing = grouped.get(collection) ?? [];
      existing.push(entry);
      grouped.set(collection, existing);
    }
  }

  return Array.from(grouped.entries())
    .map(([name, endpoints]) => ({
      name,
      description: tagDescriptions.get(name) ?? "",
      endpoints: endpoints.sort((left, right) => {
        if (left.path === right.path) {
          return METHODS.indexOf(left.method) - METHODS.indexOf(right.method);
        }
        return left.path.localeCompare(right.path);
      }),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function ApiDocsContent() {
  const { toast } = useToast();
  const hasDeveloperAccess = useAuthStore((state) => state.hasRole("developer"));
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCollection, setActiveCollection] = useState<string>(ALL_COLLECTIONS);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const collections = useMemo(() => buildCollections(spec), [spec]);

  const filteredCollections = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    const matchesQuery = (endpoint: EndpointEntry) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        endpoint.summary,
        endpoint.path,
        endpoint.method,
        endpoint.operationId,
        endpoint.description,
        endpoint.collection,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    };

    return collections
      .filter(
        (collection) =>
          activeCollection === ALL_COLLECTIONS || collection.name === activeCollection,
      )
      .map((collection) => ({
        ...collection,
        endpoints: collection.endpoints.filter(matchesQuery),
      }))
      .filter((collection) => collection.endpoints.length > 0);
  }, [activeCollection, collections, searchTerm]);

  const totalEndpointCount = useMemo(
    () => collections.reduce((total, collection) => total + collection.endpoints.length, 0),
    [collections],
  );

  const filteredEndpointCount = useMemo(
    () => filteredCollections.reduce((total, collection) => total + collection.endpoints.length, 0),
    [filteredCollections],
  );

  const loadSpec = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await http.get("/openapi.json");
      const payload = (await response.json()) as OpenApiSpec | { detail?: string };

      if (!response.ok) {
        const detail =
          typeof payload === "object" &&
          payload !== null &&
          "detail" in payload &&
          typeof payload.detail === "string"
            ? payload.detail
            : "Failed to load API documentation.";
        throw new Error(detail);
      }

      setSpec(payload as OpenApiSpec);
    } catch (error) {
      setSpec(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load API documentation.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!hasDeveloperAccess) {
      setErrorMessage("Developer role required to view API documentation.");
      setSpec(null);
      return;
    }

    void loadSpec();
  }, [hasDeveloperAccess, isHydrated, loadSpec]);

  const handleCopy = useCallback(
    async (value: string, label: string) => {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        toast({
          title: "Clipboard unavailable",
          description: "Copy is not supported in this environment.",
          variant: "destructive",
        });
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        toast({
          title: "Copied",
          description: `${label} copied to clipboard.`,
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: error instanceof Error ? error.message : "Unable to copy value.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((current) => ({
      ...current,
      [id]: !(current[id] ?? false),
    }));
  }, []);

  const docsTitle = spec?.info?.title?.trim() || "Kuteera Kitchen API";
  const docsVersion = spec?.info?.version?.trim() || "Unversioned";
  const docsDescription =
    spec?.info?.description?.trim() || "Swagger-style endpoint browser for developers.";

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>API Docs</CardTitle>
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
            <CardTitle>API Docs</CardTitle>
            <CardDescription>
              Browse FastAPI endpoints grouped by collection, similar to Swagger.
            </CardDescription>
            <p className="text-xs text-muted-foreground">
              {docsTitle} · v{docsVersion}
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="gap-1">
                <BookOpenText className="h-3.5 w-3.5" />
                {collections.length} collections
              </Badge>
              <Badge variant="secondary">{totalEndpointCount} endpoints</Badge>
              <span>{docsDescription}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void loadSpec()}
                disabled={isLoading || !hasDeveloperAccess}
              >
                <RefreshCcw
                  className={cn("mr-2 h-4 w-4", isLoading ? "animate-spin" : undefined)}
                />
                {isLoading ? "Refreshing…" : "Refresh"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open("/api/backend/openapi.json", "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <FileJson className="mr-2 h-4 w-4" />
                Open JSON
              </Button>
              <Button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open("/api/backend/docs", "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Swagger
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by path, summary, method, operation ID, or collection…"
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => void handleCopy("/api/backend/openapi.json", "OpenAPI URL")}
              disabled={!hasDeveloperAccess}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Docs URL
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeCollection === ALL_COLLECTIONS ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCollection(ALL_COLLECTIONS)}
            >
              All Collections
            </Button>
            {collections.map((collection) => (
              <Button
                key={collection.name}
                variant={activeCollection === collection.name ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCollection(collection.name)}
              >
                {collection.name}
                <span className="ml-2 rounded-full bg-background/70 px-2 py-0.5 text-[11px]">
                  {collection.endpoints.length}
                </span>
              </Button>
            ))}
          </div>

          {errorMessage && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {!errorMessage && filteredEndpointCount === 0 && (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {isLoading ? "Loading API documentation…" : "No endpoints match the current filters."}
            </div>
          )}

          <div className="space-y-4">
            {filteredCollections.map((collection) => (
              <section key={collection.name} className="rounded-xl border border-border bg-card/60">
                <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{collection.name}</h3>
                      <Badge variant="secondary">{collection.endpoints.length} endpoints</Badge>
                    </div>
                    {collection.description ? (
                      <p className="text-sm text-muted-foreground">{collection.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Grouped from FastAPI tags in the OpenAPI spec.
                      </p>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {collection.endpoints.map((endpoint) => {
                    const isOpen = expanded[endpoint.id] ?? false;
                    return (
                      <div key={endpoint.id} className="bg-background/40">
                        <button
                          type="button"
                          className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left hover:bg-muted/40"
                          onClick={() => toggleExpanded(endpoint.id)}
                          aria-expanded={isOpen}
                        >
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                className={cn("border", normalizeMethodStyles(endpoint.method))}
                              >
                                {endpoint.method}
                              </Badge>
                              <code className="rounded bg-muted px-2 py-1 text-xs text-foreground">
                                {endpoint.path}
                              </code>
                              {endpoint.requiresAuth && (
                                <Badge variant="outline" className="gap-1">
                                  <Shield className="h-3.5 w-3.5" />
                                  Auth
                                </Badge>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{endpoint.summary}</p>
                              <p className="text-sm text-muted-foreground">
                                {endpoint.description ||
                                  "No description provided in the OpenAPI spec."}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pl-2 text-xs text-muted-foreground">
                            <span>{endpoint.responseCodes.length} responses</span>
                            <span>{endpoint.parameterCount} params</span>
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                          </div>
                        </button>

                        {isOpen && (
                          <div className="space-y-4 border-t border-border bg-muted/20 px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void handleCopy(endpoint.path, `${endpoint.method} path`)
                                }
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Path
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void handleCopy(
                                    `${endpoint.method} ${endpoint.path}`,
                                    "Endpoint signature",
                                  )
                                }
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Signature
                              </Button>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-3">
                              <div className="space-y-2 rounded-lg border border-border bg-background/80 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Request
                                </p>
                                <div className="space-y-2 text-sm">
                                  <p>
                                    <span className="font-medium text-foreground">
                                      Operation ID:
                                    </span>{" "}
                                    <span className="font-mono text-xs">
                                      {endpoint.operationId || "Not set"}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="font-medium text-foreground">Parameters:</span>{" "}
                                    {endpoint.parameterCount}
                                  </p>
                                  <p>
                                    <span className="font-medium text-foreground">Body types:</span>{" "}
                                    {endpoint.requestBodyTypes.length
                                      ? endpoint.requestBodyTypes.join(", ")
                                      : "None"}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-2 rounded-lg border border-border bg-background/80 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Responses
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {endpoint.responseCodes.length ? (
                                    endpoint.responseCodes.map((code) => (
                                      <Badge key={`${endpoint.id}-${code}`} variant="outline">
                                        {code}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      No response metadata.
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2 rounded-lg border border-border bg-background/80 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Collection
                                </p>
                                <div className="space-y-2 text-sm">
                                  <p className="font-medium text-foreground">
                                    {endpoint.collection}
                                  </p>
                                  <p className="text-muted-foreground">
                                    This endpoint is grouped using the FastAPI tag shown in Swagger.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            <div className="rounded-lg border border-dashed border-border bg-background/60 p-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Endpoint Path
                              </p>
                              <code className="block whitespace-pre-wrap break-all font-mono text-xs text-foreground">
                                {endpoint.method} {endpoint.path}
                              </code>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDeveloperApiDocsPage() {
  return (
    <AdminLayout activePage="dev-api-docs">
      <ApiDocsContent />
    </AdminLayout>
  );
}
