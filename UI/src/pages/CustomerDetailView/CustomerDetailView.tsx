import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Building2, Zap, Gauge, User, Calendar, CheckCircle2, Printer, Plus, X,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useCustomerDetails } from '../../hooks/useCustomerDetails';
import { usePersistentState } from '../../hooks/usePersistentState';
import type { MonthlyConsumptionRecord } from '../../api/customer/customer.api';
import { updateMonthlyConsumption, getReceipts, createSingleBilling, getCustomerMonthlyRate, type UpdateMonthlyConsumptionPayload, type ReceiptData, type CustomerMonthlyRate } from '../../api/billing/billing.api';
import { formatMoney } from '../../utils/format';
import { ReceiptPrintSheet } from '../../components/receipts/ReceiptPrintSheet';
import { SimpleLineChart } from '../../app/components/SimpleLineChart';
import styles from './CustomerDetailView.module.css';
import dialogStyles from '../GeneratorView/GeneratorView.module.css';

interface RowState {
  previousCounter: string;
  currentCounter: string;
  monthlyFee: string;
  balanceOverride: string;
  amountPaid: string;
  paidDate: string;
  isCut: boolean;
  closedBalance: boolean;
}

export function CustomerDetailView() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { data: customer, loading, error, refetch } = useCustomerDetails(customerId);

  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'last' | 'range'>('last');
  const [printFrom, setPrintFrom] = useState('');
  const [printTo, setPrintTo] = useState('');
  const [printReceipts, setPrintReceipts] = useState<ReceiptData[]>([]);
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  const [addBillModalOpen, setAddBillModalOpen] = useState(false);
  const [addBillMonth, setAddBillMonth] = useState('');
  const [addBillPrice, setAddBillPrice] = useState('');
  const [addBillLoading, setAddBillLoading] = useState(false);
  const [addBillError, setAddBillError] = useState<string | null>(null);
  const [addBillRate, setAddBillRate] = useState<CustomerMonthlyRate | null>(null);
  const [addBillRateChecking, setAddBillRateChecking] = useState(false);

  const [historyView, setHistoryView] = usePersistentState<'table' | 'charts'>('customerDetail.historyView', 'table');

  // Whenever the chosen month changes, check whether a rate already exists for
  // it so we only ask for a price when one is actually needed.
  useEffect(() => {
    if (!addBillModalOpen || !customerId || !addBillMonth) return;
    let cancelled = false;
    setAddBillRateChecking(true);
    getCustomerMonthlyRate(customerId, addBillMonth)
      .then((rate) => { if (!cancelled) setAddBillRate(rate); })
      .catch(() => { if (!cancelled) setAddBillRate(null); })
      .finally(() => { if (!cancelled) setAddBillRateChecking(false); });
    return () => { cancelled = true; };
  }, [addBillModalOpen, customerId, addBillMonth]);

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

  // Runs on every keystroke (patchRow updates `rows`, which re-triggers this
  // effect) so closed/open status updates instantly, without waiting for blur:
  //  - a month's remaining balance reaching $0 auto-closes it (covers rows
  //    that arrive already at $0, e.g. a freshly added bill with no usage/fee
  //    yet, not just ones edited via the inputs);
  //  - a closed row whose remaining balance drifts away from its last
  //    persisted value reopens, so a stale $0-era "closed" status can't hide
  //    a newly-created due amount.
  useEffect(() => {
    if (!customer) return;
    const custIsCounter = customer.consumptionType.isCounter;
    for (const m of customer.monthlyConsumptions) {
      const row = rows[m.id];
      if (!row) continue;
      const prev = parseNum(row.previousCounter, m.previousCounter);
      const curr = parseNum(row.currentCounter, m.currentCounter);
      const fee = parseNum(row.monthlyFee, m.monthlyFee);
      const paid = parseNum(row.amountPaid, m.amountPaid);
      const override = row.balanceOverride !== '' ? parseNum(row.balanceOverride, 0) : null;
      const balance = computeBalance(custIsCounter, prev, curr, m.kwhPrice, fee, override);
      const remaining = balance - paid;

      if (remaining <= 0.001) {
        if (!row.closedBalance) {
          patchRow(m.id, { closedBalance: true });
          void save(m.id, { closedBalance: true });
        }
        continue;
      }

      if (row.closedBalance) {
        const balanceOld = computeBalance(custIsCounter, m.previousCounter, m.currentCounter, m.kwhPrice, m.monthlyFee, m.balanceOverride);
        const remainingOld = balanceOld - m.amountPaid;
        if (Math.abs(remaining - remainingOld) > 0.001) {
          patchRow(m.id, { closedBalance: false });
          void save(m.id, { closedBalance: false });
        }
      }
    }
  }, [rows, customer]);

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

  // Derived from actual billing records rather than the customer's stored
  // consumptionStatus label, which is set manually and can drift out of sync
  // with what's really owed.
  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  const chartPoints: { label: string; usage: number; balance: number }[] = [];
  for (const m of customer.monthlyConsumptions) {
    const row = rows[m.id] ?? rowFromRecord(m);
    const prevCounter = parseNum(row.previousCounter, m.previousCounter);
    const currCounter = parseNum(row.currentCounter, m.currentCounter);
    const fee = parseNum(row.monthlyFee, m.monthlyFee);
    const paid = parseNum(row.amountPaid, m.amountPaid);
    const override = row.balanceOverride !== '' ? parseNum(row.balanceOverride, 0) : null;
    const usage = currCounter - prevCounter;
    const balance = computeBalance(isCounter, prevCounter, currCounter, m.kwhPrice, fee, override);
    const remaining = balance - paid;
    totalBilled += balance;
    totalPaid += paid;
    if (!row.closedBalance) totalOutstanding += remaining;
    chartPoints.push({ label: chartMonthLabel(m.date), usage, balance });
  }
  chartPoints.reverse(); // monthlyConsumptions arrives newest-first; charts read oldest→newest
  const hasDue = totalOutstanding > 0.001;

  function markPaid(id: string, balance: number) {
    const amt = Math.round(balance * 100) / 100;
    const date = todayIso();
    patchRow(id, { amountPaid: String(amt), paidDate: date, closedBalance: true });
    void save(id, { amountPaid: amt, paidDate: date, closedBalance: true });
  }

  function openAddBillModal() {
    if (!customer) return;
    const today = new Date();
    const latest = customer.monthlyConsumptions[0];
    // Default to the month right after the most recent bill, or the current month if none yet.
    let defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (latest) {
      const [y, m] = latest.date.slice(0, 7).split('-').map(Number);
      const next = new Date(Date.UTC(y, m, 1));
      defaultMonth = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    setAddBillMonth(defaultMonth);
    setAddBillPrice('');
    setAddBillError(null);
    setAddBillRate(null);
    setAddBillModalOpen(true);
  }

  async function handleAddBillConfirm() {
    if (!customer || !addBillMonth) return;
    setAddBillLoading(true);
    setAddBillError(null);
    try {
      // If a rate already exists for this month, reuse it — don't ask for/send a price.
      const price = addBillRate?.exists
        ? undefined
        : (addBillPrice.trim() === '' ? undefined : Number(addBillPrice));
      await createSingleBilling(customer.id, addBillMonth, price);
      setAddBillModalOpen(false);
      void refetch();
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddBillError(message ?? 'Failed to add bill.');
    } finally {
      setAddBillLoading(false);
    }
  }

  function openPrintModal() {
    if (!customer) return;
    const latestMonth = customer.monthlyConsumptions[0]?.date.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
    setPrintMode('last');
    setPrintFrom(latestMonth);
    setPrintTo(latestMonth);
    setPrintError(null);
    setPrintModalOpen(true);
  }

  async function handlePrintConfirm() {
    if (!customer) return;
    setPrintLoading(true);
    setPrintError(null);
    try {
      let months: string[];
      if (printMode === 'last') {
        const latest = customer.monthlyConsumptions[0];
        if (!latest) {
          setPrintError('No billing records yet.');
          return;
        }
        months = [latest.date.slice(0, 7)];
      } else {
        if (!printFrom || !printTo) {
          setPrintError('Select both months.');
          return;
        }
        months = monthsBetween(printFrom, printTo);
      }
      const data = await getReceipts([customer.id], months);
      if (data.length === 0) {
        setPrintError('No bills found for the selected period.');
        return;
      }
      setPrintReceipts(data);
      setPrintModalOpen(false);
      setTimeout(() => window.print(), 100);
    } catch {
      setPrintError('Failed to load receipts.');
    } finally {
      setPrintLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <ReceiptPrintSheet receipts={printReceipts} />

      {/* Print Receipt modal */}
      <Dialog.Root
        open={printModalOpen}
        onOpenChange={(open) => {
          setPrintModalOpen(open);
          if (!open) setPrintError(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={dialogStyles.dialogOverlay} />
          <Dialog.Content className={dialogStyles.dialogContent} aria-describedby={undefined}>
            <div className={dialogStyles.dialogHeader}>
              <Dialog.Title className={dialogStyles.dialogTitle}>Print Receipt</Dialog.Title>
              <Dialog.Close className={dialogStyles.dialogCloseBtn}><X size={18} /></Dialog.Close>
            </div>

            <div className={dialogStyles.formGrid}>
              <div className={`${dialogStyles.formField} ${dialogStyles.formFieldFull}`}>
                <label className={dialogStyles.formLabel}>Print</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label className={dialogStyles.formCheckboxRow}>
                    <input type="radio" name="printMode" checked={printMode === 'last'} onChange={() => setPrintMode('last')} />
                    <span className={dialogStyles.formCheckboxLabel}>Last month</span>
                  </label>
                  <label className={dialogStyles.formCheckboxRow}>
                    <input type="radio" name="printMode" checked={printMode === 'range'} onChange={() => setPrintMode('range')} />
                    <span className={dialogStyles.formCheckboxLabel}>Date range</span>
                  </label>
                </div>
              </div>

              {printMode === 'range' && (
                <>
                  <div className={dialogStyles.formField}>
                    <label className={dialogStyles.formLabel}>From *</label>
                    <input type="month" className={dialogStyles.formInput} value={printFrom} onChange={(e) => setPrintFrom(e.target.value)} required />
                  </div>
                  <div className={dialogStyles.formField}>
                    <label className={dialogStyles.formLabel}>To *</label>
                    <input type="month" className={dialogStyles.formInput} value={printTo} onChange={(e) => setPrintTo(e.target.value)} required />
                  </div>
                </>
              )}
            </div>

            {printError && (
              <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '12px' }}>{printError}</p>
            )}

            <div className={dialogStyles.formActions}>
              <Dialog.Close className={dialogStyles.btnCancel} type="button" disabled={printLoading}>Cancel</Dialog.Close>
              <button type="button" className={dialogStyles.btnSubmit} onClick={handlePrintConfirm} disabled={printLoading}>
                {printLoading ? 'Loading…' : 'Print'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add Bill modal */}
      <Dialog.Root
        open={addBillModalOpen}
        onOpenChange={(open) => {
          setAddBillModalOpen(open);
          if (!open) setAddBillError(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={dialogStyles.dialogOverlay} />
          <Dialog.Content className={dialogStyles.dialogContent} aria-describedby={undefined}>
            <div className={dialogStyles.dialogHeader}>
              <Dialog.Title className={dialogStyles.dialogTitle}>Add Bill</Dialog.Title>
              <Dialog.Close className={dialogStyles.dialogCloseBtn}><X size={18} /></Dialog.Close>
            </div>

            <div className={dialogStyles.formGrid}>
              <div className={`${dialogStyles.formField} ${dialogStyles.formFieldFull}`}>
                <label className={dialogStyles.formLabel}>Month *</label>
                <input
                  type="month"
                  className={dialogStyles.formInput}
                  value={addBillMonth}
                  onChange={(e) => setAddBillMonth(e.target.value)}
                  required
                />
              </div>
              {addBillRateChecking ? (
                <div className={`${dialogStyles.formField} ${dialogStyles.formFieldFull}`}>
                  <p style={{ color: 'var(--tx-4)', fontSize: '0.8rem', margin: 0 }}>Checking existing rate…</p>
                </div>
              ) : addBillRate?.exists ? (
                <div className={`${dialogStyles.formField} ${dialogStyles.formFieldFull}`}>
                  <p style={{ color: 'var(--tx-4)', fontSize: '0.8rem', margin: 0 }}>
                    Using this month&apos;s existing rate: <strong style={{ color: 'var(--tx-1)' }}>{formatMoney(addBillRate.price ?? 0, isCounter ? 3 : 2)}</strong>
                    {isCounter ? ' / kWh' : ' / Amp'}
                  </p>
                </div>
              ) : (
                <div className={`${dialogStyles.formField} ${dialogStyles.formFieldFull}`}>
                  <label className={dialogStyles.formLabel}>
                    Price {isCounter ? '(kWh price)' : '(per Amp)'} *
                  </label>
                  <input
                    type="number"
                    step="any"
                    className={dialogStyles.formInput}
                    placeholder="No rate exists for this month yet"
                    value={addBillPrice}
                    onChange={(e) => setAddBillPrice(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {addBillError && (
              <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '12px' }}>{addBillError}</p>
            )}

            <div className={dialogStyles.formActions}>
              <Dialog.Close className={dialogStyles.btnCancel} type="button" disabled={addBillLoading}>Cancel</Dialog.Close>
              <button type="button" className={dialogStyles.btnSubmit} onClick={handleAddBillConfirm} disabled={addBillLoading}>
                {addBillLoading ? 'Adding…' : 'Add Bill'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className={styles.backBtn} style={{ marginBottom: 0 }} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} />
            Back
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className={`${styles.headerActionBtn} ${styles.addBillBtn}`} onClick={openAddBillModal}>
              <Plus size={15} />
              Add Bill
            </button>
            <button className={`${styles.headerActionBtn} ${styles.printBtn}`} onClick={openPrintModal} disabled={customer.monthlyConsumptions.length === 0}>
              <Printer size={15} />
              Print Receipt
            </button>
          </div>
        </div>

        <div className={styles.headerBody} style={{ marginTop: 14 }}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.headerInfo}>
            <h1 className={styles.name}>{fullName}</h1>
            <div className={styles.badges}>
              <span className={`${styles.badge} ${customer.status === 'active' ? styles.badgeActive : styles.badgeInactive}`}>
                {customer.status}
              </span>
              <span className={`${styles.badge} ${hasDue ? styles.badgeUnpaid : styles.badgePaid}`}>
                {hasDue ? 'Unpaid' : 'Paid'}
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
          {chartPoints.length > 1 && (
            <div className={dialogStyles.viewSwitcher} style={{ margin: 0 }}>
              <button
                className={`${dialogStyles.filterBtn} ${historyView === 'table' ? dialogStyles.filterBtnActive : ''}`}
                onClick={() => setHistoryView('table')}
              >
                Table
              </button>
              <button
                className={`${dialogStyles.filterBtn} ${historyView === 'charts' ? dialogStyles.filterBtnActive : ''}`}
                onClick={() => setHistoryView('charts')}
              >
                Charts
              </button>
            </div>
          )}
          {saveError && <span className={styles.saveErrorInline}>{saveError}</span>}
        </div>

        {customer.monthlyConsumptions.length > 0 && (
          <div className={styles.summaryStrip}>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Total Billed</p>
              <p className={styles.summaryValue}>${formatMoney(totalBilled)}</p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Total Paid</p>
              <p className={`${styles.summaryValue} ${styles.summaryPaid}`}>${formatMoney(totalPaid)}</p>
            </div>
            <div className={`${styles.summaryCard} ${hasDue ? styles.summaryCardDue : styles.summaryCardClear}`}>
              <p className={styles.summaryLabel}>Outstanding</p>
              <p className={`${styles.summaryValue} ${hasDue ? styles.summaryDue : styles.summaryClear}`}>
                ${formatMoney(totalOutstanding)}
              </p>
            </div>
          </div>
        )}

        {chartPoints.length > 1 && historyView === 'charts' && (
          <div className={styles.chartsRow}>
            {isCounter && (
              <div className={styles.chartCard}>
                <h3 className={styles.chartCardTitle}>Consumption (kWh) per Month</h3>
                <SimpleLineChart
                  series={[{ name: 'Usage', color: '#facc15', points: chartPoints.map((p) => ({ x: p.label, y: p.usage })) }]}
                  formatValue={(v) => `${formatMoney(v, 0)} kWh`}
                />
              </div>
            )}
            <div className={styles.chartCard}>
              <h3 className={styles.chartCardTitle}>Balance per Month</h3>
              <SimpleLineChart
                series={[{ name: 'Balance', color: '#60a5fa', points: chartPoints.map((p) => ({ x: p.label, y: p.balance })) }]}
                formatValue={(v) => `$${formatMoney(v, 0)}`}
              />
            </div>
          </div>
        )}

        {(historyView === 'table' || chartPoints.length <= 1) && (customer.monthlyConsumptions.length === 0 ? (
          <p className={styles.empty}>No billing records yet for this customer.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  {isCounter && <th className={styles.numCell}>Prev Counter</th>}
                  {isCounter && <th className={styles.numCell}>Curr Counter</th>}
                  {isCounter && <th className={styles.numCell}>Usage (kWh)</th>}
                  {isCounter && <th className={styles.numCell}>kWh Price</th>}
                  <th className={styles.numCell}>Monthly Fee</th>
                  <th className={styles.numCell}>Balance</th>
                  <th className={styles.numCell}>Paid</th>
                  <th>Paid Date</th>
                  <th className={styles.numCell}>Remaining</th>
                  <th className={styles.iconCell}>Cut</th>
                  <th className={styles.iconCell}>Closed</th>
                </tr>
              </thead>
              <tbody>
                {customer.monthlyConsumptions.map((m) => {
                  const row = rows[m.id] ?? rowFromRecord(m);

                  const prevCounter = parseNum(row.previousCounter, m.previousCounter);
                  const currCounter = parseNum(row.currentCounter,  m.currentCounter);
                  const fee         = parseNum(row.monthlyFee,      m.monthlyFee);
                  const paid        = parseNum(row.amountPaid,       m.amountPaid);
                  const override    = row.balanceOverride !== '' ? parseNum(row.balanceOverride, 0) : null;
                  const usage       = currCounter - prevCounter;
                  const computedBalance = isCounter ? usage * m.kwhPrice + fee : fee;
                  const balance     = computeBalance(isCounter, prevCounter, currCounter, m.kwhPrice, fee, override);
                  const remaining   = balance - paid;

                  return (
                    <tr key={m.id} className={remaining > 0 ? styles.rowUnpaid : styles.rowPaid}>
                      <td className={styles.monthCell}>{formatMonth(m.date)}</td>

                      {isCounter && (
                        <td className={styles.numCell}>
                          <input
                            className={styles.cellInput}
                            type="number"
                            value={row.previousCounter}
                            onChange={e => patchRow(m.id, { previousCounter: e.target.value })}
                            onBlur={e => void save(m.id, { previousCounter: Number(e.target.value) || 0 })}
                          />
                        </td>
                      )}

                      {isCounter && (
                        <td className={styles.numCell}>
                          <input
                            className={styles.cellInput}
                            type="number"
                            value={row.currentCounter}
                            onChange={e => patchRow(m.id, { currentCounter: e.target.value })}
                            onBlur={e => void save(m.id, { currentCounter: Number(e.target.value) || 0 })}
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
                        <td className={styles.numCell}>${formatMoney(m.kwhPrice, 3)}</td>
                      )}

                      <td className={styles.numCell}>
                        <input
                          className={styles.cellInput}
                          type="number"
                          value={row.monthlyFee}
                          onChange={e => patchRow(m.id, { monthlyFee: e.target.value })}
                          onBlur={e => void save(m.id, { monthlyFee: Number(e.target.value) || 0 })}
                        />
                      </td>

                      <td className={styles.numCell}>
                        <input
                          className={`${styles.cellInput} ${styles.balanceVal} ${override !== null ? styles.balanceOverridden : ''}`}
                          type="number"
                          title={override !== null ? 'Manual override — differs from the usage/fee calculation' : undefined}
                          placeholder={String(roundMoney(computedBalance))}
                          value={row.balanceOverride}
                          onChange={e => patchRow(m.id, { balanceOverride: e.target.value })}
                          onBlur={e => {
                            const raw = e.target.value.trim();
                            if (raw === '') {
                              patchRow(m.id, { balanceOverride: '' });
                              void save(m.id, { balanceOverride: null });
                              return;
                            }
                            const typed = Number(raw) || 0;
                            const isOverridden = Math.abs(typed - computedBalance) > 0.001;
                            patchRow(m.id, { balanceOverride: isOverridden ? String(typed) : '' });
                            void save(m.id, { balanceOverride: isOverridden ? typed : null });
                          }}
                        />
                      </td>

                      <td className={styles.numCell}>
                        <input
                          className={styles.cellInput}
                          type="number"
                          value={row.amountPaid}
                          onChange={e => patchRow(m.id, { amountPaid: e.target.value })}
                          onBlur={e => {
                            const amt = Number(e.target.value) || 0;
                            const nextDate = amt > 0 ? (row.paidDate || todayIso()) : '';
                            patchRow(m.id, { paidDate: nextDate });
                            void save(m.id, { amountPaid: amt, paidDate: nextDate });
                          }}
                        />
                      </td>

                      <td>
                        <input
                          type="date"
                          className={styles.dateInput}
                          value={row.paidDate}
                          onChange={e => patchRow(m.id, { paidDate: e.target.value })}
                          onBlur={e => void save(m.id, { paidDate: e.target.value })}
                        />
                      </td>

                      <td className={styles.numCell}>
                        <div className={styles.remainingCell}>
                          <span className={
                            remaining > 0.001
                              ? row.closedBalance ? styles.remainingClosed : styles.remainingDue
                              : styles.remainingClear
                          }>
                            ${formatMoney(Math.max(0, remaining))}
                          </span>
                          {remaining > 0.001 && !row.closedBalance && (
                            <button
                              type="button"
                              className={styles.markPaidBtn}
                              onClick={() => markPaid(m.id, balance)}
                              title="Record full payment today"
                            >
                              <CheckCircle2 size={12} /> Mark Paid
                            </button>
                          )}
                        </div>
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
        ))}

        <p className={styles.formulaNote}>
          {isCounter
            ? 'Balance = (Current Counter − Previous Counter) × kWh Price + Monthly Fee'
            : 'Balance = Monthly Fee (Ampere × Price per Amp set at billing time)'}
          {' — edit the Balance cell directly to set a special amount (highlighted in violet).'}
        </p>
      </div>
    </div>
  );
}

function rowFromRecord(m: MonthlyConsumptionRecord): RowState {
  return {
    previousCounter: String(m.previousCounter),
    currentCounter: String(m.currentCounter),
    monthlyFee: String(m.monthlyFee),
    balanceOverride: m.balanceOverride != null ? String(m.balanceOverride) : '',
    amountPaid: String(m.amountPaid),
    paidDate: m.paidDate ? m.paidDate.slice(0, 10) : '',
    isCut: m.isCut,
    closedBalance: m.closedBalance,
  };
}

/** Mirrors the backend's calcBalance: a manual override always wins over the formula. */
function computeBalance(isCounterFlag: boolean, prev: number, curr: number, kwhPrice: number, fee: number, override: number | null): number {
  return override != null ? override : (isCounterFlag ? (curr - prev) * kwhPrice + fee : fee);
}

function roundMoney(v: number): number {
  return Math.round(v * 100) / 100;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthsBetween(from: string, to: string): string[] {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  let start = fy * 12 + (fm - 1);
  let end = ty * 12 + (tm - 1);
  if (start > end) [start, end] = [end, start];
  const months: string[] = [];
  for (let i = start; i <= end; i++) {
    const y = Math.floor(i / 12);
    const m = (i % 12) + 1;
    months.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return months;
}

function parseNum(str: string, fallback: number): number {
  const n = parseFloat(str);
  return isNaN(n) ? fallback : n;
}

function formatMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

function chartMonthLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', year: '2-digit', timeZone: 'UTC',
  });
}
