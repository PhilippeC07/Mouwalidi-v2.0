import { useEffect, useState } from 'react';
import { AlertTriangle, Loader, Smartphone } from 'lucide-react';
import {
  createSubscriptionCheckout,
  createBillingPortalSession,
  getSubscriptionStatus,
  type SubscriptionStatus,
} from '../../api/stripe/stripe.api';
import {
  getSubscriptionRecipient,
  submitSubscriptionClaim,
  type WhishRecipient,
} from '../../api/whish/whish.api';
import { useAuth } from '../../context/AuthContext';
import styles from './BillingLockedView.module.css';

export function BillingLockedView() {
  const { logout } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showWhish, setShowWhish] = useState(false);
  const [whishRecipient, setWhishRecipient] = useState<WhishRecipient | null>(null);
  const [whishLoading, setWhishLoading] = useState(false);
  const [whishReferenceNumber, setWhishReferenceNumber] = useState('');
  const [whishSubmitting, setWhishSubmitting] = useState(false);
  const [whishSubmitted, setWhishSubmitted] = useState(false);
  const [whishError, setWhishError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSubscriptionStatus()
      .then((data) => { if (!cancelled) setStatus(data); })
      .catch(() => { if (!cancelled) setError('Failed to load your subscription status.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function handleShowWhish() {
    setShowWhish(true);
    setWhishLoading(true);
    getSubscriptionRecipient()
      .then((data) => setWhishRecipient(data))
      .catch(() => setWhishRecipient(null))
      .finally(() => setWhishLoading(false));
  }

  async function handleWhishSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWhishSubmitting(true);
    setWhishError(null);
    try {
      await submitSubscriptionClaim(whishReferenceNumber.trim());
      setWhishSubmitted(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setWhishError(msg ?? 'Failed to submit payment reference.');
    } finally {
      setWhishSubmitting(false);
    }
  }

  async function handleAction() {
    setActionLoading(true);
    setError(null);
    try {
      // A canceled (or never-started) subscription has no resumable Stripe
      // Subscription object left to manage — needs a brand-new Checkout
      // session. Anything else (e.g. past_due) still has one, so the hosted
      // Billing Portal can surface "update payment method" / "pay now" directly.
      const needsNewCheckout = !status?.subscriptionStatus || status.subscriptionStatus === 'canceled';
      const { url } = needsNewCheckout
        ? await createSubscriptionCheckout()
        : await createBillingPortalSession();
      window.location.href = url;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to start billing session.');
      setActionLoading(false);
    }
  }

  const needsNewCheckout = !status?.subscriptionStatus || status.subscriptionStatus === 'canceled';

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <AlertTriangle size={22} />
        </div>
        <h1 className={styles.title}>Subscription required</h1>
        <p className={styles.subtitle}>
          {needsNewCheckout
            ? 'Your account needs an active subscription to use Mouwalidi. Subscribe to regain access.'
            : 'Your subscription payment needs attention. Reactivate billing to regain access.'}
        </p>

        {!loading && status?.subscriptionStatus && (
          <span className={styles.statusBadge}>{status.subscriptionStatus.replace('_', ' ')}</span>
        )}

        {error && (
          <div className={styles.error}>
            <AlertTriangle size={13} />
            {error}
          </div>
        )}

        <button className={styles.actionBtn} onClick={handleAction} disabled={loading || actionLoading}>
          {actionLoading ? <><Loader size={14} className={styles.spin} /> Redirecting…</> : needsNewCheckout ? 'Subscribe now' : 'Reactivate billing'}
        </button>

        {!showWhish && (
          <button className={styles.secondaryBtn} onClick={handleShowWhish}>
            <Smartphone size={14} />
            Pay via Whish Money instead
          </button>
        )}

        {showWhish && (
          <div className={styles.whishSection}>
            {whishSubmitted ? (
              <p className={styles.whishSuccess}>Submitted — awaiting confirmation.</p>
            ) : whishLoading ? (
              <p className={styles.whishInfo}>Loading…</p>
            ) : whishRecipient?.phoneNumber ? (
              <>
                <p className={styles.whishInfo}>
                  {whishRecipient.customerCount} customer{whishRecipient.customerCount !== 1 ? 's' : ''} × ${whishRecipient.pricePerCustomerUsd?.toFixed(2)} ={' '}
                  <strong>${whishRecipient.priceUsd}</strong>. Send this via the Whish app to{' '}
                  <strong>{whishRecipient.phoneNumber}</strong>, then enter your reference number below.
                </p>
                <form onSubmit={handleWhishSubmit}>
                  <input
                    className={styles.whishInput}
                    value={whishReferenceNumber}
                    onChange={(e) => setWhishReferenceNumber(e.target.value)}
                    placeholder="Whish reference number"
                    required
                  />
                  {whishError && <p className={styles.error}><AlertTriangle size={13} />{whishError}</p>}
                  <button className={styles.actionBtn} disabled={whishSubmitting || !whishReferenceNumber.trim()}>
                    {whishSubmitting ? <><Loader size={14} className={styles.spin} /> Submitting…</> : 'Submit'}
                  </button>
                </form>
              </>
            ) : (
              <p className={styles.whishInfo}>The superadmin hasn't published a Whish Money number yet.</p>
            )}
          </div>
        )}

        <button className={styles.logoutLink} onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}
