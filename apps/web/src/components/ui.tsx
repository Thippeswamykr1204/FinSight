import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

export function Button({
  children,
  variant = "solid",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "quiet" | "danger";
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  ...props
}: {
  children?: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`card ${className}`} {...props}>
      {children}
    </section>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="lede">{description}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function PasswordField({
  resetKey,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  resetKey?: string | number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);
  const selectionRef = useRef({ start: 0, end: 0 });
  useEffect(() => {
    setVisible(false);
  }, [resetKey]);
  const toggle = () => {
    const input = inputRef.current;
    if (input) {
      selectionRef.current = {
        start: input.selectionStart ?? input.value.length,
        end: input.selectionEnd ?? input.value.length,
      };
    }
    setVisible((current) => !current);
    window.requestAnimationFrame(() => {
      const nextInput = inputRef.current;
      if (!nextInput) return;
      nextInput.focus();
      nextInput.setSelectionRange(
        selectionRef.current.start,
        selectionRef.current.end,
      );
    });
  };
  return (
    <span className="password-control">
      <input {...props} ref={inputRef} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onMouseDown={(event) => event.preventDefault()}
        onPointerDown={(event) => event.preventDefault()}
        onClick={toggle}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </span>
  );
}

export function LinkButton({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link className={`button button-solid ${className}`} to={to}>
      {children}
    </Link>
  );
}

export function Money({
  value,
  signed = false,
}: {
  value: number;
  signed?: boolean;
}) {
  const amount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value / 100);
  return (
    <span className="tabular">
      {signed && value > 0 ? "+" : ""}
      {amount}
    </span>
  );
}
