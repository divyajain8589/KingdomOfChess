"use client";

import { AlertCircle, KeyRound, Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Accent, PageHeader } from "@/components/page-header";
import { PasswordInput } from "@/components/password-input";
import { PlayerAvatar } from "@/components/player-avatar";
import { RoleGate } from "@/components/role-gate";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/api";
import { type Student, useCreateStudent, useSetStudentPassword, useStudents } from "@/lib/queries";

export default function CoachStudentsPage() {
  return (
    <RoleGate role="coach">
      <CoachStudents />
    </RoleGate>
  );
}

function CoachStudents() {
  const students = useStudents();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<Student | null>(null);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = students.data ?? [];
    return q ? all.filter((s) => s.name.toLowerCase().includes(q) || s.email.includes(q)) : all;
  }, [students.data, query]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Coach dashboard"
        title={
          <>
            Your <Accent>students</Accent>
          </>
        }
        description="Create sign-ins for your students and reset a password whenever someone forgets theirs."
        actions={
          <Button size="lg" onClick={() => setAdding(true)}>
            <UserPlus /> Add student
          </Button>
        }
      />

      {students.isPending ? (
        <LoadingState rows={4} />
      ) : students.isError ? (
        <ErrorState error={students.error} onRetry={() => students.refetch()} title="Couldn't load your students" />
      ) : students.data.length === 0 ? (
        <EmptyState
          art="knight"
          title="No students yet"
          description="Add your first student. You choose their email and password, then share them."
          action={
            <Button size="lg" onClick={() => setAdding(true)}>
              <UserPlus /> Add student
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="relative sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              size="lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              aria-label="Search students"
              className="data-[size=lg]:pl-11"
            />
          </div>
          {visible.length === 0 ? (
            <p className="rounded-xl bg-surface-inset px-4 py-3 text-[14px] text-muted-foreground">
              No students match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-card shadow-card">
              {visible.map((s) => (
                <li key={s.id} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
                  <PlayerAvatar name={s.name} userId={s.id} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{s.name}</div>
                    <div className="truncate font-mono text-[12px] text-muted-foreground">{s.email}</div>
                  </div>
                  <Button variant="ghost" className="max-sm:hidden" onClick={() => setResetting(s)}>
                    <KeyRound /> Reset password
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="sm:hidden"
                    aria-label={`Reset password for ${s.name}`}
                    onClick={() => setResetting(s)}
                  >
                    <KeyRound />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[13px] text-muted-foreground">
            {students.data.length} {students.data.length === 1 ? "student" : "students"}
          </p>
        </div>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          {adding && <AddStudentForm onDone={() => setAdding(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={resetting !== null} onOpenChange={(open) => !open && setResetting(null)}>
        <DialogContent className="sm:max-w-md">
          {resetting && <ResetPasswordForm student={resetting} onDone={() => setResetting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Copy the sign-in details so the coach can paste them to the student. */
async function copySignIn(email: string, password: string) {
  try {
    await navigator.clipboard.writeText(`Kingdom of Chess sign-in\nEmail: ${email}\nPassword: ${password}`);
    toast.success("Sign-in details copied");
  } catch {
    toast.error("Couldn't copy. Please copy the details by hand.");
  }
}

function AddStudentForm({ onDone }: { onDone: () => void }) {
  const create = useCreateStudent();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Enter the student's full name.");
    if (password.length < 8) return setError("The password must be at least 8 characters.");
    try {
      const student = await create.mutateAsync({ name: name.trim(), email: email.trim(), password });
      toast.success(`${student.name} can now sign in`, {
        action: { label: "Copy sign-in", onClick: () => void copySignIn(student.email, password) },
        duration: 15_000,
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <DialogHeader>
        <p className="eyebrow">New student</p>
        <DialogTitle>Add a student</DialogTitle>
        <DialogDescription>They sign in with this email and password. You can reset the password later.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert className="border-danger/25 bg-danger-soft text-danger">
          <AlertCircle />
          <AlertDescription className="font-semibold text-danger">{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="s-name" className="text-[13px] font-bold">
          Full name
        </Label>
        <Input id="s-name" size="lg" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Ananya Rao" autoFocus required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-email" className="text-[13px] font-bold">
          Email
        </Label>
        <Input
          id="s-email"
          type="email"
          size="lg"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          placeholder="ananya@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-password" className="text-[13px] font-bold">
          Password
        </Label>
        <PasswordInput id="s-password" value={password} onChange={setPassword} canGenerate describedBy="s-password-hint" />
        <p id="s-password-hint" className="text-[12px] text-muted-foreground">
          At least 8 characters. Use Generate for a strong one.
        </p>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={create.isPending} disabled={!name || !email || !password}>
          <UserPlus /> Add student
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ student, onDone }: { student: Student; onDone: () => void }) {
  const reset = useSetStudentPassword();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("The password must be at least 8 characters.");
    try {
      await reset.mutateAsync({ id: student.id, password });
      toast.success(`New password set for ${student.name}`, {
        action: { label: "Copy sign-in", onClick: () => void copySignIn(student.email, password) },
        duration: 15_000,
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <DialogHeader>
        <p className="eyebrow">Reset password</p>
        <DialogTitle>New password for {student.name}</DialogTitle>
        <DialogDescription>
          {student.email}. Their old password stops working and they are signed out on every device.
        </DialogDescription>
      </DialogHeader>
      {error && (
        <Alert className="border-danger/25 bg-danger-soft text-danger">
          <AlertCircle />
          <AlertDescription className="font-semibold text-danger">{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="r-password" className="text-[13px] font-bold">
          New password
        </Label>
        <PasswordInput id="r-password" value={password} onChange={setPassword} canGenerate />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={reset.isPending} disabled={!password}>
          <KeyRound /> Set password
        </Button>
      </div>
    </form>
  );
}
