import { useEffect, useState, type FormEvent } from "react";
import { useAuthProvider, useLogin } from "ra-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { allowedEmailDomain } from "./authConfig";
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  getOtpErrorMessage,
  isAllowedEmail,
  isValidOtpCode,
  normalizeEmail,
} from "./emailOtp";

type AuthProviderWithOtp = {
  sendLoginCode?: (email: string) => Promise<void>;
};

/**
 * Passwordless sign-in: enter a work email, receive a one-time code by
 * email, type it in. Only addresses on the allowed domain are accepted.
 */
export const OtpLoginForm = ({ redirectTo }: { redirectTo?: string }) => {
  const authProvider = useAuthProvider() as AuthProviderWithOtp | undefined;
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    if (!isAllowedEmail(email, allowedEmailDomain)) {
      setError(
        allowedEmailDomain
          ? `Use your @${allowedEmailDomain} email address.`
          : "Enter a valid email address.",
      );
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await authProvider?.sendLoginCode?.(email);
      setStep("code");
      setCode("");
      setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    } catch (sendError: unknown) {
      setError(getOtpErrorMessage(sendError, allowedEmailDomain));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendCode();
  };

  const handleCodeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidOtpCode(code)) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await login({ email: normalizeEmail(email), otp: code }, redirectTo);
    } catch (verifyError: unknown) {
      setError(getOtpErrorMessage(verifyError, allowedEmailDomain));
      setIsSubmitting(false);
    }
  };

  if (step === "email") {
    return (
      <form className="space-y-6" onSubmit={handleEmailSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="otp-email">Work email</Label>
          <Input
            id="otp-email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder={
              allowedEmailDomain ? `name@${allowedEmailDomain}` : undefined
            }
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={!!error}
          />
          <p className="text-xs text-muted-foreground">
            We'll email you a one-time sign-in code. No password needed.
          </p>
        </div>
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending code…" : "Email me a code"}
        </Button>
      </form>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleCodeSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="otp-code">Sign-in code</Label>
        <Input
          id="otp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={10}
          placeholder="123456"
          className="tracking-[0.4em] text-center text-lg"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          aria-invalid={!!error}
        />
        <p className="text-xs text-muted-foreground">
          Sent to <span className="font-medium">{normalizeEmail(email)}</span>.
          Check your inbox (and spam folder).
        </p>
      </div>
      <FormError message={error} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Verifying…" : "Sign in"}
      </Button>
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="hover:underline text-muted-foreground"
          onClick={() => {
            setStep("email");
            setError(null);
          }}
        >
          Use a different email
        </button>
        <button
          type="button"
          className="hover:underline disabled:opacity-50 disabled:no-underline"
          disabled={cooldown > 0 || isSubmitting}
          onClick={() => void sendCode()}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
};

const FormError = ({ message }: { message: string | null }) =>
  message ? (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
