"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Settings2, Users2, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { http } from "@/lib/http";

type Role = {
  role_id: number;
  name: string;
  code: string;
  description?: string | null;
  is_system: boolean;
};

type TeamMember = {
  customer_id: number;
  name: string | null;
  phone: string | null;
  email?: string | null;
  roles: number[];
  role_codes: string[];
  role_details: Array<{ role_id: number; code: string; name: string }>;
  admin_is_active: boolean;
  has_admin_password: boolean;
  created_at?: string;
};

type TeamMembersResponse = {
  team_members: TeamMember[];
};

type RolesResponse = {
  roles: Array<Role & { assigned_count?: number }>;
};

const minPasswordLength = 6;

export default function TeamMembersPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesLoading, setRolesLoading] = useState(true);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [createCustomerId, setCreateCustomerId] = useState("");
  const [createRoleIds, setCreateRoleIds] = useState<Set<number>>(new Set());
  const [createPassword, setCreatePassword] = useState("");
  const [createActive, setCreateActive] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRoleIds, setEditRoleIds] = useState<Set<number>>(new Set());
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const adminRoleId = useMemo(() => {
    return roles.find((role) => role.code === "admin")?.role_id ?? null;
  }, [roles]);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const res = await http.get("/api/rbac/roles");
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Unable to load roles");
      }
      const payload = (await res.json()) as RolesResponse;
      const list = Array.isArray(payload.roles) ? payload.roles : [];
      setRoles(
        list.map((role) => ({
          role_id: role.role_id,
          name: role.name,
          code: role.code,
          description: role.description,
          is_system: Boolean(role.is_system),
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load roles";
      setRolesError(message);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    try {
      const res = await http.get("/api/rbac/team-members");
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Unable to load team members");
      }
      const payload = (await res.json()) as TeamMembersResponse;
      const list = Array.isArray(payload.team_members)
        ? payload.team_members
        : [];
      setMembers(
        list.map((member) => ({
          ...member,
          roles: Array.isArray(member.roles)
            ? member.roles.map((value) => Number(value))
            : [],
          role_codes: Array.isArray(member.role_codes)
            ? member.role_codes.filter(
                (code): code is string => typeof code === "string",
              )
            : [],
          role_details: Array.isArray(member.role_details)
            ? member.role_details.map((detail) => ({
                role_id: Number(detail.role_id),
                code: detail.code,
                name: detail.name,
              }))
            : [],
          admin_is_active: Boolean(member.admin_is_active),
          has_admin_password: Boolean(member.has_admin_password),
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load team members";
      setMembersError(message);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
    loadMembers();
  }, [loadRoles, loadMembers]);

  const toggleCreateRole = (roleId: number) => {
    setCreateRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const toggleEditRole = (roleId: number) => {
    setEditRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const handleCreateMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const customerId = Number(createCustomerId);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      setCreateError("Please provide a valid customer ID.");
      return;
    }
    if (createRoleIds.size === 0) {
      setCreateError("Select at least one role to assign.");
      return;
    }
    if (createPassword && createPassword.trim().length < minPasswordLength) {
      setCreateError(
        `Passwords must be at least ${minPasswordLength} characters.`,
      );
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const res = await http.post("/api/rbac/team-members", {
        customer_id: customerId,
        role_ids: Array.from(createRoleIds),
        admin_password: createPassword.trim() || undefined,
        admin_is_active: createActive,
      });
      const payload = res.ok ? await res.json() : await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          payload?.detail ??
          payload?.message ??
          "Unable to create team member.";
        throw new Error(message);
      }
      setCreateCustomerId("");
      setCreateRoleIds(new Set());
      setCreatePassword("");
      setCreateActive(true);
      await loadMembers();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create team member.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (member: TeamMember, nextActive: boolean) => {
    try {
      const res = await http.put(`/api/rbac/team-members/${member.customer_id}`, {
        role_ids: member.roles,
        admin_is_active: nextActive,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const message =
          payload?.detail ??
          payload?.message ??
          "Unable to update member status.";
        throw new Error(message);
      }
      setMembers((prev) =>
        prev.map((item) =>
          item.customer_id === member.customer_id
            ? { ...item, admin_is_active: nextActive }
            : item,
        ),
      );
    } catch (error) {
      setMembersError(
        error instanceof Error ? error.message : "Failed to update status.",
      );
    }
  };

  const openEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setEditRoleIds(new Set(member.roles ?? []));
    setEditActive(member.admin_is_active);
    setEditPassword("");
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    if (editRoleIds.size === 0) {
      setEditError("Select at least one role.");
      return;
    }
    if (editPassword && editPassword.trim().length > 0 && editPassword.trim().length < minPasswordLength) {
      setEditError(
        `Passwords must be at least ${minPasswordLength} characters.`,
      );
      return;
    }
    setEditError(null);
    setSavingEdit(true);
    try {
      const res = await http.put(`/api/rbac/team-members/${editingMember.customer_id}`, {
        role_ids: Array.from(editRoleIds),
        admin_password: editPassword.trim() || undefined,
        admin_is_active: editActive,
      });
      const payload = res.ok ? await res.json() : await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          payload?.detail ??
          payload?.message ??
          "Unable to update team member.";
        throw new Error(message);
      }
      setEditingMember(null);
      await loadMembers();
    } catch (error) {
      setEditError(
        error instanceof Error
          ? error.message
          : "Failed to update team member.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePasswordInput = (event: ChangeEvent<HTMLInputElement>) => {
    setEditPassword(event.target.value);
  };

  return (
    <AdminLayout activePage="team-members">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Team Members & Access
            </h1>
            <p className="text-muted-foreground">
              Assign roles, manage credentials, and monitor platform access.
            </p>
          </div>
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => {
              loadMembers();
              loadRoles();
            }}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                membersLoading || rolesLoading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Users2 className="h-5 w-5 text-primary" />
              Add Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreateMember}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="team-member-id">Customer ID</Label>
                <Input
                  id="team-member-id"
                  value={createCustomerId}
                  onChange={(event) => setCreateCustomerId(event.target.value)}
                  placeholder="Enter customer ID"
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Assign Roles</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {rolesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading roles…</p>
                  ) : rolesError ? (
                    <p className="text-sm text-destructive">{rolesError}</p>
                  ) : roles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No roles available. Create roles first.
                    </p>
                  ) : (
                    roles.map((role) => (
                      <label
                        key={role.role_id}
                        className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                      >
                        <Checkbox
                          checked={createRoleIds.has(role.role_id)}
                          onCheckedChange={() => toggleCreateRole(role.role_id)}
                        />
                        <div className="flex flex-col">
                          <span>{role.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {role.code}
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-member-password">Admin Password</Label>
                <Input
                  id="team-member-password"
                  type="password"
                  value={createPassword}
                  onChange={(event) => setCreatePassword(event.target.value)}
                  placeholder="Optional password"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to create without a password. Minimum {minPasswordLength} characters.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <Label className="text-sm font-medium">Sign-in Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, the member can log in with their assigned roles.
                  </p>
                </div>
                <Switch
                  checked={createActive}
                  onCheckedChange={setCreateActive}
                />
              </div>
              {createError && (
                <div className="md:col-span-4 text-sm text-destructive">
                  {createError}
                </div>
              )}
              <div className="md:col-span-4 flex justify-end">
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={creating || roles.length === 0}
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Settings2 className="h-4 w-4" />
                  Create Team Member
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {membersError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {membersError}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Current Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Member</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credentials</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[140px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center">
                        Loading team members…
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                        No team members found. Add a customer as a team member to begin.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => {
                      const hasAdminRole =
                        adminRoleId !== null && member.roles.includes(adminRoleId);
                      return (
                        <TableRow key={member.customer_id}>
                          <TableCell className="align-top">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold">
                                {member.name || "Unnamed"}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {member.phone ? `+91 ${member.phone}` : "–"}
                              </span>
                              {member.email && (
                                <span className="text-xs text-muted-foreground">
                                  {member.email}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-wrap gap-1">
                              {member.role_details.length === 0 ? (
                                <Badge variant="outline">No roles</Badge>
                              ) : (
                                member.role_details.map((role) => (
                                  <Badge key={`${member.customer_id}-${role.role_id}`} variant={role.code === "admin" ? "default" : "secondary"}>
                                    {role.name}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={member.admin_is_active}
                                onCheckedChange={(checked) =>
                                  handleToggleActive(member, checked)
                                }
                              />
                              <span className="text-sm text-muted-foreground">
                                {member.admin_is_active ? "Active" : "Suspended"}
                              </span>
                            </div>
                            {hasAdminRole && (
                              <p className="mt-1 text-xs text-primary">
                                Admin-level access
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="align-top text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <KeyRound className="h-4 w-4" />
                              {member.has_admin_password
                                ? "Password set"
                                : "Password not set"}
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-sm text-muted-foreground">
                            {member.created_at
                              ? format(new Date(member.created_at), "d MMM yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell className="align-top text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditMember(member)}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(editingMember)}
        onOpenChange={(open) => {
          if (!open) setEditingMember(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Team Member</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold">{editingMember.name || "Member"}</h3>
                <p className="text-sm text-muted-foreground">
                  ID {editingMember.customer_id} •{" "}
                  {editingMember.phone ? `+91 ${editingMember.phone}` : "No phone"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {roles.map((role) => (
                    <label
                      key={`edit-${role.role_id}`}
                      className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                    >
                      <Checkbox
                        checked={editRoleIds.has(role.role_id)}
                        onCheckedChange={() => toggleEditRole(role.role_id)}
                      />
                      <div className="flex flex-col">
                        <span>{role.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {role.code}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-password">Set New Password</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={editPassword}
                    onChange={handlePasswordInput}
                    placeholder="Leave blank to keep current password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a new password or leave blank to keep unchanged.
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <Label className="text-sm font-medium">Sign-in Enabled</Label>
                    <p className="text-xs text-muted-foreground">
                      {editActive
                        ? "The member can sign in with current roles."
                        : "Access is suspended until re-enabled."}
                    </p>
                  </div>
                  <Switch
                    checked={editActive}
                    onCheckedChange={setEditActive}
                  />
                </div>
              </div>
            {editError && (
              <div className="text-sm text-destructive">{editError}</div>
            )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
