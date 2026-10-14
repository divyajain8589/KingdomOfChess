"use client";

import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// No look-alike characters (0/O, 1/l/I), so a password read out to a student is typed right first time.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** 12 random characters in three groups, e.g. `k7mq-x4tn-p9rb` (about 60 bits). */
export function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}

/** Password field with a show/hide toggle and, optionally, a "Generate" button that fills and reveals a strong password. */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "new-password",
  canGenerate = false,
  invalid,
  describedBy,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  canGenerate?: boolean;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          id={id}
          type={show ? "text" : "password"}
          size="lg"
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={72}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="pr-12 font-mono"
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1.5 -translate-y-1/2 active:not-aria-[haspopup]:-translate-y-1/2"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          disabled={disabled}
        >
          {show ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      {canGenerate && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={disabled}
          onClick={() => {
            onChange(generatePassword());
            setShow(true);
          }}
        >
          <Sparkles /> Generate
        </Button>
      )}
    </div>
  );
}
