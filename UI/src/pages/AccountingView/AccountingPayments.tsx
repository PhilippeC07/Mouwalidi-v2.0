import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthlyPayments, type MonthlyCustomerEntry } from '../../api/billing/billing.api';
import styles from './AccountingView.module.css';

function fmtMonth(m: string) {
  return new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function AccountingPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  function goMonth(delta: number) { setSearchParams({ month: shiftMonth(month, delta) }); }

  const [data, setData] = useState<MonthlyCustomerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    getMonthlyPayments(month)
      .then(setData)
      .catch(() => setError('Failed to load payments'))
      .finally(() => setLoading(false));
  }, [month]);

  const totalCollected = data.reduce((s, e) => s + e.amountPaid, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.pageTitle}>Payments</h1>
            <p className={styles.pageSub}>Customers who paid this month</p>
          </div>
          <div className={styles.monthPicker}>
            <button className={styles.monthPickerBtn} onClick={() => goMonth(-1)}><ChevronLeft size={14} /></button>
            <span className={styles.monthPickerLabel}>{fmtMonth(month)}</span>
            <button className={styles.monthPickerBtn} onClick={() => goMonth(1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {!loading && !error && (
        <div className={styles.kpiStrip}>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Payments Received</p>
            <p className={`${styles.kpiValue} ${styles.kpiBlue}`}>{data.length}</p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Total Collected</p>
            <p className={`${styles.kpiValue} ${styles.kpiGreen}`}>${totalCollected.toFixed(2)}</p>
          </div>
        </div>
      )}

      {loading && <p className={styles.stateErr} style={{ color: '#6b7280' }}>Loading…</p>}
      {error && <p className={styles.stateErr}>{error}</p>}

      {!loading && !error && (
        <div className={styles.content}>
          <div className={styles.tableCard}>
            <div className={styles.tableCardHeader}>
              <h2 className={styles.tableCardTitle}>Payment Records</h2>
              <span className={styles.tableCount}>{data.length} payment{data.length !== 1 ? 's' : ''}</span>
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Group</th>
                    <th>Region</th>
                    <th className={styles.right}>Billed</th>
                    <th className={styles.right}>Paid</th>
                    <th className={styles.right}>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b7280', padding: '32px' }}>No payments recorded for this month.</td></tr>
                  )}
                  {data.map((e) => (
                    <tr key={e.consumptionId}>
                      <td>
                        <Link className={styles.customerLink} to={`/customers/${e.customerId}`}>
                          {e.customerName}
                        </Link>
                      </td>
                      <td className={styles.muted}>{e.groupName}</td>
                      <td className={styles.muted}>{e.regionName}</td>
                      <td className={styles.right}>${e.balance.toFixed(2)}</td>
                      <td className={`${styles.right} ${styles.green}`}>${e.amountPaid.toFixed(2)}</td>
                      <td className={`${styles.right} ${e.remaining > 0.001 ? styles.yellow : styles.muted}`}>
                        ${e.remaining.toFixed(2)}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: e.closedBalance ? '#34d399' : '#9ca3af' }}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
