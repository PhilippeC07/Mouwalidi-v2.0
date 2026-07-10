import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, MessageCircle, FolderTree, Users, Phone, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useRegions } from '../../hooks/useGetRegions';
import { getCustomers, type CustomerListItem } from '../../api/customer/customer.api';
import { sendRegionWhatsappBroadcast, type RegionWhatsappResult } from '../../api/generator/generator.api';
import { getRegionBillingSummary, type RegionBillingSummary } from '../../api/billing/billing.api';
import { formatMoney } from '../../utils/format';
import { SimpleLineChart } from '../../app/components/SimpleLineChart';
import { SimpleBarChart } from '../../app/components/SimpleBarChart';
import dialogStyles from '../GeneratorView/GeneratorView.module.css';
import styles from './RegionView.module.css';

function trendMonthLabel(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

export function RegionView() {
  const { regionId } = useParams<{ regionId: string }>();
  const { data: regions, loading: regionsLoading } = useRegions();
  const region = regions.find((r) => r.id === regionId);

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // No single "customers in this region" endpoint exists yet — the region is
  // just a grouping of generator groups, so fetch each group's customers and
  // flatten them client-side.
  useEffect(() => {
    if (!region) return;
    let cancelled = false;
    setCustomersLoading(true);
    Promise.all(region.groups.map((g) => getCustomers(g.id)))
      .then((results) => { if (!cancelled) setCustomers(results.flat()); })
      .catch(() => { if (!cancelled) setCustomers([]); })
      .finally(() => { if (!cancelled) setCustomersLoading(false); });
    return () => { cancelled = true; };
  }, [region]);

  const [summary, setSummary] = useState<RegionBillingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    if (!regionId) return;
    let cancelled = false;
    setSummaryLoading(true);
    getRegionBillingSummary(regionId)
      .then((res) => { if (!cancelled) setSummary(res); })
      .catch(() => { if (!cancelled) setSummary(null); })
      .finally(() => { if (!cancelled) setSummaryLoading(false); });
    return () => { cancelled = true; };
  }, [regionId]);

  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<RegionWhatsappResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const withPhoneCount = customers.filter((c) => c.phoneNumber && c.phoneNumber.trim() !== '').length;

  function openModal() {
    setMessage('');
    setResult(null);
    setSendError(null);
    setModalOpen(true);
  }

  async function handleSend() {
    if (!regionId || message.trim() === '') return;
    setSending(true);
    setSendError(null);
    try {
      const res = await sendRegionWhatsappBroadcast(regionId, message.trim());
      setResult(res);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSendError(msg ?? 'Failed to send WhatsApp broadcast.');
    } finally {
      setSending(false);
    }
  }

  if (regionsLoading) {
    return (
      <div className={styles.centerState}>
        <p className={styles.stateText}>Loading region…</p>
      </div>
    );
  }

  if (!region) {
    return (
      <div className={styles.centerState}>
        <p className={styles.stateErr}>Region not found.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Send WhatsApp modal */}
      <Dialog.Root
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setSendError(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={dialogStyles.dialogOverlay} />
          <Dialog.Content className={dialogStyles.dialogContent} aria-describedby={undefined}>
            <div className={dialogStyles.dialogHeader}>
              <Dialog.Title className={dialogStyles.dialogTitle}>Send WhatsApp Message</Dialog.Title>
              <Dialog.Close className={dialogStyles.dialogCloseBtn}><X size={18} /></Dialog.Close>
            </div>

            {!result ? (
              <>
                <p className={styles.modalHint}>
                  Sends to {withPhoneCount} of {customers.length} customer{customers.length !== 1 ? 's' : ''} in{' '}
                  {region.label} who have a phone number on file.
                </p>
                <div className={dialogStyles.formGrid}>
                  <div className={`${dialogStyles.formField} ${dialogStyles.formFieldFull}`}>
                    <label className={dialogStyles.formLabel}>Message *</label>
                    <textarea
                      className={styles.messageTextarea}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type the message to send…"
                      rows={5}
                    />
                  </div>
                </div>

                {sendError && (
                  <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '12px' }}>{sendError}</p>
                )}

                <div className={dialogStyles.formActions}>
                  <Dialog.Close className={dialogStyles.btnCancel} type="button" disabled={sending}>Cancel</Dialog.Close>
                  <button
                    type="button"
                    className={dialogStyles.btnSubmit}
                    onClick={handleSend}
                    disabled={sending || message.trim() === '' || withPhoneCount === 0}
                  >
                    {sending ? 'Sending…' : `Send to ${withPhoneCount}`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.resultSummary}>
                  <p><strong className={styles.resultSent}>{result.sent}</strong> sent</p>
                  <p><strong className={styles.resultFailed}>{result.failed}</strong> failed</p>
                  <p><strong>{result.skippedNoPhone}</strong> skipped (no phone)</p>
                </div>
                {result.errors.length > 0 && (
                  <div className={styles.errorList}>
                    {result.errors.map((e) => (
                      <p key={e.customerId} className={styles.errorRow}>{e.customerName}: {e.error}</p>
                    ))}
                  </div>
                )}
                <div className={dialogStyles.formActions}>
                  <Dialog.Close className={dialogStyles.btnSubmit} type="button">Done</Dialog.Close>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <div className={styles.titleRow}>
              <MapPin size={20} className={styles.titleIcon} />
              <h1 className={styles.title}>{region.label}</h1>
            </div>
            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <FolderTree size={14} /> {region.groups.length} generator group{region.groups.length !== 1 ? 's' : ''}
              </span>
              <span className={styles.metaItem}>
                <Users size={14} /> {customersLoading ? '…' : customers.length} customers
              </span>
              <span className={styles.metaItem}>
                <Phone size={14} /> {customersLoading ? '…' : withPhoneCount} with phone
              </span>
            </div>
          </div>
          <button className={styles.whatsappBtn} onClick={openModal} disabled={customersLoading}>
            <MessageCircle size={16} />
            Send WhatsApp Message
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.kpiStrip}>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Total Customers</p>
            <p className={styles.kpiValue}>{customersLoading ? '…' : customers.length}</p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Total Billed</p>
            <p className={`${styles.kpiValue} ${styles.kpiBlue}`}>
              {summaryLoading ? '…' : `$${formatMoney(summary?.totalBilled ?? 0)}`}
            </p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Total Collected</p>
            <p className={`${styles.kpiValue} ${styles.kpiGreen}`}>
              {summaryLoading ? '…' : `$${formatMoney(summary?.totalPaid ?? 0)}`}
            </p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Outstanding</p>
            <p className={`${styles.kpiValue} ${(summary?.outstanding ?? 0) > 0.001 ? styles.kpiRed : styles.kpiGreen}`}>
              {summaryLoading ? '…' : `$${formatMoney(summary?.outstanding ?? 0)}`}
            </p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Collection Rate</p>
            <p className={`${styles.kpiValue} ${
              (summary?.collectionRate ?? 100) >= 80 ? styles.kpiGreen : (summary?.collectionRate ?? 100) >= 50 ? styles.kpiYellow : styles.kpiRed
            }`}>
              {summaryLoading ? '…' : `${(summary?.collectionRate ?? 100).toFixed(1)}%`}
            </p>
          </div>
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard} style={{ flex: '2 1 420px' }}>
            <h3 className={styles.chartCardTitle}>Billed vs Collected — Last 6 Months</h3>
            {summaryLoading ? (
              <p className={styles.empty}>Loading…</p>
            ) : (
              <SimpleLineChart
                series={[
                  { name: 'Billed', color: '#60a5fa', points: (summary?.monthlyTrend ?? []).map((t) => ({ x: trendMonthLabel(t.month), y: t.billed })) },
                  { name: 'Collected', color: '#34d399', points: (summary?.monthlyTrend ?? []).map((t) => ({ x: trendMonthLabel(t.month), y: t.paid })) },
                ]}
                formatValue={(v) => `$${formatMoney(v, 0)}`}
              />
            )}
          </div>

          <div className={styles.chartCard} style={{ flex: '1 1 300px' }}>
            <h3 className={styles.chartCardTitle}>Outstanding by Group</h3>
            {summaryLoading ? (
              <p className={styles.empty}>Loading…</p>
            ) : (summary?.byGroup.length ?? 0) === 0 ? (
              <p className={styles.empty}>No billing data yet.</p>
            ) : (
              <SimpleBarChart
                data={[...(summary?.byGroup ?? [])]
                  .sort((a, b) => b.outstanding - a.outstanding)
                  .slice(0, 8)
                  .map((g) => ({ name: g.groupName, value: g.outstanding, color: '#f87171' }))}
                formatValue={(v) => `$${formatMoney(v, 0)}`}
              />
            )}
          </div>
        </div>

        <h2 className={styles.sectionTitle}>Generator Groups</h2>
        <div className={styles.groupGrid}>
          {region.groups.map((group) => (
            <Link key={group.id} to={`/generator-groups/${group.id}`} className={styles.groupCard}>
              <div className={styles.groupCardIcon}><FolderTree size={16} /></div>
              <div>
                <p className={styles.groupCardName}>{group.label}</p>
                <p className={styles.groupCardMeta}>{group.items.length} generator{group.items.length !== 1 ? 's' : ''}</p>
              </div>
            </Link>
          ))}
          {region.groups.length === 0 && <p className={styles.empty}>No generator groups in this region yet.</p>}
        </div>

        <h2 className={styles.sectionTitle}>Billing by Group</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Group</th>
                <th className={styles.numCell}>Customers</th>
                <th className={styles.numCell}>Billed</th>
                <th className={styles.numCell}>Collected</th>
                <th className={styles.numCell}>Outstanding</th>
                <th className={styles.numCell}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {summaryLoading ? (
                <tr><td colSpan={6} className={styles.empty}>Loading…</td></tr>
              ) : (summary?.byGroup.length ?? 0) === 0 ? (
                <tr><td colSpan={6} className={styles.empty}>No billing data yet.</td></tr>
              ) : (
                [...(summary?.byGroup ?? [])].sort((a, b) => a.groupName.localeCompare(b.groupName)).map((g) => (
                  <tr key={g.groupId}>
                    <td>{g.groupName}</td>
                    <td className={styles.numCell}>{g.customerCount}</td>
                    <td className={`${styles.numCell} ${styles.blueText}`}>${formatMoney(g.totalBilled)}</td>
                    <td className={`${styles.numCell} ${styles.greenText}`}>${formatMoney(g.totalPaid)}</td>
                    <td className={`${styles.numCell} ${g.outstanding > 0.001 ? styles.redText : ''}`}>${formatMoney(g.outstanding)}</td>
                    <td className={styles.numCell}>{g.collectionRate.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
