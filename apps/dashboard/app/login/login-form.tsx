"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { signIn } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, null);

  return <form className="login-card" action={formAction}>
    <div className="login-mark"><ShieldCheck size={22} strokeWidth={1.6} /></div>
    <h1>Centro de Control de Prevención</h1>
    <p>Ingresa con tu cuenta del equipo para ver la cartera en riesgo y gestionar intervenciones.</p>
    <input type="hidden" name="next" value={next} />
    <label>Correo<input name="email" type="email" required autoComplete="email" placeholder="ventas@demo.test" /></label>
    <label>Contraseña<input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" /></label>
    {state?.error && <div className="login-error" role="alert">{state.error}</div>}
    <Button type="submit" disabled={pending}>{pending ? "Ingresando…" : "Ingresar"}</Button>
    <p className="login-note">Acceso de demostración · Entropía Hack 2026 · Datos ficticios.</p>
  </form>;
}
