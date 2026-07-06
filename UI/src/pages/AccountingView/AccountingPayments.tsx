import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { getMonthlyPayments, type MonthlyCustomerEntry } from '../../api/billing/billing.api';
import { formatMoney } from '../../utils/format';
import { usePersistentState } from '../../hooks/usePersistentState';
import styles from './AccountingView.module.css';

function fmtMonth(m: string) {
  return new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1 + delta, 1)).toISOString().slice(0, 7);
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AccountingPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  function goMonth(delta: number) { setSearchParams({ month: shiftMonth(month, delta) }); }

  const [data, setData] = useState<MonthlyCustomerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateSort, setDateSort] = usePersistentState<'asc' | 'desc' | null>('accountingPayments.dateSort', 'asc');

  useEffect(() => {
    setLoading(true); setError(null);
    getMonthlyPayments(month)
      .then(setData)
      .catch(() => setError('Failed to load payments'))
      .finally(() => setLoading(false));
  }, [month]);

  const totalCollected = data.reduce((s, e) => s + e.amountPaid, 0);

  const sortedData = useMemo(() => {
    if (!dateSort) return data;
    const dir = dateSort === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      if (!a.paidDate && !b.paidDate) return 0;
      if (!a.paidDate) return 1;
      if (!b.paidDate) return -1;
      return a.paidDate.localeCompare(b.paidDate) * dir;
    });
  }, [data, dateSort]);

  function toggleDateSort() {
    setDateSort((d) => (d === 'asc' ? 'desc' : 'asc'));
  }

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
            <p className={`${styles.kpiValue} ${styles.kpiGreen}`}>${formatMoney(totalCollected)}</p>
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
                    <th>
                      <button type="button" className={styles.sortHeaderBtn} onClick={toggleDateSort}>
                        Paid Date
                        {dateSort
                          ? (dateSort === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                          : <ChevronsUpDown size={12} className={styles.sortIconIdle} />}
                      </button>
                    </th>
                    <th className={styles.right}>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: '#6b7280', padding: '32px' }}>No payments recorded for this month.</td></tr>
                  )}
                  {sortedData.map((e) => (
                    <tr key={e.consumptionId}>
                      <td>
                        <Link className={styles.customerLink} to={`/customers/${e.customerId}`}>
                          {e.customerName}
                        </Link>
                      </td>
                      <td className={styles.muted}>{e.groupName}</td>
                      <td className={styles.muted}>{e.regionName}</td>
                      <td className={styles.right}>${formatMoney(e.balance)}</td>
                      <td className={`${styles.right} ${styles.green}`}>${formatMoney(e.amountPaid)}</td>
                      <td className={styles.muted}>{fmtDate(e.paidDate)}</td>
                      <td className={`${styles.right} ${e.remaining > 0.001 ? styles.yellow : styles.muted}`}>
                        ${formatMoney(e.remaining)}
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
