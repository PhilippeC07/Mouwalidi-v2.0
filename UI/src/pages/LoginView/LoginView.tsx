import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Zap, AlertCircle, Loader, Eye, EyeOff, Gauge, MapPin, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginView.module.css';

const CIRCUIT_PATHS = [
  { d: 'M-20,90 L160,90 L160,200 L340,200 L340,110 L560,110', color: '#fbbf24', duration: 2.4, delay: 0 },
  { d: 'M-20,260 L120,260 L120,360 L300,360', color: '#60a5fa', duration: 2.8, delay: 0.5 },
  { d: 'M-20,480 L200,480 L200,560 L60,560 L60,650', color: '#34d399', duration: 3.2, delay: 1.1 },
  { d: 'M-20,760 L180,760 L180,680 L380,680', color: '#fbbf24', duration: 2.6, delay: 0.8 },
  { d: 'M1620,80 L1440,80 L1440,190 L1260,190', color: '#60a5fa', duration: 2.5, delay: 0.3 },
  { d: 'M1620,300 L1480,300 L1480,400 L1300,400 L1300,500', color: '#34d399', duration: 3.0, delay: 1.4 },
  { d: 'M1620,560 L1420,560 L1420,480 L1250,480', color: '#fbbf24', duration: 2.7, delay: 0.9 },
  { d: 'M1620,760 L1400,760 L1400,660 L1180,660', color: '#60a5fa', duration: 2.9, delay: 0.2 },
  { d: 'M700,-20 L700,60 L800,60 L800,140', color: '#34d399', duration: 2.3, delay: 1.6 },
  { d: 'M900,940 L900,860 L820,860 L820,780', color: '#fbbf24', duration: 2.5, delay: 1.0 },
  // Traces that run straight through the center, disappearing behind the card
  { d: 'M420,180 L420,400 L620,400 L620,900', color: '#60a5fa', duration: 3.3, delay: 0.2 },
  { d: 'M1180,220 L1180,420 L980,420 L980,900', color: '#fbbf24', duration: 3.1, delay: 0.7 },
  { d: 'M550,-20 L550,140 L800,140 L800,300', color: '#34d399', duration: 2.6, delay: 1.2 },
  { d: 'M1050,-20 L1050,180 L850,180 L850,320', color: '#60a5fa', duration: 2.9, delay: 0.4 },
  { d: 'M300,700 L500,700 L500,860 L780,860', color: '#fbbf24', duration: 2.7, delay: 1.5 },
  { d: 'M1300,680 L1100,680 L1100,840 L820,840', color: '#34d399', duration: 3.0, delay: 0.6 },
] as const;

const CIRCUIT_NODES = [
  { cx: 160, cy: 90, color: '#fbbf24', delay: 0 },
  { cx: 340, cy: 200, color: '#fbbf24', delay: 0.5 },
  { cx: 120, cy: 260, color: '#60a5fa', delay: 1 },
  { cx: 200, cy: 480, color: '#34d399', delay: 0.3 },
  { cx: 60, cy: 560, color: '#34d399', delay: 1.3 },
  { cx: 180, cy: 760, color: '#fbbf24', delay: 0.7 },
  { cx: 1440, cy: 80, color: '#60a5fa', delay: 0.4 },
  { cx: 1300, cy: 400, color: '#34d399', delay: 1.1 },
  { cx: 1420, cy: 560, color: '#fbbf24', delay: 0.6 },
  { cx: 1400, cy: 760, color: '#60a5fa', delay: 0.9 },
  { cx: 420, cy: 400, color: '#60a5fa', delay: 0.2 },
  { cx: 1180, cy: 420, color: '#fbbf24', delay: 0.9 },
  { cx: 800, cy: 140, color: '#34d399', delay: 1.4 },
  { cx: 850, cy: 180, color: '#60a5fa', delay: 0.5 },
  { cx: 500, cy: 700, color: '#fbbf24', delay: 1.1 },
  { cx: 1100, cy: 680, color: '#34d399', delay: 0.3 },
] as const;

const FEATURES = [
  { icon: Gauge, label: 'Automated meter billing' },
  { icon: MapPin, label: 'Multi-region oversight' },
  { icon: UserCircle2, label: 'Customer self-service' },
] as const;

export function LoginView() {
  const { user, loading: authLoading, login } = useAuth();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.glowOrb} ${styles.glowOrbAmber}`} />
      <div className={`${styles.glowOrb} ${styles.glowOrbBlue}`} />
      <div className={`${styles.glowOrb} ${styles.glowOrbGreen}`} />

      <svg
        className={styles.circuitSvg}
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {CIRCUIT_PATHS.map((p, i) => (
          <path key={`base-${i}`} d={p.d} className={styles.traceBase} stroke={p.color} />
        ))}
        {CIRCUIT_PATHS.map((p, i) => (
          <path
            key={`pulse-${i}`}
            d={p.d}
            className={styles.tracePulse}
            stroke={p.color}
            style={{ animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }}
          />
        ))}
        {CIRCUIT_NODES.map((n, i) => (
          <circle
            key={i}
            cx={n.cx}
            cy={n.cy}
            r={5}
            className={styles.nodeDot}
            fill={n.color}
            style={{ animationDelay: `${n.delay}s`, color: n.color }}
          />
        ))}
      </svg>

      <div className={styles.contentWrap}>
        <div className={styles.brandBlock}>
          <div className={styles.brandLogoRow}>
            <div className={styles.brandLogoIcon}>
              <Zap size={20} color="#030712" />
            </div>
            <span className={styles.brandLogoName}>Mouwalidi</span>
          </div>
          <h2 className={styles.headline}>Power, metered and managed.</h2>
          <p className={styles.tagline}>
            Track generators, bill customers, and keep every region in sync — all from one place.
          </p>
        </div>

        <div className={styles.card}>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.subtitle}>Use your account credentials to continue.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Password</label>
              <div className={styles.passwordRow}>
                <input
                  id="password"
                  className={styles.input}
                  style={{ width: '100%' }}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className={styles.error}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={submitting || !email || !password}>
              {submitting ? <><Loader size={14} className={styles.spin} /> Signing in…</> : 'Sign in'}
            </button>
          </form>
        </div>

        <div className={styles.featureRow}>
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className={styles.featureChip}>
              <Icon size={13} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
