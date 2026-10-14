"use client";

import { AlertCircle, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/api";
import { useChangeMyPassword } from "@/lib/queries";

/** "Change password" from the account menu. Other devices are signed out; this one stays signed in. */
export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <ChangePasswordForm onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const change = useChangeMyPassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError("Your new password must be at least 8 characters.");
    if (next !== confirm) return setError("The new passwords don't match.");
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next });
      toast.success("Password changed. Other devices have been signed out.");
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <DialogHeader>
        <p className="eyebrow">Your account</p>
        <DialogTitle>Change password</DialogTitle>
        <DialogDescription>You stay signed in here. Every other device is signed out.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert className="border-danger/25 bg-danger-soft text-danger">
          <AlertCircle />
          <AlertDescription className="font-semibold text-danger">{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="cp-current" className="text-[13px] font-bold">
          Current password
        </Label>
        <PasswordInput id="cp-current" value={current} onChange={setCurrent} autoComplete="current-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cp-new" className="text-[13px] font-bold">
          New password
        </Label>
        <PasswordInput id="cp-new" value={next} onChange={setNext} describedBy="cp-new-hint" />
        <p id="cp-new-hint" className="text-[12px] text-muted-foreground">
          At least 8 characters.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cp-confirm" className="text-[13px] font-bold">
          Confirm new password
        </Label>
        <PasswordInput id="cp-confirm" value={confirm} onChange={setConfirm} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={change.isPending} disabled={!current || !next || !confirm}>
          <KeyRound /> Change password
        </Button>
      </div>
    </form>
  );
}
