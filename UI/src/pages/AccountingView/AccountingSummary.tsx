import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthlySummary, type MonthlySummary } from '../../api/billing/billing.api';
import styles from './AccountingView.module.css';

function fmtMonth(m: string) {
  return new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function AccountingSummary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  function goMonth(delta: number) {
    setSearchParams({ month: shiftMonth(month, delta) });
  }

  const [data, setData] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<'group' | 'region'>('group');

  useEffect(() => {
    setLoading(true); setError(null);
    getMonthlySummary(month)
      .then(setData)
      .catch(() => setError('Failed to load summary'))
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.pageTitle}>Monthly Summary</h1>
            <p className={styles.pageSub}>Billing overview for {fmtMonth(month)}</p>
          </div>
          <div className={styles.monthPicker}>
            <button className={styles.monthPickerBtn} onClick={() => goMonth(-1)}><ChevronLeft size={14} /></button>
            <span className={styles.monthPickerLabel}>{fmtMonth(month)}</span>
            <button className={styles.monthPickerBtn} onClick={() => goMonth(1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {loading && <p className={styles.stateErr} style={{ color: '#6b7280' }}>Loading…</p>}
      {error && <p className={styles.stateErr}>{error}</p>}

      {data && (
        <>
          <div className={styles.kpiStrip}>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Total Billed</p>
              <p className={`${styles.kpiValue} ${styles.kpiBlue}`}>${data.totalBilled.toFixed(2)}</p>
            </div>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Total Collected</p>
              <p className={`${styles.kpiValue} ${styles.kpiGreen}`}>${data.totalPaid.toFixed(2)}</p>
            </div>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Outstanding</p>
              <p className={`${styles.kpiValue} ${data.outstanding > 0 ? styles.kpiRed : styles.kpiGreen}`}>
                ${data.outstanding.toFixed(2)}
              </p>
            </div>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Collection Rate</p>
              <p className={`${styles.kpiValue} ${data.collectionRate >= 80 ? styles.kpiGreen : data.collectionRate >= 50 ? styles.kpiYellow : styles.kpiRed}`}>
                {data.collectionRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* ── Counter vs Fixed breakdown ── */}
          <div style={{ display: 'flex', gap: '1px', background: '#1f2937', borderBottom: '1px solid #1f2937', flexShrink: 0 }}>
            {([
              { label: 'Counter customers', type: data.counter, color: '#60a5fa' },
              { label: 'Fixed (Ampere) customers', type: data.fixed, color: '#a78bfa' },
            ] as const).map(({ label, type, color }) => (
              <div key={label} style={{ flex: 1, background: '#030712', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color }}>{type.customerCount}<span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 4 }}>customers</span></span>
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Billed <strong style={{ color: '#e5e7eb' }}>${type.totalBilled.toFixed(2)}</strong></span>
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Collected <strong style={{ color: '#34d399' }}>${type.totalPaid.toFixed(2)}</strong></span>
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Outstanding <strong style={{ color: type.outstanding > 0.001 ? '#f87171' : '#34d399' }}>${type.outstanding.toFixed(2)}</strong></span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.content}>
            <div className={styles.tableCard}>
              <div className={styles.tableCardHeader}>
                <h2 className={styles.tableCardTitle}>
                  Breakdown by {breakdown === 'group' ? 'Group' : 'Region'}
                </h2>
                <div className={styles.segmentedControl}>
                  <button
                    className={`${styles.segmentBtn} ${breakdown === 'group' ? styles.segmentBtnActive : ''}`}
                    onClick={() => setBreakdown('group')}
                  >
                    By Group
                  </button>
                  <button
                    className={`${styles.segmentBtn} ${breakdown === 'region' ? styles.segmentBtnActive : ''}`}
                    onClick={() => setBreakdown('region')}
                  >
                    By Region
                  </button>
                </div>
                <span className={styles.tableCount}>
                  {breakdown === 'group'
                    ? `${data.byGroup.length} group${data.byGroup.length !== 1 ? 's' : ''}`
                    : `${data.byRegion.length} region${data.byRegion.length !== 1 ? 's' : ''}`}
                </span>
              </div>

              <div className={styles.tableScroll}>
                {breakdown === 'group' ? (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Group</th>
                        <th>Region</th>
                        <th className={styles.right}>Customers</th>
                        <th className={styles.right}>Billed</th>
                        <th className={styles.right}>Collected</th>
                        <th className={styles.right}>Outstanding</th>
                        <th className={styles.right}>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byGroup.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b7280', padding: '32px' }}>No billing data for this month.</td></tr>
                      )}
                      {data.byGroup.map((g) => (
                        <tr key={g.groupId}>
                          <td>{g.groupName}</td>
                          <td className={styles.muted}>{g.regionName}</td>
                          <td className={styles.right}>{g.customerCount}</td>
                          <td className={`${styles.right} ${styles.kpiBlue}`}>${g.totalBilled.toFixed(2)}</td>
                          <td className={`${styles.right} ${styles.green}`}>${g.totalPaid.toFixed(2)}</td>
                          <td className={`${styles.right} ${g.outstanding > 0.001 ? styles.red : styles.muted}`}>
                            ${g.outstanding.toFixed(2)}
                          </td>
                          <td className="right">
                            <div className={styles.rateWrap}>
                              <div className={styles.rateBar}>
                                <div className={styles.rateFill} style={{ width: `${Math.min(100, g.collectionRate).toFixed(1)}%` }} />
                              </div>
                              <span className={`${styles.rateText} ${g.collectionRate >= 80 ? styles.green : g.collectionRate >= 50 ? styles.yellow : styles.red}`}>
                                {g.collectionRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Region</th>
                        <th className={styles.right}>Customers</th>
                        <th className={styles.right}>Billed</th>
                        <th className={styles.right}>Collected</th>
                        <th className={styles.right}>Outstanding</th>
                        <th className={styles.right}>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byRegion.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280', padding: '32px' }}>No billing data for this month.</td></tr>
                      )}
                      {data.byRegion.map((r) => (
                        <tr key={r.regionId}>
                          <td>{r.regionName}</td>
                          <td className={styles.right}>{r.customerCount}</td>
                          <td className={`${styles.right} ${styles.kpiBlue}`}>${r.totalBilled.toFixed(2)}</td>
                          <td className={`${styles.right} ${styles.green}`}>${r.totalPaid.toFixed(2)}</td>
                          <td className={`${styles.right} ${r.outstanding > 0.001 ? styles.red : styles.muted}`}>
                            ${r.outstanding.toFixed(2)}
                          </td>
                          <td className="right">
                            <div className={styles.rateWrap}>
                              <div className={styles.rateBar}>
                                <div className={styles.rateFill} style={{ width: `${Math.min(100, r.collectionRate).toFixed(1)}%` }} />
                              </div>
                              <span className={`${styles.rateText} ${r.collectionRate >= 80 ? styles.green : r.collectionRate >= 50 ? styles.yellow : styles.red}`}>
                                {r.collectionRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
