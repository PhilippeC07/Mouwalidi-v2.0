import { useEffect, useState } from 'react';
import {
  MapPin, FolderTree, ChevronDown, ChevronRight, Zap, Gauge,
  Plus, CheckCircle, AlertCircle, Loader, Layers,
  PlugZap, Pencil, Trash2, UserPlus, Users, Smartphone, XCircle,
} from 'lucide-react';
import { useRegions, type RegionGroupModel, type RegionModel } from '../../hooks/useGetRegions';
import { useMonthlyBillings } from '../../hooks/useMonthlyBillings';
import { createMonthlyBilling } from '../../api/billing/billing.api';
import {
  createRegion, updateRegion, deleteRegion,
  createGeneratorGroup, updateGeneratorGroup, deleteGeneratorGroup,
  createGenerator, updateGenerator, deleteGenerator,
} from '../../api/generator/generator.api';
import { getUsers, registerAccount, type AuthUser } from '../../api/auth/auth.api';
import { getCustomers, type CustomerListItem } from '../../api/customer/customer.api';
import {
  createSubscriptionCheckout,
  createBillingPortalSession,
  getSubscriptionStatus,
  createConnectOnboardingLink,
  getConnectStatus,
  type SubscriptionStatus,
  type ConnectStatus,
} from '../../api/stripe/stripe.api';
import {
  getSubscriptionRecipient,
  submitSubscriptionClaim,
  getMySubscriptionClaims,
  getPendingSubscriptionClaims,
  approveSubscriptionClaim,
  rejectSubscriptionClaim,
  listCustomerPaymentClaims,
  approveCustomerPaymentClaim,
  rejectCustomerPaymentClaim,
  setWhishPhoneNumber,
  type SubscriptionClaim,
  type CustomerPaymentClaim,
  type WhishRecipient,
} from '../../api/whish/whish.api';
import { useRegionsContext } from '../../context/RegionsContext';
import { useAuth } from '../../context/AuthContext';
import { formatMoney } from '../../utils/format';
import { useReceiptTemplate, type ReceiptTemplateId } from '../../context/ReceiptTemplateContext';
import { ReceiptTemplatePreview } from '../../components/receipts/ReceiptTemplatePreview';
import styles from './SettingsView.module.css';

const RECEIPT_TEMPLATE_OPTIONS: { id: ReceiptTemplateId; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic', description: 'The original boxed-field layout (default).' },
  { id: 'modern', name: 'Modern', description: 'Bordered card with a highlighted balance bar.' },
  { id: 'compact', name: 'Compact', description: 'Condensed single-line fields, no boxes.' },
];

/* ─────────────────────────────────────────────────
   BillingPanel — one panel per group × isCounter
───────────────────────────────────────────────── */
interface BillingPanelProps {
  group: RegionGroupModel;
  isCounter: boolean;
  externalKey?: number;
}

function BillingPanel({ group, isCounter, externalKey = 0 }: BillingPanelProps) {
  const { data: entries, loading, refetch } = useMonthlyBillings(group.id, isCounter, externalKey);

  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await createMonthlyBilling({
        generatorGroupId: group.id,
        month,
        price: Number(price),
        isCounter,
      });
      setResult({ count: res.consumptionsCreated });
      setMonth('');
      setPrice('');
      setShowForm(false);
      void refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to generate billing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const label = isCounter ? 'Counter Customers' : 'Fixed Customers';
  const priceLabel = isCounter ? 'kWh Price ($)' : 'Price per Ampere ($/A)';
  const icon = isCounter
    ? <Gauge size={14} className={styles.panelIcon} />
    : <Zap size={14} className={styles.panelIcon} />;

  return (
    <div className={`${styles.billingPanel} ${isCounter ? styles.panelCounter : styles.panelFixed}`}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderLeft}>
          {icon}
          <span className={styles.panelTitle}>{label}</span>
          <span className={styles.panelBadge}>{entries.length} month{entries.length !== 1 ? 's' : ''}</span>
        </div>
        <button
          className={styles.addMonthBtn}
          onClick={() => { setShowForm((p) => !p); setError(null); setResult(null); }}
        >
          <Plus size={13} />
          Add Month
        </button>
      </div>

      {result && (
        <div className={styles.successBanner}>
          <CheckCircle size={14} />
          Generated {result.count} bill{result.count !== 1 ? 's' : ''} successfully.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.addForm}>
          <div className={styles.addFormFields}>
            <div className={styles.addFormField}>
              <label className={styles.addFormLabel}>Month</label>
              <input
                className={styles.addFormInput}
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
              />
            </div>
            <div className={styles.addFormField}>
              <label className={styles.addFormLabel}>{priceLabel}</label>
              <input
                className={styles.addFormInput}
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={13} />
              {error}
            </div>
          )}
          <div className={styles.addFormActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => { setShowForm(false); setError(null); }}
            >
              Cancel
            </button>
            <button type="submit" className={styles.generateBtn} disabled={submitting}>
              {submitting ? <><Loader size={13} className={styles.spin} /> Generating…</> : 'Generate Bills'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className={styles.panelEmpty}>Loading…</p>
      ) : entries.length === 0 ? (
        <p className={styles.panelEmpty}>No billing entries yet.</p>
      ) : (
        <table className={styles.historyTable}>
          <thead>
            <tr>
              <th>Month</th>
              <th>{isCounter ? 'kWh Price' : 'Price / Amp'}</th>
              <th>Bills Created</th>
              <th>Balance Formula</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{formatMonth(e.date)}</td>
                <td className={styles.priceCell}>${formatMoney(e.price, 3)}</td>
                <td>
                  <span className={styles.billCount}>{e.billsCreated}</span>
                </td>
                <td className={styles.formulaCell}>
                  {isCounter
                    ? <span>(Counter<sub>cur</sub> − Counter<sub>prev</sub>) × ${formatMoney(e.price, 3)} + fee</span>
                    : <span>Ampere × ${formatMoney(e.price, 3)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   RegionBillingPanel — applies to ALL groups in a region
───────────────────────────────────────────────── */
interface RegionBillingPanelProps {
  region: RegionModel;
  isCounter: boolean;
  onSuccess: () => void;
}

function RegionBillingPanel({ region, isCounter, onSuccess }: RegionBillingPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ totalBills: number; groupsOk: number; groupsFailed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    let totalBills = 0;
    let groupsOk = 0;
    let groupsFailed = 0;
    const errMsgs: string[] = [];

    await Promise.allSettled(
      region.groups.map(async (group) => {
        try {
          const res = await createMonthlyBilling({
            generatorGroupId: group.id,
            month,
            price: Number(price),
            isCounter,
          });
          totalBills += res.consumptionsCreated;
          groupsOk++;
        } catch (err: unknown) {
          groupsFailed++;
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          errMsgs.push(`${group.label}: ${msg ?? 'Failed'}`);
        }
      }),
    );

    setSubmitting(false);

    if (groupsOk > 0) {
      setResult({ totalBills, groupsOk, groupsFailed });
      onSuccess();
      if (groupsFailed === 0) {
        setMonth('');
        setPrice('');
        setShowForm(false);
      }
    } else {
      const summary = groupsFailed === region.groups.length
        ? 'All groups already have billing for this month.'
        : errMsgs.slice(0, 2).join(' · ') + (errMsgs.length > 2 ? ` (+${errMsgs.length - 2} more)` : '');
      setError(summary);
    }
  }

  const label = isCounter ? 'Counter Customers' : 'Fixed Customers';
  const priceLabel = isCounter ? 'kWh Price ($)' : 'Price per Ampere ($/A)';
  const icon = isCounter
    ? <Gauge size={14} className={styles.panelIcon} />
    : <Zap size={14} className={styles.panelIcon} />;

  return (
    <div className={`${styles.billingPanel} ${isCounter ? styles.panelCounter : styles.panelFixed}`}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderLeft}>
          {icon}
          <span className={styles.panelTitle}>{label}</span>
          <span className={styles.panelBadgeAll}>all {region.groups.length} groups</span>
        </div>
        <button
          className={styles.addMonthBtn}
          onClick={() => { setShowForm((p) => !p); setError(null); setResult(null); }}
        >
          <Plus size={13} />
          Add Month
        </button>
      </div>

      {result && (
        <div className={styles.successBanner}>
          <CheckCircle size={14} />
          Generated {result.totalBills} bill{result.totalBills !== 1 ? 's' : ''} across{' '}
          {result.groupsOk} group{result.groupsOk !== 1 ? 's' : ''}.
          {result.groupsFailed > 0 && (
            <span className={styles.successBannerNote}>
              {' '}({result.groupsFailed} skipped — month already exists)
            </span>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.addForm}>
          <div className={styles.addFormFields}>
            <div className={styles.addFormField}>
              <label className={styles.addFormLabel}>Month</label>
              <input
                className={styles.addFormInput}
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
              />
            </div>
            <div className={styles.addFormField}>
              <label className={styles.addFormLabel}>{priceLabel}</label>
              <input
                className={styles.addFormInput}
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={13} />
              {error}
            </div>
          )}
          <div className={styles.addFormActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => { setShowForm(false); setError(null); }}
            >
              Cancel
            </button>
            <button type="submit" className={styles.generateBtn} disabled={submitting}>
              {submitting
                ? <><Loader size={13} className={styles.spin} /> Generating…</>
                : `Generate for all ${region.groups.length} groups`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   GroupRow — one row per generator group
───────────────────────────────────────────────── */
interface GroupRowProps {
  group: RegionGroupModel;
  refetchKey?: number;
}

function GroupRow({ group, refetchKey = 0 }: GroupRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.groupRow}>
      <button className={styles.groupToggle} onClick={() => setExpanded((p) => !p)}>
        <div className={styles.groupToggleLeft}>
          <FolderTree size={14} color="#a78bfa" />
          <span className={styles.groupName}>{group.label}</span>
          <span className={styles.groupGenCount}>{group.items.length} generator{group.items.length !== 1 ? 's' : ''}</span>
        </div>
        {expanded ? <ChevronDown size={15} color="#6b7280" /> : <ChevronRight size={15} color="#6b7280" />}
      </button>

      {expanded && (
        <div className={styles.groupPanels}>
          <BillingPanel group={group} isCounter={true} externalKey={refetchKey} />
          <BillingPanel group={group} isCounter={false} externalKey={refetchKey} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Infrastructure add-cards
───────────────────────────────────────────────── */
interface AddRegionCardProps { onSuccess: () => void }

function AddRegionCard({ onSuccess }: AddRegionCardProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setOk(false); setErr(null);
    try {
      await createRegion(name.trim());
      setName(''); setOk(true); onSuccess();
      setTimeout(() => setOk(false), 3000);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    } finally { setSubmitting(false); }
  }

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <MapPin size={14} className={styles.infraIcon} style={{ color: '#60a5fa' }} />
        <span className={styles.infraCardTitle}>Add Region</span>
      </div>
      <form onSubmit={handleSubmit} className={styles.infraForm}>
        <div className={styles.infraField}>
          <label className={styles.infraLabel}>Region Name</label>
          <input
            className={styles.infraInput}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Sahel Alma"
            required
          />
        </div>
        {ok  && <div className={styles.infraSuccess}><CheckCircle size={13} /> Region added.</div>}
        {err && <div className={styles.infraError}><AlertCircle size={13} /> {err}</div>}
        <button className={styles.infraBtn} disabled={submitting || !name.trim()}>
          {submitting ? <Loader size={13} className={styles.spin} /> : <Plus size={13} />}
          Add Region
        </button>
      </form>
    </div>
  );
}

interface AddGroupCardProps { regions: RegionModel[]; onSuccess: () => void }

function AddGroupCard({ regions, onSuccess }: AddGroupCardProps) {
  const [name, setName] = useState('');
  const [regionId, setRegionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setOk(false); setErr(null);
    try {
      await createGeneratorGroup(name.trim(), regionId);
      setName(''); setRegionId(''); setOk(true); onSuccess();
      setTimeout(() => setOk(false), 3000);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    } finally { setSubmitting(false); }
  }

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <FolderTree size={14} className={styles.infraIcon} style={{ color: '#a78bfa' }} />
        <span className={styles.infraCardTitle}>Add Generator Group</span>
      </div>
      <form onSubmit={handleSubmit} className={styles.infraForm}>
        <div className={styles.infraField}>
          <label className={styles.infraLabel}>Group Name</label>
          <input
            className={styles.infraInput}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Jounieh"
            required
          />
        </div>
        <div className={styles.infraField}>
          <label className={styles.infraLabel}>Region</label>
          <select
            className={styles.infraSelect}
            value={regionId}
            onChange={e => setRegionId(e.target.value)}
            required
          >
            <option value="">Select region…</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
        {ok  && <div className={styles.infraSuccess}><CheckCircle size={13} /> Group added.</div>}
        {err && <div className={styles.infraError}><AlertCircle size={13} /> {err}</div>}
        <button className={styles.infraBtn} disabled={submitting || !name.trim() || !regionId}>
          {submitting ? <Loader size={13} className={styles.spin} /> : <Plus size={13} />}
          Add Group
        </button>
      </form>
    </div>
  );
}

interface AddGeneratorCardProps { regions: RegionModel[]; onSuccess?: () => void }

function AddGeneratorCard({ regions, onSuccess }: AddGeneratorCardProps) {
  const allGroups = regions.flatMap(r =>
    r.groups.map(g => ({ id: g.id, label: g.label, regionLabel: r.label }))
  );

  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [kva, setKva] = useState('');
  const [diesel, setDiesel] = useState('');
  const [status, setStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setOk(false); setErr(null);
    try {
      await createGenerator({
        name: name.trim(),
        generatorGroupId: groupId,
        kvaCapacity: Number(kva),
        averageDieselConsumption: Number(diesel),
        status,
      });
      setName(''); setGroupId(''); setKva(''); setDiesel(''); setStatus('active');
      setOk(true);
      onSuccess?.();
      setTimeout(() => setOk(false), 3000);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    } finally { setSubmitting(false); }
  }

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <PlugZap size={14} className={styles.infraIcon} style={{ color: '#34d399' }} />
        <span className={styles.infraCardTitle}>Add Generator</span>
      </div>
      <form onSubmit={handleSubmit} className={styles.infraForm}>
        <div className={styles.infraField}>
          <label className={styles.infraLabel}>Generator Name</label>
          <input
            className={styles.infraInput}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Gen #3"
            required
          />
        </div>
        <div className={styles.infraField}>
          <label className={styles.infraLabel}>Generator Group</label>
          <select
            className={styles.infraSelect}
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            required
          >
            <option value="">Select group…</option>
            {allGroups.map(g => (
              <option key={g.id} value={g.id}>{g.regionLabel} › {g.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.infraRow}>
          <div className={styles.infraField}>
            <label className={styles.infraLabel}>kVA Capacity</label>
            <input
              className={styles.infraInput}
              type="number" min="0" step="0.1"
              value={kva}
              onChange={e => setKva(e.target.value)}
              placeholder="0"
              required
            />
          </div>
          <div className={styles.infraField}>
            <label className={styles.infraLabel}>Diesel (L/hr)</label>
            <input
              className={styles.infraInput}
              type="number" min="0" step="0.01"
              value={diesel}
              onChange={e => setDiesel(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
        </div>
        <div className={styles.infraField}>
          <label className={styles.infraLabel}>Status</label>
          <select
            className={styles.infraSelect}
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        {ok  && <div className={styles.infraSuccess}><CheckCircle size={13} /> Generator added.</div>}
        {err && <div className={styles.infraError}><AlertCircle size={13} /> {err}</div>}
        <button
          className={styles.infraBtn}
          disabled={submitting || !name.trim() || !groupId || !kva || !diesel}
        >
          {submitting ? <Loader size={13} className={styles.spin} /> : <Plus size={13} />}
          Add Generator
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Shared helpers
───────────────────────────────────────────────── */
function apiErr(e: unknown): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    'An error occurred.'
  );
}

/* ─────────────────────────────────────────────────
   ManageRegions
───────────────────────────────────────────────── */
function ManageRegions({ onRefetch }: { onRefetch: () => void }) {
  const { data: regions } = useRegionsContext();
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() { setEditId(null); setDeleteId(null); setErr(null); }

  async function handleSave(id: string) {
    setBusy(true); setErr(null);
    try { await updateRegion(id, editName.trim()); reset(); onRefetch(); }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    setBusy(true); setErr(null);
    try { await deleteRegion(id); reset(); onRefetch(); }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <MapPin size={14} style={{ color: '#60a5fa' }} />
        <span className={styles.infraCardTitle}>Regions</span>
        <span className={styles.manageBadge}>{regions.length}</span>
      </div>
      <div className={styles.manageList}>
        {regions.length === 0 && <p className={styles.manageEmpty}>No regions yet.</p>}
        {regions.map((r) => {
          if (editId === r.id) return (
            <div key={r.id} className={`${styles.manageItem} ${styles.manageItemActive}`}>
              <input className={styles.manageInput} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Region name" />
              {err && <p className={styles.manageErr}>{err}</p>}
              <div className={styles.manageRowBtns}>
                <button className={styles.manageSaveBtn} disabled={busy || !editName.trim()} onClick={() => handleSave(r.id)}>{busy ? '…' : 'Save'}</button>
                <button className={styles.manageCancelBtn} onClick={reset}>Cancel</button>
              </div>
            </div>
          );
          if (deleteId === r.id) return (
            <div key={r.id} className={`${styles.manageItem} ${styles.manageItemDanger}`}>
              <span className={styles.manageConfirmText}>Delete "{r.label}"?</span>
              {err && <p className={styles.manageErr}>{err}</p>}
              <div className={styles.manageRowBtns}>
                <button className={styles.manageConfirmBtn} disabled={busy} onClick={() => handleDelete(r.id)}>{busy ? '…' : 'Delete'}</button>
                <button className={styles.manageCancelBtn} onClick={reset}>Cancel</button>
              </div>
            </div>
          );
          return (
            <div key={r.id} className={styles.manageItem}>
              <div className={styles.manageItemLeft}>
                <span className={styles.manageItemName}>{r.label}</span>
                <span className={styles.manageItemMeta}>{r.groups.length} group{r.groups.length !== 1 ? 's' : ''}</span>
              </div>
              <div className={styles.manageItemActions}>
                <button className={styles.manageEditBtn} onClick={() => { setEditId(r.id); setEditName(r.label); setDeleteId(null); setErr(null); }} title="Edit"><Pencil size={12} /></button>
                <button className={styles.manageDeleteBtn} onClick={() => { setDeleteId(r.id); setEditId(null); setErr(null); }} title="Delete"><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   ManageGroups
───────────────────────────────────────────────── */
function ManageGroups({ onRefetch }: { onRefetch: () => void }) {
  const { data: regions } = useRegionsContext();
  const groups = regions.flatMap(r => r.groups.map(g => ({ ...g, regionId: r.id, regionLabel: r.label })));

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRegionId, setEditRegionId] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() { setEditId(null); setDeleteId(null); setErr(null); }

  async function handleSave(id: string) {
    setBusy(true); setErr(null);
    try { await updateGeneratorGroup(id, { name: editName.trim(), regionId: editRegionId }); reset(); onRefetch(); }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    setBusy(true); setErr(null);
    try { await deleteGeneratorGroup(id); reset(); onRefetch(); }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <FolderTree size={14} style={{ color: '#a78bfa' }} />
        <span className={styles.infraCardTitle}>Generator Groups</span>
        <span className={styles.manageBadge}>{groups.length}</span>
      </div>
      <div className={styles.manageList}>
        {groups.length === 0 && <p className={styles.manageEmpty}>No groups yet.</p>}
        {groups.map((g) => {
          if (editId === g.id) return (
            <div key={g.id} className={`${styles.manageItem} ${styles.manageItemActive}`}>
              <input className={styles.manageInput} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Group name" />
              <select className={styles.manageInput} value={editRegionId} onChange={e => setEditRegionId(e.target.value)}>
                {regions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              {err && <p className={styles.manageErr}>{err}</p>}
              <div className={styles.manageRowBtns}>
                <button className={styles.manageSaveBtn} disabled={busy || !editName.trim()} onClick={() => handleSave(g.id)}>{busy ? '…' : 'Save'}</button>
                <button className={styles.manageCancelBtn} onClick={reset}>Cancel</button>
              </div>
            </div>
          );
          if (deleteId === g.id) return (
            <div key={g.id} className={`${styles.manageItem} ${styles.manageItemDanger}`}>
              <span className={styles.manageConfirmText}>Delete "{g.label}"?</span>
              {err && <p className={styles.manageErr}>{err}</p>}
              <div className={styles.manageRowBtns}>
                <button className={styles.manageConfirmBtn} disabled={busy} onClick={() => handleDelete(g.id)}>{busy ? '…' : 'Delete'}</button>
                <button className={styles.manageCancelBtn} onClick={reset}>Cancel</button>
              </div>
            </div>
          );
          return (
            <div key={g.id} className={styles.manageItem}>
              <div className={styles.manageItemLeft}>
                <span className={styles.manageItemName}>{g.label}</span>
                <span className={styles.manageItemMeta}>{g.regionLabel}</span>
              </div>
              <div className={styles.manageItemActions}>
                <button className={styles.manageEditBtn} onClick={() => { setEditId(g.id); setEditName(g.label); setEditRegionId(g.regionId); setDeleteId(null); setErr(null); }} title="Edit"><Pencil size={12} /></button>
                <button className={styles.manageDeleteBtn} onClick={() => { setDeleteId(g.id); setEditId(null); setErr(null); }} title="Delete"><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   ManageGenerators
───────────────────────────────────────────────── */
function ManageGenerators({ onRefetch }: { onRefetch: () => void }) {
  const { data: regions } = useRegionsContext();
  const allGroups = regions.flatMap(r => r.groups.map(g => ({ id: g.id, label: g.label, regionLabel: r.label })));
  const generators = regions.flatMap(r =>
    r.groups.flatMap(g => g.items.map(i => ({ ...i, groupId: g.id, groupLabel: g.label })))
  );

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', groupId: '', kva: '', diesel: '', status: 'active' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() { setEditId(null); setDeleteId(null); setErr(null); }
  function patchEdit(patch: Partial<typeof editForm>) { setEditForm(f => ({ ...f, ...patch })); }

  async function handleSave(id: string) {
    setBusy(true); setErr(null);
    try {
      await updateGenerator(id, {
        name: editForm.name.trim(),
        generatorGroupId: editForm.groupId,
        kvaCapacity: Number(editForm.kva),
        averageDieselConsumption: Number(editForm.diesel),
        status: editForm.status,
      });
      reset(); onRefetch();
    }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    setBusy(true); setErr(null);
    try { await deleteGenerator(id); reset(); onRefetch(); }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <PlugZap size={14} style={{ color: '#34d399' }} />
        <span className={styles.infraCardTitle}>Generators</span>
        <span className={styles.manageBadge}>{generators.length}</span>
      </div>
      <div className={styles.manageList}>
        {generators.length === 0 && <p className={styles.manageEmpty}>No generators yet.</p>}
        {generators.map((g) => {
          if (editId === g.id) return (
            <div key={g.id} className={`${styles.manageItem} ${styles.manageItemActive}`}>
              <input className={styles.manageInput} value={editForm.name} onChange={e => patchEdit({ name: e.target.value })} placeholder="Name" />
              <select className={styles.manageInput} value={editForm.groupId} onChange={e => patchEdit({ groupId: e.target.value })}>
                {allGroups.map(gr => <option key={gr.id} value={gr.id}>{gr.regionLabel} › {gr.label}</option>)}
              </select>
              <div className={styles.manageEditRow}>
                <input className={styles.manageInput} type="number" value={editForm.kva} onChange={e => patchEdit({ kva: e.target.value })} placeholder="kVA" />
                <input className={styles.manageInput} type="number" value={editForm.diesel} onChange={e => patchEdit({ diesel: e.target.value })} placeholder="L/hr" />
                <select className={styles.manageInput} value={editForm.status} onChange={e => patchEdit({ status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              {err && <p className={styles.manageErr}>{err}</p>}
              <div className={styles.manageRowBtns}>
                <button className={styles.manageSaveBtn} disabled={busy || !editForm.name.trim()} onClick={() => handleSave(g.id)}>{busy ? '…' : 'Save'}</button>
                <button className={styles.manageCancelBtn} onClick={reset}>Cancel</button>
              </div>
            </div>
          );
          if (deleteId === g.id) return (
            <div key={g.id} className={`${styles.manageItem} ${styles.manageItemDanger}`}>
              <span className={styles.manageConfirmText}>Delete "{g.label}"?</span>
              {err && <p className={styles.manageErr}>{err}</p>}
              <div className={styles.manageRowBtns}>
                <button className={styles.manageConfirmBtn} disabled={busy} onClick={() => handleDelete(g.id)}>{busy ? '…' : 'Delete'}</button>
                <button className={styles.manageCancelBtn} onClick={reset}>Cancel</button>
              </div>
            </div>
          );
          return (
            <div key={g.id} className={styles.manageItem}>
              <div className={styles.manageItemLeft}>
                <span className={styles.manageItemName}>{g.label}</span>
                <span className={styles.manageItemMeta}>{g.groupLabel} · {g.kvaCapacity} kVA · {g.status}</span>
              </div>
              <div className={styles.manageItemActions}>
                <button className={styles.manageEditBtn} onClick={() => { setEditId(g.id); setEditForm({ name: g.label, groupId: g.groupId, kva: String(g.kvaCapacity), diesel: String(g.averageDieselConsumption), status: g.status }); setDeleteId(null); setErr(null); }} title="Edit"><Pencil size={12} /></button>
                <button className={styles.manageDeleteBtn} onClick={() => { setDeleteId(g.id); setEditId(null); setErr(null); }} title="Delete"><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Receipt company info — editable title + phone numbers
───────────────────────────────────────────────── */
function ReceiptCompanyInfoCard() {
  const { companyInfo, setCompanyInfo } = useReceiptTemplate();
  const [name, setName] = useState(companyInfo.name);
  const [phone, setPhone] = useState(companyInfo.phone);
  const [maintenancePhone, setMaintenancePhone] = useState(companyInfo.maintenancePhone);
  const [saved, setSaved] = useState(false);

  const dirty = name !== companyInfo.name || phone !== companyInfo.phone || maintenancePhone !== companyInfo.maintenancePhone;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCompanyInfo({ name: name.trim(), phone: phone.trim(), maintenancePhone: maintenancePhone.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className={styles.infraCard} style={{ maxWidth: 420 }}>
      <div className={styles.infraCardHeader}>
        <Pencil size={14} className={styles.infraIcon} style={{ color: '#60a5fa' }} />
        <span className={styles.infraCardTitle}>Receipt Header</span>
      </div>
      <form onSubmit={handleSubmit} className={styles.infraForm}>
        <div className={styles.infraField}>
          <label className={styles.infraLabel}>Company Name</label>
          <input
            className={styles.infraInput}
            value={name}
            onChange={e => setName(e.target.value)}
            dir="rtl"
            required
          />
        </div>
        <div className={styles.infraRow}>
          <div className={styles.infraField}>
            <label className={styles.infraLabel}>Phone</label>
            <input className={styles.infraInput} value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          <div className={styles.infraField}>
            <label className={styles.infraLabel}>Maintenance Phone</label>
            <input className={styles.infraInput} value={maintenancePhone} onChange={e => setMaintenancePhone(e.target.value)} required />
          </div>
        </div>
        {saved && <div className={styles.infraSuccess}><CheckCircle size={13} /> Saved.</div>}
        <button className={styles.infraBtn} disabled={!dirty || !name.trim() || !phone.trim() || !maintenancePhone.trim()}>
          <CheckCircle size={13} /> Save
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Accounts — list existing accounts + create new ones.
   No public sign-up: only someone already logged in can add an account.
───────────────────────────────────────────────── */
function CreateAccountCard({ onSuccess }: { onSuccess: () => void }) {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const { data: regions } = useRegionsContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'CUSTOMER'>(isSuperAdmin ? 'ADMIN' : 'CUSTOMER');
  const [groupId, setGroupId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allGroups = regions.flatMap((r) => r.groups.map((g) => ({ id: g.id, label: g.label, regionLabel: r.label })));

  useEffect(() => {
    if (role !== 'CUSTOMER' || !groupId) { setCustomers([]); return; }
    let cancelled = false;
    setCustomersLoading(true);
    getCustomers(groupId)
      .then((data) => { if (!cancelled) setCustomers(data); })
      .catch(() => { if (!cancelled) setCustomers([]); })
      .finally(() => { if (!cancelled) setCustomersLoading(false); });
    return () => { cancelled = true; };
  }, [role, groupId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setOk(false); setErr(null);
    try {
      await registerAccount(email.trim(), password, role, name.trim() || undefined, role === 'CUSTOMER' ? customerId : undefined);
      setEmail(''); setPassword(''); setName(''); setGroupId(''); setCustomerId(''); setOk(true); onSuccess();
      setTimeout(() => setOk(false), 3000);
    } catch (e: unknown) {
      setErr(apiErr(e));
    } finally { setSubmitting(false); }
  }

  const needsCustomer = role === 'CUSTOMER';
  const canSubmit = email.trim() && password.length >= 8 && (!needsCustomer || customerId);

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <UserPlus size={14} className={styles.infraIcon} style={{ color: '#34d399' }} />
        <span className={styles.infraCardTitle}>Add Account</span>
      </div>
      <form onSubmit={handleSubmit} className={styles.infraForm}>
        {isSuperAdmin && (
          <div className={styles.infraField}>
            <label className={styles.infraLabel}>Account Type</label>
            <select
              className={styles.infraSelect}
              value={role}
              onChange={e => { setRole(e.target.value as 'ADMIN' | 'CUSTOMER'); setGroupId(''); setCustomerId(''); }}
            >
              <option value="ADMIN">Admin (client)</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>
        )}

        {needsCustomer && (
          <>
            <div className={styles.infraField}>
              <label className={styles.infraLabel}>Generator Group</label>
              <select
                className={styles.infraSelect}
                value={groupId}
                onChange={e => { setGroupId(e.target.value); setCustomerId(''); }}
                required
              >
                <option value="">Select group…</option>
                {allGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.regionLabel} › {g.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.infraField}>
              <label className={styles.infraLabel}>Customer</label>
              <select
                className={styles.infraSelect}
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                disabled={!groupId || customersLoading}
                required
              >
                <option value="">{customersLoading ? 'Loading…' : 'Select customer…'}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{[c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ')}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className={styles.infraField}>
          <label className={styles.infraLabel}>Full Name</label>
          <input
            className={styles.infraInput}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className={styles.infraField}>
          <label className={styles.infraLabel}>Email</label>
          <input
            className={styles.infraInput}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />
        </div>
        <div className={styles.infraField}>
          <label className={styles.infraLabel}>Password</label>
          <input
            className={styles.infraInput}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </div>
        {ok  && <div className={styles.infraSuccess}><CheckCircle size={13} /> Account created.</div>}
        {err && <div className={styles.infraError}><AlertCircle size={13} /> {err}</div>}
        <button className={styles.infraBtn} disabled={submitting || !canSubmit}>
          {submitting ? <Loader size={13} className={styles.spin} /> : <Plus size={13} />}
          Create Account
        </button>
      </form>
    </div>
  );
}

function AccountsList({ refreshKey }: { refreshKey: number }) {
  const [accounts, setAccounts] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUsers()
      .then((data) => { if (!cancelled) setAccounts(data); })
      .catch((e: unknown) => { if (!cancelled) setErr(apiErr(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <Users size={14} style={{ color: '#60a5fa' }} />
        <span className={styles.infraCardTitle}>Accounts</span>
        <span className={styles.manageBadge}>{accounts.length}</span>
      </div>
      <div className={styles.manageList}>
        {loading && <p className={styles.manageEmpty}>Loading…</p>}
        {err && <p className={styles.manageErr}>{err}</p>}
        {!loading && !err && accounts.length === 0 && <p className={styles.manageEmpty}>No accounts yet.</p>}
        {!loading && !err && accounts.map((a) => (
          <div key={a.id} className={styles.manageItem}>
            <div className={styles.manageItemLeft}>
              <span className={styles.manageItemName}>{a.name || a.email}</span>
              <span className={styles.manageItemMeta}>{a.email}</span>
            </div>
            <span className={styles.manageBadge}>{a.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Platform Billing — ADMIN's own subscription to the platform, plus
   Stripe Connect onboarding (ADMIN and SUPERADMIN, so a SUPERADMIN who owns
   regions directly can still receive their own customers' payments).
───────────────────────────────────────────────── */
function SubscriptionCard() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSubscriptionStatus()
      .then((data) => { if (!cancelled) setStatus(data); })
      .catch((e: unknown) => { if (!cancelled) setErr(apiErr(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleAction() {
    setActionLoading(true); setErr(null);
    try {
      const needsNewCheckout = !status?.subscriptionStatus || status.subscriptionStatus === 'canceled';
      const { url } = needsNewCheckout ? await createSubscriptionCheckout() : await createBillingPortalSession();
      window.location.href = url;
    } catch (e: unknown) {
      setErr(apiErr(e));
      setActionLoading(false);
    }
  }

  const needsNewCheckout = !status?.subscriptionStatus || status.subscriptionStatus === 'canceled';

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <CheckCircle size={14} style={{ color: '#60a5fa' }} />
        <span className={styles.infraCardTitle}>Subscription</span>
      </div>
      {loading ? (
        <p className={styles.manageEmpty}>Loading…</p>
      ) : (
        <div className={styles.infraForm}>
          <p className={styles.sectionDesc} style={{ margin: 0 }}>
            Status: <strong>{status?.subscriptionStatus ?? 'not subscribed'}</strong>
            {status?.currentPeriodEnd && !needsNewCheckout && (
              <> — renews {new Date(status.currentPeriodEnd).toLocaleDateString()}</>
            )}
          </p>
          {status && (
            <p className={styles.sectionDesc} style={{ margin: 0 }}>
              {status.customerCount} customer{status.customerCount !== 1 ? 's' : ''} × ${status.pricePerCustomerUsd.toFixed(2)} = <strong>${status.estimatedMonthlyUsd.toFixed(2)}/month</strong>
            </p>
          )}
          {err && <div className={styles.infraError}><AlertCircle size={13} /> {err}</div>}
          <button className={styles.infraBtn} onClick={handleAction} disabled={actionLoading}>
            {actionLoading ? <Loader size={13} className={styles.spin} /> : <CheckCircle size={13} />}
            {needsNewCheckout ? 'Subscribe' : 'Manage subscription'}
          </button>
        </div>
      )}
    </div>
  );
}

function ConnectCard() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getConnectStatus()
      .then((data) => { if (!cancelled) setStatus(data); })
      .catch((e: unknown) => { if (!cancelled) setErr(apiErr(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleConnect() {
    setActionLoading(true); setErr(null);
    try {
      const { url } = await createConnectOnboardingLink();
      window.location.href = url;
    } catch (e: unknown) {
      setErr(apiErr(e));
      setActionLoading(false);
    }
  }

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <PlugZap size={14} style={{ color: '#34d399' }} />
        <span className={styles.infraCardTitle}>Receive customer payments</span>
      </div>
      {loading ? (
        <p className={styles.manageEmpty}>Loading…</p>
      ) : (
        <div className={styles.infraForm}>
          <p className={styles.sectionDesc} style={{ margin: 0 }}>
            {status?.onboarded
              ? 'Connected — your customers can pay their bills online, sent directly to your Stripe account.'
              : 'Connect a Stripe account so your customers can pay their electricity bills online.'}
          </p>
          {err && <div className={styles.infraError}><AlertCircle size={13} /> {err}</div>}
          {!status?.onboarded && (
            <button className={styles.infraBtn} onClick={handleConnect} disabled={actionLoading}>
              {actionLoading ? <Loader size={13} className={styles.spin} /> : <PlugZap size={13} />}
              Connect with Stripe
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Whish Money — manual payment confirmation (ADMIN + SUPERADMIN publish
   their own number; ADMIN can pay their subscription via Whish; both
   review incoming Whish claims for customers they own).
───────────────────────────────────────────────── */
function WhishPhoneNumberCard() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setOk(false); setErr(null);
    try {
      await setWhishPhoneNumber(phoneNumber.trim());
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (e: unknown) {
      setErr(apiErr(e));
    } finally { setSubmitting(false); }
  }

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <Smartphone size={14} className={styles.infraIcon} style={{ color: '#34d399' }} />
        <span className={styles.infraCardTitle}>Whish Money Number</span>
      </div>
      <form onSubmit={handleSubmit} className={styles.infraForm}>
        <p className={styles.sectionDesc} style={{ margin: 0 }}>
          Shown to whoever needs to pay you (your customers, or the superadmin for your subscription).
        </p>
        <div className={styles.infraField}>
          <label className={styles.infraLabel}>Whish Phone Number</label>
          <input
            className={styles.infraInput}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+961 70 000 000"
            required
          />
        </div>
        {ok && <div className={styles.infraSuccess}><CheckCircle size={13} /> Saved.</div>}
        {err && <div className={styles.infraError}><AlertCircle size={13} /> {err}</div>}
        <button className={styles.infraBtn} disabled={submitting || !phoneNumber.trim()}>
          {submitting ? <Loader size={13} className={styles.spin} /> : <CheckCircle size={13} />}
          Save
        </button>
      </form>
    </div>
  );
}

function WhishSubscriptionCard() {
  const [recipient, setRecipient] = useState<WhishRecipient | null>(null);
  const [claims, setClaims] = useState<SubscriptionClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([getSubscriptionRecipient(), getMySubscriptionClaims()])
      .then(([r, c]) => { setRecipient(r); setClaims(c); })
      .catch((e: unknown) => setErr(apiErr(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setErr(null);
    try {
      await submitSubscriptionClaim(referenceNumber.trim());
      setReferenceNumber(''); setShowForm(false);
      load();
    } catch (e: unknown) {
      setErr(apiErr(e));
    } finally { setSubmitting(false); }
  }

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <Smartphone size={14} className={styles.infraIcon} style={{ color: '#34d399' }} />
        <span className={styles.infraCardTitle}>Pay via Whish Money</span>
      </div>
      {loading ? (
        <p className={styles.manageEmpty}>Loading…</p>
      ) : (
        <div className={styles.infraForm}>
          {recipient?.phoneNumber ? (
            <p className={styles.sectionDesc} style={{ margin: 0 }}>
              {recipient.customerCount} customer{recipient.customerCount !== 1 ? 's' : ''} × ${recipient.pricePerCustomerUsd?.toFixed(2)} = <strong>${recipient.priceUsd}</strong>. Send this via the Whish app to <strong>{recipient.phoneNumber}</strong>, then submit your reference number below.
            </p>
          ) : (
            <p className={styles.sectionDesc} style={{ margin: 0 }}>
              The superadmin hasn't published a Whish Money number yet.
            </p>
          )}

          {!showForm && recipient?.phoneNumber && (
            <button className={styles.infraBtn} onClick={() => setShowForm(true)}>
              <Plus size={13} /> Submit payment reference
            </button>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className={styles.infraForm}>
              <div className={styles.infraField}>
                <label className={styles.infraLabel}>Whish Reference Number</label>
                <input
                  className={styles.infraInput}
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  required
                />
              </div>
              {err && <div className={styles.infraError}><AlertCircle size={13} /> {err}</div>}
              <div className={styles.addFormActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className={styles.generateBtn} disabled={submitting || !referenceNumber.trim()}>
                  {submitting ? <><Loader size={13} className={styles.spin} /> Submitting…</> : 'Submit'}
                </button>
              </div>
            </form>
          )}

          {claims.length > 0 && (
            <div className={styles.manageList} style={{ marginTop: '0.5rem' }}>
              {claims.map((c) => (
                <div key={c.id} className={styles.manageItem}>
                  <div className={styles.manageItemLeft}>
                    <span className={styles.manageItemName}>${c.amountClaimed} — {c.referenceNumber}</span>
                    <span className={styles.manageItemMeta}>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className={styles.manageBadge}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WhishReviewQueue() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const [subClaims, setSubClaims] = useState<SubscriptionClaim[]>([]);
  const [custClaims, setCustClaims] = useState<CustomerPaymentClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      isSuperAdmin ? getPendingSubscriptionClaims() : Promise.resolve([]),
      listCustomerPaymentClaims(),
    ])
      .then(([s, c]) => { setSubClaims(s); setCustClaims(c); })
      .catch((e: unknown) => setErr(apiErr(e)))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [isSuperAdmin]);

  async function handleSubApprove(id: string) {
    setBusyId(id); setErr(null);
    try { await approveSubscriptionClaim(id); load(); }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusyId(null); }
  }
  async function handleSubReject(id: string) {
    setBusyId(id); setErr(null);
    try { await rejectSubscriptionClaim(id); load(); }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusyId(null); }
  }
  async function handleCustApprove(id: string) {
    setBusyId(id); setErr(null);
    try { await approveCustomerPaymentClaim(id); load(); }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusyId(null); }
  }
  async function handleCustReject(id: string) {
    setBusyId(id); setErr(null);
    try { await rejectCustomerPaymentClaim(id); load(); }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusyId(null); }
  }

  const nothingPending = subClaims.length === 0 && custClaims.length === 0;

  return (
    <div className={styles.infraCard}>
      <div className={styles.infraCardHeader}>
        <Smartphone size={14} className={styles.infraIcon} style={{ color: '#60a5fa' }} />
        <span className={styles.infraCardTitle}>Pending Whish Payments</span>
        <span className={styles.manageBadge}>{subClaims.length + custClaims.length}</span>
      </div>
      {loading ? (
        <p className={styles.manageEmpty}>Loading…</p>
      ) : (
        <>
          {err && <p className={styles.manageErr}>{err}</p>}
          {nothingPending && <p className={styles.manageEmpty}>No pending Whish payments to review.</p>}

          {subClaims.length > 0 && (
            <div className={styles.manageList}>
              <p className={styles.sectionDesc} style={{ margin: '0 0 0.25rem' }}>Subscription claims</p>
              {subClaims.map((c) => (
                <div key={c.id} className={styles.manageItem}>
                  <div className={styles.manageItemLeft}>
                    <span className={styles.manageItemName}>{c.admin?.name || c.admin?.email} — ${c.amountClaimed}</span>
                    <span className={styles.manageItemMeta}>Ref: {c.referenceNumber}</span>
                  </div>
                  <div className={styles.manageItemActions}>
                    <button className={styles.manageEditBtn} disabled={busyId === c.id} onClick={() => handleSubApprove(c.id)} title="Approve"><CheckCircle size={12} /></button>
                    <button className={styles.manageDeleteBtn} disabled={busyId === c.id} onClick={() => handleSubReject(c.id)} title="Reject"><XCircle size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {custClaims.length > 0 && (
            <div className={styles.manageList} style={{ marginTop: subClaims.length > 0 ? '0.75rem' : 0 }}>
              <p className={styles.sectionDesc} style={{ margin: '0 0 0.25rem' }}>Customer bill payments</p>
              {custClaims.map((c) => (
                <div key={c.id} className={styles.manageItem}>
                  <div className={styles.manageItemLeft}>
                    <span className={styles.manageItemName}>
                      {c.customer ? [c.customer.firstName, c.customer.middleName, c.customer.lastName].filter(Boolean).join(' ') : 'Customer'} — ${c.amount}
                    </span>
                    <span className={styles.manageItemMeta}>Ref: {c.referenceNumber}</span>
                  </div>
                  <div className={styles.manageItemActions}>
                    <button className={styles.manageEditBtn} disabled={busyId === c.id} onClick={() => handleCustApprove(c.id)} title="Approve"><CheckCircle size={12} /></button>
                    <button className={styles.manageDeleteBtn} disabled={busyId === c.id} onClick={() => handleCustReject(c.id)} title="Reject"><XCircle size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SettingsView — main page
───────────────────────────────────────────────── */
export function SettingsView() {
  const { data: regions, loading, error, refetch: refetchRegions } = useRegions();
  const [collapsedRegions, setCollapsedRegions] = useState<Set<string>>(new Set());
  const [regionKeys, setRegionKeys] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'infrastructure' | 'billing' | 'receipts' | 'accounts' | 'platformBilling'>('infrastructure');
  const { template: selectedReceiptTemplate, setTemplate: setSelectedReceiptTemplate } = useReceiptTemplate();
  const [accountsRefreshKey, setAccountsRefreshKey] = useState(0);
  const { user } = useAuth();
  const canSeePlatformBilling = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  function toggleRegion(id: string) {
    setCollapsedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function bumpRegionKey(regionId: string) {
    setRegionKeys((prev) => ({ ...prev, [regionId]: (prev[regionId] ?? 0) + 1 }));
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageSubtitle}>Configure monthly billing for each generator group</p>
      </div>

      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'infrastructure' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('infrastructure')}
        >
          Infrastructure
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'billing' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          Monthly Billing
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'receipts' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('receipts')}
        >
          Receipts
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'accounts' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          Accounts
        </button>
        {canSeePlatformBilling && (
          <button
            className={`${styles.tabBtn} ${activeTab === 'platformBilling' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('platformBilling')}
          >
            Platform Billing
          </button>
        )}
      </div>

      <div className={styles.content}>
        {activeTab === 'infrastructure' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Infrastructure</h2>
            <p className={styles.sectionDesc}>
              Create regions, generator groups, and generators. New groups and generators will appear
              immediately in billing and the main generator views.
            </p>
            <div className={styles.infraGrid}>
              <AddRegionCard onSuccess={() => void refetchRegions()} />
              <AddGroupCard regions={regions} onSuccess={() => void refetchRegions()} />
              <AddGeneratorCard regions={regions} onSuccess={() => void refetchRegions()} />
            </div>

            <div className={styles.infraGrid} style={{ marginTop: '1.25rem' }}>
              <ManageRegions onRefetch={() => void refetchRegions()} />
              <ManageGroups onRefetch={() => void refetchRegions()} />
              <ManageGenerators onRefetch={() => void refetchRegions()} />
            </div>
          </section>
        )}

        {activeTab === 'billing' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Monthly Billing</h2>
            <p className={styles.sectionDesc}>
              For each group, set the kWh price for counter customers and the per-amp price for fixed customers.
              You can also apply a month to all groups in a region at once.
            </p>

            {loading && <p className={styles.stateMsg}>Loading regions…</p>}
            {error && <p className={styles.stateErr}>{error}</p>}

            {!loading && !error && regions.map((region) => {
              const collapsed = collapsedRegions.has(region.id);
              const refetchKey = regionKeys[region.id] ?? 0;
              return (
                <div key={region.id} className={styles.regionBlock}>
                  <button className={styles.regionHeader} onClick={() => toggleRegion(region.id)}>
                    <div className={styles.regionHeaderLeft}>
                      <MapPin size={14} className={styles.regionIcon} />
                      <span className={styles.regionName}>{region.label}</span>
                      <span className={styles.regionGroupCount}>
                        {region.groups.length} group{region.groups.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {collapsed
                      ? <ChevronRight size={15} color="#6b7280" />
                      : <ChevronDown size={15} color="#6b7280" />}
                  </button>

                  {!collapsed && (
                    <div className={styles.regionGroups}>
                      {/* Region-level billing — only shown when 2+ groups */}
                      {region.groups.length > 1 && (
                        <div className={styles.regionBillingSection}>
                          <div className={styles.regionBillingHeader}>
                            <Layers size={13} className={styles.regionBillingIcon} />
                            <span className={styles.regionBillingLabel}>Apply to all groups</span>
                          </div>
                          <div className={styles.regionBillingPanels}>
                            <RegionBillingPanel
                              region={region}
                              isCounter={true}
                              onSuccess={() => bumpRegionKey(region.id)}
                            />
                            <RegionBillingPanel
                              region={region}
                              isCounter={false}
                              onSuccess={() => bumpRegionKey(region.id)}
                            />
                          </div>
                        </div>
                      )}

                      {/* Individual group rows */}
                      {region.groups.length === 0
                        ? <p className={styles.stateMsg}>No groups in this region.</p>
                        : region.groups.map((group) => (
                            <GroupRow key={group.id} group={group} refetchKey={refetchKey} />
                          ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {activeTab === 'receipts' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Receipt Header</h2>
            <p className={styles.sectionDesc}>
              The title and phone numbers printed at the top of every receipt.
            </p>
            <ReceiptCompanyInfoCard />

            <h2 className={styles.sectionTitle} style={{ marginTop: '28px' }}>Receipt Template</h2>
            <p className={styles.sectionDesc}>
              Choose the layout used for printed customer receipts. All templates are sized for a DL
              envelope (220 × 110mm) and printed in Arabic — this only changes the look, not the data.
            </p>

            <div className={styles.receiptSelectedPreview}>
              <ReceiptTemplatePreview template={selectedReceiptTemplate} scale={0.62} />
              <div className={styles.receiptSelectedPreviewLabel}>
                Currently selected: <strong>{RECEIPT_TEMPLATE_OPTIONS.find(o => o.id === selectedReceiptTemplate)?.name}</strong>
              </div>
            </div>

            <div className={styles.receiptTemplateGrid}>
              {RECEIPT_TEMPLATE_OPTIONS.map((opt) => {
                const active = selectedReceiptTemplate === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.receiptTemplateCard} ${active ? styles.receiptTemplateCardActive : ''}`}
                    onClick={() => setSelectedReceiptTemplate(opt.id)}
                  >
                    <ReceiptTemplatePreview template={opt.id} />
                    <div className={styles.receiptTemplateInfo}>
                      <div className={styles.receiptTemplateNameRow}>
                        <span className={styles.receiptTemplateName}>{opt.name}</span>
                        {opt.id === 'classic' && <span className={styles.receiptTemplateDefault}>Default</span>}
                        {active && <CheckCircle size={15} className={styles.receiptTemplateCheck} />}
                      </div>
                      <p className={styles.receiptTemplateDesc}>{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'accounts' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Accounts</h2>
            <p className={styles.sectionDesc}>
              There is no public sign-up — only someone already logged in can create a new account.
            </p>
            <div className={styles.infraGrid}>
              <CreateAccountCard onSuccess={() => setAccountsRefreshKey((k) => k + 1)} />
              <AccountsList refreshKey={accountsRefreshKey} />
            </div>
          </section>
        )}

        {activeTab === 'platformBilling' && canSeePlatformBilling && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Platform Billing</h2>
            <p className={styles.sectionDesc}>
              {user?.role === 'ADMIN'
                ? 'Manage your subscription to Mouwalidi, and connect Stripe so your customers can pay their bills online.'
                : 'Connect Stripe so customers you manage directly can pay their bills online.'}
            </p>
            <div className={styles.infraGrid}>
              {user?.role === 'ADMIN' && <SubscriptionCard />}
              <ConnectCard />
              <WhishPhoneNumberCard />
              {user?.role === 'ADMIN' && <WhishSubscriptionCard />}
            </div>

            <div className={styles.infraGrid} style={{ marginTop: '1.25rem' }}>
              <WhishReviewQueue />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ─── helpers ─── */
function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
