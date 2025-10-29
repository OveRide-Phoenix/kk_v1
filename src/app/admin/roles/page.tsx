"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { http } from "@/lib/http";

type Role = {
  role_id: number;
  name: string;
  code: string;
  description?: string | null;
  is_system: boolean;
  assigned_count: number;
  created_at?: string;
};

type RolesResponse = {
  roles: Role[];
};

const emptyForm = {
  name: "",
  code: "",
  description: "",
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [saveEditLoading, setSaveEditLoading] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setLoadingError(null);
    try {
      const res = await http.get("/api/rbac/roles");
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Failed to load roles");
      }
      const data = (await res.json()) as RolesResponse;
      const list = Array.isArray(data.roles) ? data.roles : [];
      setRoles(
        list.map((role) => ({
          ...role,
          is_system: Boolean(role.is_system),
          assigned_count: Number(role.assigned_count ?? 0),
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load roles";
      setLoadingError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleCreateRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError("Role name is required.");
      return;
    }
    setFormError(null);
    setCreating(true);
    try {
      const res = await http.post("/api/rbac/roles", {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      const payload = res.ok ? await res.json() : await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          payload?.detail ??
          payload?.message ??
          "Unable to create role. Please try again.";
        throw new Error(message);
      }
      setForm(emptyForm);
      await loadRoles();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to create role.",
      );
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setEditDescription(role.description ?? "");
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    setSaveEditLoading(true);
    try {
      const res = await http.put(`/api/rbac/roles/${editingRole.role_id}`, {
        description: editDescription.trim(),
        name: editingRole.is_system ? undefined : editingRole.name,
      });
      const payload = res.ok ? await res.json() : await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          payload?.detail ??
          payload?.message ??
          "Unable to update role details.";
        throw new Error(message);
      }
      setEditingRole(null);
      await loadRoles();
    } catch (error) {
      setLoadingError(
        error instanceof Error ? error.message : "Failed to update role.",
      );
    } finally {
      setSaveEditLoading(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system) return;
    if (role.assigned_count > 0) return;
    const confirmation = window.confirm(
      `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`,
    );
    if (!confirmation) return;
    try {
      const res = await http.delete(`/api/rbac/roles/${role.role_id}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const message =
          payload?.detail ??
          payload?.message ??
          "Failed to delete role. Ensure it is not assigned to team members.";
        throw new Error(message);
      }
      await loadRoles();
    } catch (error) {
      setLoadingError(
        error instanceof Error ? error.message : "Failed to delete role.",
      );
    }
  };

  const sortedRoles = useMemo(() => {
    return [...roles].sort((a, b) => {
      if (a.is_system && !b.is_system) return -1;
      if (!a.is_system && b.is_system) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [roles]);

  return (
    <AdminLayout activePage="roles">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Role Directory</h1>
            <p className="text-muted-foreground">
              Define and maintain the roles available within the platform.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={loadRoles}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Create New Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRole} className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="role-name" className="text-sm font-medium">
                  Role Name
                </label>
                <Input
                  id="role-name"
                  placeholder="e.g. Menu Curator"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="role-code" className="text-sm font-medium">
                  Role Code (optional)
                </label>
                <Input
                  id="role-code"
                  placeholder="Slug used internally"
                  value={form.code}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, code: event.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-3 space-y-2">
                <label htmlFor="role-description" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="role-description"
                  placeholder="Describe the responsibilities or access granted by this role."
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              {formError && (
                <div className="sm:col-span-3 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" className="gap-2" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Plus className="h-4 w-4" />
                  Add Role
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {loadingError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {loadingError}
          </div>
        )}

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold text-foreground">
              Role Directory
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              System roles are highlighted; all roles are fully manageable from here.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm">
                        Loading roles…
                      </TableCell>
                    </TableRow>
                  ) : sortedRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        No roles configured yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRoles.map((role) => (
                      <TableRow key={role.role_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {role.name}
                            {role.is_system && (
                              <Badge variant="outline" className="text-xs">
                                System
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{role.code}</TableCell>
                        <TableCell>{role.assigned_count}</TableCell>
                        <TableCell className="max-w-[260px]">
                          <div className="rounded border border-dashed border-muted-foreground/30 bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                            {role.description ? role.description : (
                              <span className="italic text-muted-foreground/70">No description provided</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(role)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={role.is_system || role.assigned_count > 0}
                            onClick={() => handleDeleteRole(role)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(editingRole)} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{editingRole?.name}</p>
              <p className="text-xs text-muted-foreground/80">{editingRole?.code}</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingRole(null)} type="button">
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={saveEditLoading}>
              {saveEditLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
