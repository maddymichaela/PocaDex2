import { Check, Crown } from 'lucide-react';

const FREE_FEATURES = [
  'Up to 200 tracked cards',
  '1 binder',
  'Basic filters',
  'Basic upload',
  'Public profile',
  'Follow friends',
  'Global search',
];

const PRO_FEATURES = [
  'Unlimited tracked cards',
  'Multiple binders',
  'Import from Grid',
  'Bulk edit',
  'Advanced filters later',
  'Advanced image editor later',
  'Enhanced profile customization later',
];

function PlanColumn({ title, price, features, highlighted = false }: {
  title: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <section className={`rounded-[32px] border-2 p-6 shadow-sm ${highlighted ? 'border-primary/25 bg-primary/5' : 'border-white bg-white/80'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-foreground/45">{price}</p>
        </div>
        {highlighted && (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <Crown size={19} />
          </div>
        )}
      </div>

      <ul className="mt-6 space-y-3">
        {features.map(feature => (
          <li key={feature} className="flex items-start gap-3 text-sm font-semibold text-foreground/65">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check size={12} />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={highlighted}
        className={`mt-8 w-full rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest transition-all ${highlighted ? 'cursor-not-allowed bg-gray-100 text-foreground/30' : 'bg-white text-primary ring-2 ring-primary/15 hover:bg-primary/5'}`}
      >
        {highlighted ? 'Payments coming soon' : 'Current Free Plan'}
      </button>
    </section>
  );
}

export default function Pricing() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 pb-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Plans</h1>
        <p className="max-w-2xl text-sm font-medium leading-6 text-foreground/50">
          PocaDex Pro is being staged before payments go live. You can preview the plan split now; checkout is not connected yet.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PlanColumn title="Free" price="$0 for everyday collecting" features={FREE_FEATURES} />
        <PlanColumn title="Pro" price="Pricing placeholder" features={PRO_FEATURES} highlighted />
      </div>
    </div>
  );
}
