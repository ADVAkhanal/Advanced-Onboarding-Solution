import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ensureBootstrapAdmin } from "@/lib/bootstrap";
import { BRAND_FOOTER, PRODUCT_NAME, SHORT_NAME, TAGLINE } from "@/lib/reference-data";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  await ensureBootstrapAdmin();
  const user = await getCurrentUser();
  if (user) {
    redirect(searchParams.next ?? "/dashboard");
  }

  return (
    <main className="login-wrap">
      <section className="login-brand">
        <div>
          <div className="brand-mark">CleanOps</div>
          <div className="brand-sub">Command Center</div>
        </div>
        <div>
          <h1>{PRODUCT_NAME}</h1>
          <p>{TAGLINE}</p>
        </div>
        <div>
          <strong>{SHORT_NAME}</strong>
          <p>{BRAND_FOOTER}</p>
        </div>
      </section>
      <section className="card login-card">
        <div className="card-pad">
          <p className="eyebrow">Secure Access</p>
          <h1>Sign in</h1>
          <p className="subhead">Use your assigned CleanOps account.</p>
        </div>
        <div className="card-pad">
          <LoginForm nextPath={searchParams.next ?? "/dashboard"} />
        </div>
      </section>
    </main>
  );
}
