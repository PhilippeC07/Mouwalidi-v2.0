import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users,
  Zap,
  DollarSign,
  AlertTriangle,
  FolderTree,
  Download,
  UserPlus,
  Building2,
  Pencil,
  X,
  Settings,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { getGeneratorStatusStyle } from '../../app/data/mockData';
import { useGetGenerators } from '../../hooks/useGetGenerators';
import { useRegions } from '../../hooks/useGetRegions';
import { useConsumptionLookups } from '../../hooks/useConsumptionLookups';
import { useCustomers } from '../../hooks/useCustomers';
import { useBuildings } from '../../hooks/useBuildings';
import { createCustomer, updateCustomer, createConsumptionType, type CustomerListItem } from '../../api/customer/customer.api';
import { createBuilding } from '../../api/building/building.api';
import styles from '../GeneratorView/GeneratorView.module.css';

interface CustomerForm {
  firstName: string;
  middleName: string;
  lastName: string;
  phoneNumber: string;
  isCounter: boolean;
  status: string;
  description: string;
  consumptionStatusId: string;
  consumptionTypeId: string;
  buildingId: string;
  floorNumber: string;
  apartmentSide: string;
}

const EMPTY_FORM: CustomerForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  phoneNumber: '',
  isCounter: false,
  status: 'active',
  description: '',
  consumptionStatusId: '',
  consumptionTypeId: '',
  buildingId: '',
  floorNumber: '',
  apartmentSide: '',
};

export function GeneratorGroupView() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data: generators, loading: genLoading, error: genError } = useGetGenerators();
  const { data: regions, loading: regLoading, error: regError } = useRegions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { statuses, types, refetchTypes } = useConsumptionLookups(groupId);
  const { data: customers, loading: customersLoading, refetch: refetchCustomers } = useCustomers(groupId);
  const { data: buildings, loading: buildingsLoading, refetch: refetchBuildings } = useBuildings(groupId);
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [buildingName, setBuildingName] = useState('');
  const [buildingSubmitting, setBuildingSubmitting] = useState(false);
  const [buildingError, setBuildingError] = useState<string | null>(null);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeForm, setTypeForm] = useState({ description: '', Ampere: '', isCounter: false, ThreePhase: false });
  const [typeSubmitting, setTypeSubmitting] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  const loading = genLoading || regLoading;
  const error = genError ?? regError;

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
        {error}
      </div>
    );
  }

  let groupLabel = '';
  let groupGeneratorIds: string[] = [];

  for (const region of regions) {
    const group = region.groups.find((g) => g.id === groupId);
    if (group) {
      groupLabel = group.label;
      groupGeneratorIds = group.items.map((item) => item.id);
      break;
    }
  }

  if (!groupLabel) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        Group not found.
      </div>
    );
  }

  const groupGenerators = generators.filter((g) => groupGeneratorIds.includes(g.id));

  if (groupGenerators.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        No generators in this group.
      </div>
    );
  }

  // KPIs derived from the customers list — avoids double-counting when
  // multiple generators share the same group (each generator returned full
  // group-level stats, so summing them multiplied the count by gen count).
  const totalClients = customers.length;
  const totalLoad = customers.reduce((sum, c) => sum + c.consumptionType.Ampere, 0);
  const totalRevenue = 0;
  const overdueCount = customers.filter(
    (c) => c.consumptionStatus.Status.toLowerCase() === 'overdue',
  ).length;
  const unpaidCount = customers.filter(
    (c) => c.consumptionStatus.Status.toLowerCase() === 'unpaid',
  ).length;
  const totalKva = groupGenerators.reduce((sum, g) => sum + g.kvaCapacity, 0);

  const hasOffline = groupGenerators.some((g) => g.status === 'offline');
  const hasMaintenance = groupGenerators.some((g) => g.status === 'maintenance');
  const groupStatus: 'running' | 'maintenance' | 'offline' = hasOffline
    ? 'offline'
    : hasMaintenance
      ? 'maintenance'
      : 'running';

  const runningCount = groupGenerators.filter((g) => g.status === 'running').length;
  const statusLabel =
    groupStatus === 'running'
      ? `${runningCount}/${groupGenerators.length} Running`
      : groupStatus === 'offline'
        ? `${groupGenerators.filter((g) => g.status === 'offline').length} Offline`
        : `${groupGenerators.filter((g) => g.status === 'maintenance').length} Maintenance`;

  const loadCapacityA = (totalKva * 0.8 * 1000) / 220;
  const loadPercent = Math.min(100, (totalLoad / loadCapacityA) * 100);

  const loadBarClass =
    loadPercent > 80
      ? styles.loadBarRed
      : loadPercent > 60
        ? styles.loadBarAmber
        : styles.loadBarGreen;

  const paidCount = totalClients - overdueCount - unpaidCount;
  const genStatusStyle = getGeneratorStatusStyle(groupStatus);

  function openEditModal(c: CustomerListItem) {
    setForm({
      firstName: c.firstName,
      middleName: c.middleName ?? '',
      lastName: c.lastName,
      phoneNumber: c.phoneNumber ?? '',
      isCounter: c.isCounter,
      status: c.status,
      description: c.description ?? '',
      consumptionStatusId: c.consumptionStatusId,
      consumptionTypeId: c.consumptionTypeId,
      buildingId: c.buildingFloor?.buildingId ?? '',
      floorNumber: String(c.buildingFloor?.floorNumber ?? ''),
      apartmentSide: c.buildingFloor?.apartmentSide ?? '',
    });
    setEditingCustomerId(c.id);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingCustomerId) {
        await updateCustomer(editingCustomerId, { ...form, floorNumber: Number(form.floorNumber) });
      } else {
        await createCustomer({ ...form, floorNumber: Number(form.floorNumber) });
      }
      setForm(EMPTY_FORM);
      setEditingCustomerId(null);
      setModalOpen(false);
      void refetchCustomers();
    } catch {
      setSubmitError(editingCustomerId ? 'Failed to save changes.' : 'Failed to create customer.');
    } finally {
      setSubmitting(false);
    }
  }

  function setField<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleTypeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) return;
    setTypeSubmitting(true);
    setTypeError(null);
    try {
      await createConsumptionType({
        description: typeForm.description,
        Ampere: Number(typeForm.Ampere),
        isCounter: typeForm.isCounter,
        ThreePhase: typeForm.ThreePhase,
        generatorGroupId: groupId,
      });
      setTypeForm({ description: '', Ampere: '', isCounter: false, ThreePhase: false });
      setTypeModalOpen(false);
      void refetchTypes();
    } catch {
      setTypeError('Failed to create subscription type. Please try again.');
    } finally {
      setTypeSubmitting(false);
    }
  }

  async function handleBuildingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) return;
    setBuildingSubmitting(true);
    setBuildingError(null);
    try {
      await createBuilding({ name: buildingName, generatorGroupId: groupId });
      setBuildingName('');
      setBuildingModalOpen(false);
      void refetchBuildings();
    } catch {
      setBuildingError('Failed to create building. Please try again.');
    } finally {
      setBuildingSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Dialog.Root
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) { setSubmitError(null); setForm(EMPTY_FORM); setEditingCustomerId(null); }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} aria-describedby={undefined}>
            <div className={styles.dialogHeader}>
              <Dialog.Title className={styles.dialogTitle}>{editingCustomerId ? 'Edit Customer' : 'Add Customer'}</Dialog.Title>
              <Dialog.Close className={styles.dialogCloseBtn}>
                <X size={18} />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>First Name *</label>
                  <input
                    className={styles.formInput}
                    placeholder="e.g. John"
                    value={form.firstName}
                    onChange={(e) => setField('firstName', e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Middle Name</label>
                  <input
                    className={styles.formInput}
                    placeholder="Optional"
                    value={form.middleName}
                    onChange={(e) => setField('middleName', e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Last Name *</label>
                  <input
                    className={styles.formInput}
                    placeholder="e.g. Doe"
                    value={form.lastName}
                    onChange={(e) => setField('lastName', e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Phone Number</label>
                  <input
                    className={styles.formInput}
                    placeholder="e.g. +961 70 000 000"
                    value={form.phoneNumber}
                    onChange={(e) => setField('phoneNumber', e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Status *</label>
                  <select
                    className={`${styles.formInput} ${styles.formSelect}`}
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value)}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Consumption Status *</label>
                  <select
                    className={`${styles.formInput} ${styles.formSelect}`}
                    value={form.consumptionStatusId}
                    onChange={(e) => setField('consumptionStatusId', e.target.value)}
                    required
                  >
                    <option value="" disabled>Select status…</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>{s.Status}</option>
                    ))}
                  </select>
                </div>

                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>Subscription Type *</label>
                  <select
                    className={`${styles.formInput} ${styles.formSelect}`}
                    value={form.consumptionTypeId}
                    onChange={(e) => setField('consumptionTypeId', e.target.value)}
                    required
                  >
                    <option value="" disabled>Select type…</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.description} — {t.Ampere}A{t.ThreePhase ? ' (3-phase)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>Building *</label>
                  <select
                    className={`${styles.formInput} ${styles.formSelect}`}
                    value={form.buildingId}
                    onChange={(e) => setField('buildingId', e.target.value)}
                    required
                  >
                    <option value="" disabled>Select building…</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Floor Number *</label>
                  <input
                    type="number"
                    min={1}
                    className={styles.formInput}
                    placeholder="e.g. 3"
                    value={form.floorNumber}
                    onChange={(e) => setField('floorNumber', e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Apartment Side *</label>
                  <input
                    className={styles.formInput}
                    placeholder="e.g. Left, Right, A…"
                    value={form.apartmentSide}
                    onChange={(e) => setField('apartmentSide', e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Meter Type</label>
                  <label className={styles.formCheckboxRow}>
                    <input
                      type="checkbox"
                      className={styles.formCheckbox}
                      checked={form.isCounter}
                      onChange={(e) => setField('isCounter', e.target.checked)}
                    />
                    <span className={styles.formCheckboxLabel}>Has counter / meter</span>
                  </label>
                </div>

                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea
                    className={`${styles.formInput} ${styles.formTextarea}`}
                    placeholder="Optional notes about this customer…"
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                  />
                </div>
              </div>

              {submitError && (
                <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '12px' }}>
                  {submitError}
                </p>
              )}

              <div className={styles.formActions}>
                <Dialog.Close className={styles.btnCancel} type="button" disabled={submitting}>
                  Cancel
                </Dialog.Close>
                <button type="submit" className={styles.btnSubmit} disabled={submitting}>
                  {submitting
                    ? (editingCustomerId ? 'Saving…' : 'Creating…')
                    : (editingCustomerId ? 'Save Changes' : 'Create Customer')}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add Subscription Type modal */}
      <Dialog.Root
        open={typeModalOpen}
        onOpenChange={(open) => {
          setTypeModalOpen(open);
          if (!open) { setTypeForm({ description: '', Ampere: '', isCounter: false, ThreePhase: false }); setTypeError(null); }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} aria-describedby={undefined}>
            <div className={styles.dialogHeader}>
              <Dialog.Title className={styles.dialogTitle}>Add Subscription Type</Dialog.Title>
              <Dialog.Close className={styles.dialogCloseBtn}><X size={18} /></Dialog.Close>
            </div>
            <form onSubmit={handleTypeSubmit}>
              <div className={styles.formGrid}>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>Description *</label>
                  <input
                    className={styles.formInput}
                    placeholder="e.g. Standard 5A"
                    value={typeForm.description}
                    onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))}
                    required autoFocus
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Ampere *</label>
                  <input
                    type="number" min={1}
                    className={styles.formInput}
                    placeholder="e.g. 5"
                    value={typeForm.Ampere}
                    onChange={(e) => setTypeForm((p) => ({ ...p, Ampere: e.target.value }))}
                    required
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Options</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className={styles.formCheckboxRow}>
                      <input type="checkbox" className={styles.formCheckbox} checked={typeForm.isCounter}
                        onChange={(e) => setTypeForm((p) => ({ ...p, isCounter: e.target.checked }))} />
                      <span className={styles.formCheckboxLabel}>Has counter / meter</span>
                    </label>
                    <label className={styles.formCheckboxRow}>
                      <input type="checkbox" className={styles.formCheckbox} checked={typeForm.ThreePhase}
                        onChange={(e) => setTypeForm((p) => ({ ...p, ThreePhase: e.target.checked }))} />
                      <span className={styles.formCheckboxLabel}>Three-phase (3φ)</span>
                    </label>
                  </div>
                </div>
              </div>
              {typeError && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '12px' }}>{typeError}</p>}
              <div className={styles.formActions}>
                <Dialog.Close className={styles.btnCancel} type="button" disabled={typeSubmitting}>Cancel</Dialog.Close>
                <button type="submit" className={styles.btnSubmit} disabled={typeSubmitting}>
                  {typeSubmitting ? 'Creating…' : 'Create Type'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add Building modal */}
      <Dialog.Root
        open={buildingModalOpen}
        onOpenChange={(open) => {
          setBuildingModalOpen(open);
          if (!open) { setBuildingName(''); setBuildingError(null); }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} aria-describedby={undefined}>
            <div className={styles.dialogHeader}>
              <Dialog.Title className={styles.dialogTitle}>Add Building</Dialog.Title>
              <Dialog.Close className={styles.dialogCloseBtn}>
                <X size={18} />
              </Dialog.Close>
            </div>

            <form onSubmit={handleBuildingSubmit}>
              <div className={styles.formGrid}>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>Building Name *</label>
                  <input
                    className={styles.formInput}
                    placeholder="e.g. Tower A"
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {buildingError && (
                <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '12px' }}>
                  {buildingError}
                </p>
              )}

              <div className={styles.formActions}>
                <Dialog.Close className={styles.btnCancel} type="button" disabled={buildingSubmitting}>
                  Cancel
                </Dialog.Close>
                <button type="submit" className={styles.btnSubmit} disabled={buildingSubmitting}>
                  {buildingSubmitting ? 'Creating…' : 'Create Building'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className={styles.genHeader}>
        <div className={styles.genHeaderTop}>
          <div>
            <div className={styles.genTitleRow}>
              <h1 className={styles.genTitle}>{groupLabel}</h1>
              <span className={styles.statusBadge} style={genStatusStyle}>
                <span className={styles.statusDot} />
                {statusLabel}
              </span>
            </div>

            <div className={styles.genMeta}>
              <span className={styles.genMetaItem}>
                <FolderTree size={14} /> {groupGenerators.length} generators
              </span>
              <span className={styles.genMetaItem}>
                <Zap size={14} /> {totalKva} kVA total capacity
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
            <Link to={`/generator-groups/${groupId}/manage`} className={styles.manageBtn}>
              <Settings size={16} />
              Manage
            </Link>
            <button className={styles.addTypeBtn} onClick={() => setTypeModalOpen(true)}>
              <Zap size={16} />
              Add Type
            </button>
            <button className={styles.addBuildingBtn} onClick={() => setBuildingModalOpen(true)}>
              <Building2 size={16} />
              Add Building
            </button>
            <button className={styles.addCustomerBtn} onClick={() => setModalOpen(true)}>
              <UserPlus size={16} />
              Add Customer
            </button>
            <button className={styles.exportBtn}>
              <Download size={16} />
              Export Report
            </button>
          </div>
        </div>

        <div className={styles.loadBarSection}>
          <div className={styles.loadBarLabels}>
            <span>Load utilization</span>
            <span>
              {loadPercent.toFixed(1)}% ({totalLoad.toFixed(1)} A /{' '}
              {loadCapacityA.toFixed(0)} A max)
            </span>
          </div>

          <div className={styles.loadBarTrack}>
            <div
              className={`${styles.loadBarFill} ${loadBarClass}`}
              style={{ width: `${loadPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.kpiGrid}>
          <MiniStat
            icon={<Users size={16} color="#60a5fa" />}
            label="Total Clients"
            value={totalClients.toString()}
            cardClass={styles.miniStatBlue}
          />
          <MiniStat
            icon={<Zap size={16} color="#facc15" />}
            label="Total Load"
            value={`${totalLoad.toFixed(1)} A`}
            cardClass={styles.miniStatYellow}
          />
          <MiniStat
            icon={<DollarSign size={16} color="#34d399" />}
            label="Monthly Revenue"
            value={`$${totalRevenue.toFixed(2)}`}
            cardClass={styles.miniStatEmerald}
          />
          <MiniStat
            icon={<AlertTriangle size={16} color="#f87171" />}
            label="Payment Alerts"
            value={`${overdueCount + unpaidCount}`}
            sub={`${overdueCount} overdue · ${unpaidCount} unpaid`}
            cardClass={styles.miniStatRed}
          />
        </div>

        <div className={styles.statusPillsRow}>
          <div className={`${styles.statusPill} ${styles.pillPaid}`}>
            <p className={`${styles.pillLabel} ${styles.pillLabelPaid}`}>Paid</p>
            <p className={`${styles.pillCount} ${styles.pillCountPaid}`}>{paidCount}</p>
          </div>

          <div className={`${styles.statusPill} ${styles.pillUnpaid}`}>
            <p className={`${styles.pillLabel} ${styles.pillLabelUnpaid}`}>Unpaid</p>
            <p className={`${styles.pillCount} ${styles.pillCountUnpaid}`}>{unpaidCount}</p>
          </div>

          <div className={`${styles.statusPill} ${styles.pillOverdue}`}>
            <p className={`${styles.pillLabel} ${styles.pillLabelOverdue}`}>Overdue</p>
            <p className={`${styles.pillCount} ${styles.pillCountOverdue}`}>{overdueCount}</p>
          </div>
        </div>

        {/* Buildings table */}
        <div className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Building</th>
                  <th className={`${styles.th} ${styles.thCenter}`}>Floors / Units</th>
                </tr>
              </thead>
              <tbody>
                {buildingsLoading ? (
                  <tr className={styles.emptyRow}>
                    <td colSpan={2}>Loading buildings…</td>
                  </tr>
                ) : buildings.length === 0 ? (
                  <tr className={styles.emptyRow}>
                    <td colSpan={2}>No buildings yet. Add the first one.</td>
                  </tr>
                ) : (
                  buildings.map((b) => (
                    <tr key={b.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.clientNameCell}>
                          <div className={styles.avatar}>
                            <Building2 size={14} color="#9ca3af" />
                          </div>
                          <span className={styles.clientName}>{b.name}</span>
                        </div>
                      </td>
                      <td className={`${styles.td} ${styles.tdCenter} ${styles.tdGray}`}>
                        {b.floorCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer table */}
        <div className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Customer</th>
                  <th className={styles.th}>Phone</th>
                  <th className={styles.th}>Subscription</th>
                  <th className={styles.th}>Bill Status</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.thCenter}`}>Counter</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {customersLoading ? (
                  <tr className={styles.emptyRow}>
                    <td colSpan={7}>Loading customers…</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr className={styles.emptyRow}>
                    <td colSpan={7}>No customers yet. Add the first one.</td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const initials = (c.firstName[0] + c.lastName[0]).toUpperCase();
                    const fullName = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');
                    const billStatus = c.consumptionStatus.Status.toLowerCase();
                    const billStyle =
                      billStatus === 'paid'
                        ? { background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }
                        : billStatus === 'overdue'
                          ? { background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }
                          : { background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' };

                    return (
                      <tr key={c.id} className={styles.tr}>
                        <td className={styles.td}>
                          <div className={styles.clientNameCell}>
                            <div className={styles.avatar}>{initials}</div>
                            <Link to={`/customers/${c.id}`} className={styles.clientNameLink}>{fullName}</Link>
                          </div>
                        </td>
                        <td className={`${styles.td} ${styles.tdGray}`}>
                          {c.phoneNumber ?? '—'}
                        </td>
                        <td className={styles.td}>
                          <p className={styles.ampsMain}>{c.consumptionType.Ampere} A{c.consumptionType.ThreePhase ? ' 3φ' : ''}</p>
                          <p className={styles.ampsSub}>{c.consumptionType.description}</p>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.inlineStatus} style={billStyle}>
                            <span className={styles.inlineDot} />
                            {c.consumptionStatus.Status}
                          </span>
                        </td>
                        <td className={`${styles.td} ${styles.tdGray}`}>{c.status}</td>
                        <td className={`${styles.td} ${styles.tdCenter}`}>
                          <span style={{ color: c.isCounter ? '#34d399' : '#4b5563', fontSize: '0.75rem', fontWeight: 500 }}>
                            {c.isCounter ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className={`${styles.td} ${styles.tdCenter}`}>
                          <button className={styles.expandBtn} onClick={() => openEditModal(c)} title="Edit customer">
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  sub,
  cardClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  cardClass: string;
}) {
  return (
    <div className={`${styles.miniStat} ${cardClass}`}>
      <div className={styles.miniStatHead}>
        {icon}
        <p className={styles.miniStatLabel}>{label}</p>
      </div>
      <p className={styles.miniStatValue}>{value}</p>
      {sub && <p className={styles.miniStatSub}>{sub}</p>}
    </div>
  );
}
