"use client";

import { useActionState } from "react";
import Image from "next/image";
import { ArrowRight, Mail, Lock, ShieldCheck } from "lucide-react";
import { signIn } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, null);

  return <div className="login-screen">
    <Image src="/login/login-bg.jpg" alt="" fill priority sizes="100vw" className="login-bg" />
    <div className="login-panel">
      <Image src="/brand/bancoagricola-logo.png" alt="Bancoagrícola" width={218} height={61} priority className="login-logo" />

      <form className="login-card" action={formAction}>
        <h1>Bienvenido de nuevo</h1>
        <p>Ingresa con tu cuenta del equipo para ver la cartera en riesgo y gestionar intervenciones.</p>
        <input type="hidden" name="next" value={next} />
        <label>Correo
          <span className="login-input"><Mail size={15} /><input name="email" type="email" required autoComplete="email" placeholder="ventas@demo.test" /></span>
        </label>
        <label>Contraseña
          <span className="login-input"><Lock size={15} /><input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" /></span>
        </label>
        {state?.error && <div className="login-error" role="alert">{state.error}</div>}
        <Button type="submit" disabled={pending} className="login-submit">{pending ? "Ingresando…" : "Ingresar"}{!pending && <ArrowRight size={16} />}</Button>
      </form>

      <p className="login-note"><ShieldCheck size={13} /> Acceso de demostración · Entropía Hack 2026 · Datos ficticios.</p>
    </div>

    <div className="login-visual">
      <div className="login-visual-copy">
        <span className="eyebrow">Cobranza preventiva</span>
        <h2>Detecta el riesgo antes de la mora.</h2>
      </div>
    </div>
  </div>;
}
