import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Building2, Zap, Gauge, User, Calendar,
} from 'lucide-react';
import { useCustomerDetails } from '../../hooks/useCustomerDetails';
import { getConsumptionStatuses, type ConsumptionStatusDto, type MonthlyConsumptionRecord } from '../../api/customer/customer.api';
import { updateMonthlyConsumption, type UpdateMonthlyConsumptionPayload } from '../../api/billing/billing.api';
import styles from './CustomerDetailView.module.css';

interface RowState {
  currentCounter: string;
  monthlyFee: string;
  amountPaid: string;
  consumptionStatusId: string;
  isCut: boolean;
  closedBalance: boolean;
}

export function CustomerDetailView() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { data: customer, loading, error } = useCustomerDetails(customerId);

  const [statuses, setStatuses] = useState<ConsumptionStatusDto[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getConsumptionStatuses().then(setStatuses).catch(() => {});
  }, []);

  // Initialise local row state from server data (once per load)
  useEffect(() => {
    if (!customer) return;
    setRows(prev => {
      const next: Record<string, RowState> = { ...prev };
      for (const m of customer.monthlyConsumptions) {
        if (!next[m.id]) {
          next[m.id] = rowFromRecord(m);
        }
      }
      return next;
    });
  }, [customer]);

  function patchRow(id: string, patch: Partial<RowState>) {
    setRows(r => ({ ...r, [id]: { ...r[id], ...patch } }));
  }

  async function save(id: string, payload: UpdateMonthlyConsumptionPayload) {
    try {
      await updateMonthlyConsumption(id, payload);
    } catch {
      setSaveError('Failed to save — check your connection.');
      if (errorTimer.current) clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => setSaveError(null), 4000);
    }
  }

  if (loading) {
    return (
      <div className={styles.centerState}>
        <p className={styles.stateText}>Loading customer…</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className={styles.centerState}>
        <p className={styles.stateErr}>{error ?? 'Customer not found.'}</p>
      </div>
    );
  }

  const fullName = [customer.firstName, customer.middleName, customer.lastName]
    .filter(Boolean)
    .join(' ');

  const initials = (customer.firstName[0] + customer.lastName[0]).toUpperCase();
  const isCounter = customer.consumptionType.isCounter;
  const payStatus = customer.consumptionStatus.Status.toLowerCase();

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} />
          Back
        </button>

        <div className={styles.headerBody}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.headerInfo}>
            <h1 className={styles.name}>{fullName}</h1>
            <div className={styles.badges}>
              <span className={`${styles.badge} ${customer.status === 'active' ? styles.badgeActive : styles.badgeInactive}`}>
                {customer.status}
              </span>
              <span className={`${styles.badge} ${getPayBadgeClass(payStatus, styles)}`}>
                {customer.consumptionStatus.Status}
              </span>
              {isCounter && (
                <span className={`${styles.badge} ${styles.badgeCounter}`}>
                  <Gauge size={11} /> Counter
                </span>
              )}
              {customer.consumptionType.ThreePhase && (
                <span className={`${styles.badge} ${styles.badgePhase}`}>3-Phase</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Info Strip ── */}
      <div className={styles.infoStrip}>
        <div className={styles.infoCard}>
          <div className={styles.infoCardIcon}><Zap size={16} color="#facc15" /></div>
          <div>
            <p className={styles.infoLabel}>Subscription Type</p>
            <p className={styles.infoValue}>{customer.consumptionType.description}</p>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoCardIcon}><Gauge size={16} color="#60a5fa" /></div>
          <div>
            <p className={styles.infoLabel}>Ampere</p>
            <p className={styles.infoValue}>{customer.consumptionType.Ampere} A</p>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoCardIcon}><Building2 size={16} color="#a78bfa" /></div>
          <div>
            <p className={styles.infoLabel}>Building / Floor</p>
            <p className={styles.infoValue}>
              {customer.buildingFloor
                ? `${customer.buildingFloor.building.name} · Fl ${customer.buildingFloor.floorNumber} ${customer.buildingFloor.apartmentSide}`
                : '—'}
            </p>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoCardIcon}><Phone size={16} color="#34d399" /></div>
          <div>
            <p className={styles.infoLabel}>Phone</p>
            <p className={styles.infoValue}>{customer.phoneNumber ?? '—'}</p>
          </div>
        </div>

        {customer.description && (
          <div className={`${styles.infoCard} ${styles.infoCardWide}`}>
            <div className={styles.infoCardIcon}><User size={16} color="#9ca3af" /></div>
            <div>
              <p className={styles.infoLabel}>Notes</p>
              <p className={styles.infoValue}>{customer.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Monthly History ── */}
      <div className={styles.content}>
        <div className={styles.sectionHeader}>
          <Calendar size={16} color="#60a5fa" />
          <h2 className={styles.sectionTitle}>Monthly Billing History</h2>
          <span className={styles.sectionCount}>
            {customer.monthlyConsumptions.length} month{customer.monthlyConsumptions.length !== 1 ? 's' : ''}
          </span>
          {saveError && <span className={styles.saveErrorInline}>{saveError}</span>}
        </div>

        {customer.monthlyConsumptions.length === 0 ? (
          <p className={styles.empty}>No billing records yet for this customer.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  {isCounter && <th>Prev Counter</th>}
                  {isCounter && <th>Curr Counter</th>}
                  {isCounter && <th>Usage (kWh)</th>}
                  {isCounter && <th>kWh Price</th>}
                  <th>Monthly Fee</th>
                  <th>Balance</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Cut</th>
                  <th>Closed</th>
                </tr>
              </thead>
              <tbody>
                {customer.monthlyConsumptions.map((m) => {
                  const row = rows[m.id] ?? rowFromRecord(m);

                  const currCounter = parseNum(row.currentCounter, m.currentCounter);
                  const fee         = parseNum(row.monthlyFee,     m.monthlyFee);
                  const paid        = parseNum(row.amountPaid,      m.amountPaid);
                  const usage       = currCounter - m.previousCounter;
                  const balance     = isCounter ? usage * m.kwhPrice + fee : fee;
                  const remaining   = balance - paid;

                  const statusLabel = statuses.find(s => s.id === row.consumptionStatusId)?.Status
                    ?? m.consumptionStatus.Status;
                  const payS = statusLabel.toLowerCase();

                  return (
                    <tr key={m.id} className={remaining > 0 ? styles.rowUnpaid : styles.rowPaid}>
                      <td className={styles.monthCell}>{formatMonth(m.date)}</td>

                      {isCounter && (
                        <td className={styles.numCell}>{m.previousCounter}</td>
                      )}

                      {isCounter && (
                        <td className={styles.numCell}>
                          <input
                            className={styles.cellInput}
                            type="number"
                            value={row.currentCounter}
                            onChange={e => patchRow(m.id, { currentCounter: e.target.value })}
                            onBlur={e => save(m.id, { currentCounter: Number(e.target.value) || 0 })}
                          />
                        </td>
                      )}

                      {isCounter && (
                        <td className={styles.numCell}>
                          <span className={usage > 0 ? styles.usagePositive : styles.usageZero}>
                            {usage}
                          </span>
                        </td>
                      )}

                      {isCounter && (
                        <td className={styles.numCell}>${m.kwhPrice.toFixed(3)}</td>
                      )}

                      <td className={styles.numCell}>
                        <input
                          className={styles.cellInput}
                          type="number"
                          value={row.monthlyFee}
                          onChange={e => patchRow(m.id, { monthlyFee: e.target.value })}
                          onBlur={e => save(m.id, { monthlyFee: Number(e.target.value) || 0 })}
                        />
                      </td>

                      <td className={styles.numCell}>
                        <span className={styles.balanceVal}>${balance.toFixed(2)}</span>
                      </td>

                      <td className={styles.numCell}>
                        <input
                          className={styles.cellInput}
                          type="number"
                          value={row.amountPaid}
                          onChange={e => patchRow(m.id, { amountPaid: e.target.value })}
                          onBlur={e => save(m.id, { amountPaid: Number(e.target.value) || 0 })}
                        />
                      </td>

                      <td className={styles.numCell}>
                        <span className={remaining > 0.001 ? styles.remainingDue : styles.remainingClear}>
                          ${Math.max(0, remaining).toFixed(2)}
                        </span>
                      </td>

                      <td>
                        <select
                          className={styles.cellSelect}
                          value={row.consumptionStatusId}
                          onChange={e => {
                            patchRow(m.id, { consumptionStatusId: e.target.value });
                            void save(m.id, { consumptionStatusId: e.target.value });
                          }}
                        >
                          {statuses.map(s => (
                            <option key={s.id} value={s.id}>{s.Status}</option>
                          ))}
                        </select>
                      </td>

                      <td className={styles.iconCell}>
                        <input
                          type="checkbox"
                          className={styles.cellCheck}
                          checked={row.isCut}
                          onChange={e => {
                            patchRow(m.id, { isCut: e.target.checked });
                            void save(m.id, { isCut: e.target.checked });
                          }}
                          title="Service cut"
                        />
                      </td>

                      <td className={styles.iconCell}>
                        <input
                          type="checkbox"
                          className={styles.cellCheck}
                          checked={row.closedBalance}
                          onChange={e => {
                            patchRow(m.id, { closedBalance: e.target.checked });
                            void save(m.id, { closedBalance: e.target.checked });
                          }}
                          title="Balance closed"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className={styles.formulaNote}>
          {isCounter
            ? 'Balance = (Current Counter − Previous Counter) × kWh Price + Monthly Fee'
            : 'Balance = Monthly Fee (Ampere × Price per Amp set at billing time)'}
        </p>
      </div>
    </div>
  );
}

function rowFromRecord(m: MonthlyConsumptionRecord): RowState {
  return {
    currentCounter: String(m.currentCounter),
    monthlyFee: String(m.monthlyFee),
    amountPaid: String(m.amountPaid),
    consumptionStatusId: m.consumptionStatusId,
    isCut: m.isCut,
    closedBalance: m.closedBalance,
  };
}

function parseNum(str: string, fallback: number): number {
  const n = parseFloat(str);
  return isNaN(n) ? fallback : n;
}

function getPayBadgeClass(status: string, s: typeof styles): string {
  switch (status) {
    case 'paid':    return s.badgePaid;
    case 'unpaid':  return s.badgeUnpaid;
    case 'overdue': return s.badgeOverdue;
    default:        return s.badgeInactive;
  }
}

function formatMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}
