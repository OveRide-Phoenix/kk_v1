"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { http } from "@/lib/http";
import { Loader2, Plus, KeyRound, RefreshCw } from "lucide-react";
import { format } from "date-fns";

type Role = {
  role_id: number;
  name: string;
  code: string;
  description?: string | null;
  is_system: boolean;
  assigned_count: number;
  created_at?: string;
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

type CustomerRecord = {
  customer_id: number;
  name: string | null;
};

const minPasswordLength = 6;

export default function AccessControlPage() {
  const { toast } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);

  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [createRoleError, setCreateRoleError] = useState<string | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberCustomerId, setNewMemberCustomerId] = useState<string>("");
  const [newMemberRoles, setNewMemberRoles] = useState<Set<number>>(new Set());
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberActive, setNewMemberActive] = useState(true);
  const [createMemberError, setCreateMemberError] = useState<string | null>(null);
  const [creatingMember, setCreatingMember] = useState(false);

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRoleIds, setEditRoleIds] = useState<Set<number>>(new Set());
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const sortedRoles = useMemo(
    () =>
      [...roles].sort((a, b) => {
        if (a.is_system && !b.is_system) return -1;
        if (!a.is_system && b.is_system) return 1;
        return a.name.localeCompare(b.name);
      }),
    [roles],
  );

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: String(customer.customer_id),
        label: `${customer.customer_id} – ${customer.name ?? "Unnamed"}`,
      })),
    [customers],
  );

  const showRoleChangeToast = (title: string) => {
    toast({
      title,
      description: "Please log out and log back in to see the updated permissions.",
    });
  };

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const res = await http.get("/api/rbac/roles");
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Unable to load roles.");
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
          assigned_count: Number(role.assigned_count ?? 0),
          created_at: role.created_at,
        })),
      );
    } catch (error) {
      setRolesError(error instanceof Error ? error.message : "Failed to load roles.");
      setRoles([]);
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
        const message = await res.text();
        throw new Error(message || "Unable to load team members.");
      }
      const payload = (await res.json()) as TeamMembersResponse;
      const list = Array.isArray(payload.team_members) ? payload.team_members : [];
      setMembers(
        list.map((member) => ({
          ...member,
          roles: Array.isArray(member.roles)
            ? member.roles.map((value) => Number(value))
            : [],
          role_codes: Array.isArray(member.role_codes)
            ? member.role_codes.filter((code): code is string => typeof code === "string")
            : [],
          role_details: Array.isArray(member.role_details)
            ? member.role_details.map((role) => ({
                role_id: Number(role.role_id),
                code: role.code,
                name: role.name,
              }))
            : [],
          admin_is_active: Boolean(member.admin_is_active),
          has_admin_password: Boolean(member.has_admin_password),
        })),
      );
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Failed to load team members.");
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const res = await http.get("/get-all-customers");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        throw new Error("Unable to load customers.");
      }
      setCustomers(
        data.map((customer: any) => ({
          customer_id: Number(customer.customer_id),
          name: customer.name ?? customer.primary_mobile ?? "Unknown",
        })),
      );
    } catch (error) {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
    void loadMembers();
    void loadCustomers();
  }, [loadRoles, loadMembers, loadCustomers]);

  const resetCreateMemberForm = () => {
    setNewMemberCustomerId("");
    setNewMemberRoles(new Set());
    setNewMemberPassword("");
    setNewMemberActive(true);
    setCreateMemberError(null);
  };

  const handleCreateMember = async () => {
    const parsedCustomerId = Number(newMemberCustomerId);
    if (!Number.isInteger(parsedCustomerId) || parsedCustomerId <= 0) {
      setCreateMemberError("Select a valid customer.");
      return;
    }
    if (newMemberRoles.size === 0) {
      setCreateMemberError("Assign at least one role.");
      return;
    }
    if (newMemberPassword && newMemberPassword.trim().length > 0 && newMemberPassword.trim().length < minPasswordLength) {
      setCreateMemberError(`Password must be at least ${minPasswordLength} characters.`);
      return;
    }

    setCreatingMember(true);
    setCreateMemberError(null);
    try {
      const res = await http.post("/api/rbac/team-members", {
        customer_id: parsedCustomerId,
        role_ids: Array.from(newMemberRoles),
        admin_password: newMemberPassword.trim() || undefined,
        admin_is_active: newMemberActive,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          body?.detail ??
          body?.message ??
          "Unable to create team member.";
        throw new Error(message);
      }
      setAddMemberOpen(false);
      resetCreateMemberForm();
      await loadMembers();
      showRoleChangeToast("Team member added");
    } catch (error) {
      setCreateMemberError(error instanceof Error ? error.message : "Failed to add team member.");
    } finally {
      setCreatingMember(false);
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
          "Unable to update access.";
        throw new Error(message);
      }
      setMembers((prev) =>
        prev.map((entry) =>
          entry.customer_id === member.customer_id
            ? { ...entry, admin_is_active: nextActive }
            : entry,
        ),
      );
      toast({
        title: nextActive ? "Access enabled" : "Access suspended",
        description: "The member may need to log in again if they are currently active.",
      });
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Failed to update status.");
    }
  };

  const openEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setEditRoleIds(new Set(member.roles));
    setEditPassword("");
    setEditActive(member.admin_is_active);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    if (editRoleIds.size === 0) {
      setEditError("Select at least one role.");
      return;
    }
    if (editPassword && editPassword.trim().length > 0 && editPassword.trim().length < minPasswordLength) {
      setEditError(`Password must be at least ${minPasswordLength} characters.`);
      return;
    }

    setSavingEdit(true);
    try {
      const res = await http.put(`/api/rbac/team-members/${editingMember.customer_id}`, {
        role_ids: Array.from(editRoleIds),
        admin_password: editPassword.trim() || undefined,
        admin_is_active: editActive,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const message =
          payload?.detail ??
          payload?.message ??
          "Unable to update team member.";
        throw new Error(message);
      }
      setEditingMember(null);
      await loadMembers();
      showRoleChangeToast("Team member updated");
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Failed to update member.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateRole = async () => {
    const trimmedName = newRoleName.trim();
    if (!trimmedName) {
      setCreateRoleError("Role name is required.");
      return;
    }

    setCreatingRole(true);
    setCreateRoleError(null);
    try {
      const isEditingRole = Boolean(editingRoleId);
      const res = editingRoleId
        ? await http.put(`/api/rbac/roles/${editingRoleId}`, {
            name: trimmedName,
            description: newRoleDescription.trim() || undefined,
          })
        : await http.post("/api/rbac/roles", {
            name: trimmedName,
            code: newRoleCode.trim() || undefined,
            description: newRoleDescription.trim() || undefined,
          });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const message =
          payload?.detail ??
          payload?.message ??
           (editingRoleId ? "Unable to update role." : "Unable to create role.");
        throw new Error(message);
      }
      setCreateRoleOpen(false);
      setEditingRoleId(null);
      setNewRoleName("");
      setNewRoleCode("");
      setNewRoleDescription("");
      await loadRoles();
      await loadMembers();
      showRoleChangeToast(isEditingRole ? "Role updated" : "Role created");
    } catch (error) {
      setCreateRoleError(
        error instanceof Error
          ? error.message
          : editingRoleId
            ? "Failed to update role."
            : "Failed to create role."
      );
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system || role.code === "admin" || role.code === "developer") {
      toast({
        title: "Protected role",
        description: "The admin and developer roles cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    const confirmation = window.confirm(
      `Delete role "${role.name}"? Users assigned to this role will lose their permissions.`,
    );
    if (!confirmation) return;
    try {
      const res = await http.delete(`/api/rbac/roles/${role.role_id}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const message =
          payload?.detail ??
          payload?.message ??
          "Unable to delete role.";
        throw new Error(message);
      }
      await loadRoles();
      await loadMembers();
      showRoleChangeToast("Role deleted");
    } catch (error) {
      setRolesError(error instanceof Error ? error.message : "Failed to delete role.");
    }
  };

  const handleEditPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEditPassword(event.target.value);
  };

  return (
    <AdminLayout activePage="team-members">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Access Control</h1>
          <p className="text-muted-foreground">
            Manage staff access, assign roles, and review current permissions.
          </p>
        </div>

        {/* Team members table */}
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Current users with administrative or developer access.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  void loadMembers();
                  void loadRoles();
                }}
                disabled={membersLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${membersLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={() => setAddMemberOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Team Member
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {membersError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {membersError}
              </div>
            )}
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Member</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credentials</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        No team members added yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.customer_id}>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">
                              {member.name || "Unnamed Member"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {member.phone ? `+91 ${member.phone}` : "No phone on file"}
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
                                <Badge
                                  key={`${member.customer_id}-${role.role_id}`}
                                  variant={role.code === "admin" ? "default" : "secondary"}
                                >
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
                              onCheckedChange={(checked) => handleToggleActive(member, checked)}
                            />
                            <span className="text-sm text-muted-foreground">
                              {member.admin_is_active ? "Enabled" : "Suspended"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4" />
                            {member.has_admin_password ? "Password set" : "Password not set"}
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-sm text-muted-foreground">
                          {member.created_at
                            ? format(new Date(member.created_at), "d MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditMember(member)}>
                            Manage
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

        {/* Roles table */}
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                Define reusable permission bundles for team members.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void loadRoles()} disabled={rolesLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${rolesLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={() => {
                  setEditingRoleId(null);
                  setNewRoleName("");
                  setNewRoleCode("");
                  setNewRoleDescription("");
                  setCreateRoleError(null);
                  setCreateRoleOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Role
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rolesError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {rolesError}
              </div>
            )}
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
                  {rolesLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : sortedRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        No roles defined yet.
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
                        <TableCell className="text-sm text-muted-foreground">
                          {role.code}
                        </TableCell>
                        <TableCell>{role.assigned_count}</TableCell>
                        <TableCell className="max-w-[260px] text-sm text-muted-foreground">
                          {role.description ? role.description : (
                            <span className="italic text-muted-foreground/70">No description</span>
                          )}
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRoleId(role.role_id);
                              setNewRoleName(role.name);
                              setNewRoleCode(role.code);
                              setNewRoleDescription(role.description ?? "");
                              setCreateRoleError(null);
                              setCreateRoleOpen(true);
                            }}
                            disabled={role.is_system}
                          >
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

      {/* Add team member dialog */}
      <Dialog open={addMemberOpen} onOpenChange={(open) => {
        setAddMemberOpen(open);
        if (!open) {
          resetCreateMemberForm();
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <CardDescription>
              Assign a customer record to administrative or developer roles.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="member-customer" className="text-sm font-medium">
                Customer
              </label>
              <Select
                value={newMemberCustomerId}
                onValueChange={(value) => setNewMemberCustomerId(value)}
                disabled={customersLoading}
              >
                <SelectTrigger id="member-customer">
                  <SelectValue placeholder={customersLoading ? "Loading customers…" : "Select customer"} />
                </SelectTrigger>
                <SelectContent>
                  {customerOptions.map((customer) => (
                    <SelectItem key={customer.value} value={customer.value}>
                      {customer.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign Roles</label>
              <div className="grid gap-2 md:grid-cols-2">
                {sortedRoles.map((role) => (
                  <label
                    key={`create-role-${role.role_id}`}
                    className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                  >
                    <Checkbox
                      checked={newMemberRoles.has(role.role_id)}
                      onCheckedChange={() => {
                        setNewMemberRoles((prev) => {
                          const next = new Set(prev);
                          if (next.has(role.role_id)) {
                            next.delete(role.role_id);
                          } else {
                            next.add(role.role_id);
                          }
                          return next;
                        });
                      }}
                    />
                    <div className="flex flex-col">
                      <span>{role.name}</span>
                      <span className="text-xs text-muted-foreground">{role.code}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="member-password" className="text-sm font-medium">
                  Admin Password (optional)
                </label>
                <Input
                  id="member-password"
                  type="password"
                  value={newMemberPassword}
                  onChange={(event) => setNewMemberPassword(event.target.value)}
                  placeholder="Set or reset admin password"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to send login without a password reset.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <span className="text-sm font-medium">Sign-in Enabled</span>
                  <p className="text-xs text-muted-foreground">
                    Toggle to allow the member to sign in immediately.
                  </p>
                </div>
                <Switch checked={newMemberActive} onCheckedChange={setNewMemberActive} />
              </div>
            </div>
            {createMemberError && (
              <div className="text-sm text-destructive">{createMemberError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMember} disabled={creatingMember}>
              {creatingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / edit role dialog */}
      <Dialog
        open={createRoleOpen}
        onOpenChange={(open) => {
          setCreateRoleOpen(open);
          if (!open) {
            setEditingRoleId(null);
            setNewRoleName("");
            setNewRoleCode("");
            setNewRoleDescription("");
            setCreateRoleError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoleId ? "Edit Role" : "Create Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="role-name" className="text-sm font-medium">
                Role name
              </label>
              <Input
                id="role-name"
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                placeholder="e.g. Kitchen Supervisor"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="role-code" className="text-sm font-medium">
                Role code (optional)
              </label>
              <Input
                id="role-code"
                value={newRoleCode}
                onChange={(event) => setNewRoleCode(event.target.value)}
                disabled={Boolean(editingRoleId)}
                placeholder="Slug used internally"
              />
              {editingRoleId && (
                <p className="text-xs text-muted-foreground">
                  Role codes cannot be changed once created.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="role-description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="role-description"
                value={newRoleDescription}
                onChange={(event) => setNewRoleDescription(event.target.value)}
                placeholder="Describe the responsibilities or access granted"
              />
            </div>
            {createRoleError && (
              <div className="text-sm text-destructive">{createRoleError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateRoleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={creatingRole}>
              {creatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRoleId ? "Save Changes" : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage team member dialog */}
      <Dialog open={Boolean(editingMember)} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage Team Member</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">{editingMember.name || "Member"}</p>
                <p className="text-sm text-muted-foreground">
                  ID {editingMember.customer_id}
                  {editingMember.phone ? ` · +91 ${editingMember.phone}` : ""}
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Roles</span>
                <div className="grid gap-2 md:grid-cols-2">
                  {sortedRoles.map((role) => (
                    <label
                      key={`edit-role-${role.role_id}`}
                      className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                    >
                      <Checkbox
                        checked={editRoleIds.has(role.role_id)}
                        onCheckedChange={() => {
                          setEditRoleIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(role.role_id)) {
                              next.delete(role.role_id);
                            } else {
                              next.add(role.role_id);
                            }
                            return next;
                          });
                        }}
                      />
                      <div className="flex flex-col">
                        <span>{role.name}</span>
                        <span className="text-xs text-muted-foreground">{role.code}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="edit-password" className="text-sm font-medium">
                    Set new password
                  </label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={editPassword}
                    onChange={handleEditPasswordChange}
                    placeholder="Leave blank to keep unchanged"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <span className="text-sm font-medium">Sign-in Enabled</span>
                    <p className="text-xs text-muted-foreground">
                      {editActive ? "Member can sign in." : "Access is suspended."}
                    </p>
                  </div>
                  <Switch checked={editActive} onCheckedChange={setEditActive} />
                </div>
              </div>
              {editError && <div className="text-sm text-destructive">{editError}</div>}
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
