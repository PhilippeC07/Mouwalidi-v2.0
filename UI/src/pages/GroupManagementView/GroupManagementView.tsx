import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Zap, Building2, Users, Gauge, Search, ChevronLeft, ChevronDown, ChevronRight,
  Pencil, Trash2, X, CheckCircle, AlertCircle, Loader, Table2, ChevronUp, ChevronsUpDown,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useConsumptionLookups } from '../../hooks/useConsumptionLookups';
import { useBuildingDetails } from '../../hooks/useBuildingDetails';
import { useBuildings } from '../../hooks/useBuildings';
import { useCustomers } from '../../hooks/useCustomers';
import { useRegions } from '../../hooks/useGetRegions';
import { useMonthlyCounterEntries } from '../../hooks/useMonthlyCounterEntries';
import { useCustomerBalances } from '../../hooks/useCustomerBalances';
import { bulkUpdateCounters } from '../../api/billing/billing.api';
import {
  updateCustomer, deleteCustomer,
  updateConsumptionType, deleteConsumptionType,
  type ConsumptionTypeDto, type CustomerListItem,
} from '../../api/customer/customer.api';
import {
  updateBuilding, deleteBuilding,
  type BuildingDetail,
} from '../../api/building/building.api';
import styles from './GroupManagementView.module.css';

type Tab = 'types' | 'buildings' | 'customers' | 'readings';
type CustomerView = 'table' | 'byBuilding' | 'byType';
type SortDir = 'asc' | 'desc';
type CustomerSortKey = 'name' | 'phone' | 'type' | 'ampere' | 'phase' | 'paymentStatus' | 'building' | 'status' | 'remaining';
type CounterSortKey = 'name' | 'building' | 'price' | 'previous' | 'current' | 'usage' | 'amount';

interface CustomerColumnFilters {
  name: string; phone: string; type: string; phase: string;
  paymentStatus: string; building: string; status: string; balance: string;
}

const EMPTY_CUSTOMER_FILTERS: CustomerColumnFilters = {
  name: '', phone: '', type: '', phase: '', paymentStatus: '', building: '', status: '', balance: '',
};

function fullName(c: { firstName: string; middleName: string | null; lastName: string }) {
  return [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');
}

function fmtMonth(m: string) {
  return new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1 + delta, 1)).toISOString().slice(0, 7);
}

interface CustomerForm {
  firstName: string; middleName: string; lastName: string;
  phoneNumber: string; isCounter: boolean; status: string;
  description: string; consumptionStatusId: string;
  consumptionTypeId: string; buildingId: string;
  floorNumber: string; apartmentSide: string;
}

const EMPTY_CUSTOMER: CustomerForm = {
  firstName: '', middleName: '', lastName: '', phoneNumber: '',
  isCounter: false, status: 'active', description: '',
  consumptionStatusId: '', consumptionTypeId: '', buildingId: '',
  floorNumber: '', apartmentSide: '',
};

interface TypeForm { description: string; Ampere: string; isCounter: boolean; ThreePhase: boolean; }

export function GroupManagementView() {
  const { groupId } = useParams<{ groupId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('types');
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ── Buildings tab: search + sort ──
  const [buildingSearch, setBuildingSearch] = useState('');
  const [buildingSort, setBuildingSort] = useState<'name-asc' | 'name-desc' | 'floors-desc' | 'floors-asc'>('name-asc');

  // ── Customers tab: view switcher + table sort/filter ──
  const [customerView, setCustomerView] = useState<CustomerView>('table');
  const [sortKey, setSortKey] = useState<CustomerSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [colFilters, setColFilters] = useState<CustomerColumnFilters>(EMPTY_CUSTOMER_FILTERS);

  const { data: regions } = useRegions();
  const { statuses, types, loading: typesLoading, refetchTypes } = useConsumptionLookups(groupId);
  const { data: buildings, loading: buildingsLoading, refetch: refetchBuildings } = useBuildingDetails(groupId);
  const { data: buildingList } = useBuildings(groupId);
  const { data: customers, loading: customersLoading, refetch: refetchCustomers } = useCustomers(groupId);

  const buildingNameById = useMemo(
    () => new Map(buildingList.map((b) => [b.id, b.name])),
    [buildingList],
  );

  function buildingNameOf(c: CustomerListItem): string {
    return c.buildingFloor ? (buildingNameById.get(c.buildingFloor.buildingId) ?? '') : '';
  }

  const customerById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );

  function buildingNameOfCustomerId(customerId: string): string {
    const c = customerById.get(customerId);
    return c ? buildingNameOf(c) : '';
  }

  // ── Meter Readings ──
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
  function goMonth(delta: number) { setSearchParams({ month: shiftMonth(month, delta) }); }

  const {
    data: counterData, setData: setCounterData,
    loading: countersLoading, error: countersError,
  } = useMonthlyCounterEntries(groupId, month);
  const { data: balances } = useCustomerBalances(groupId, month);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [counterSearch, setCounterSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [counterBuildingFilter, setCounterBuildingFilter] = useState('');
  const [counterSortKey, setCounterSortKey] = useState<CounterSortKey | null>(null);
  const [counterSortDir, setCounterSortDir] = useState<SortDir>('asc');
  const [counterSaving, setCounterSaving] = useState(false);
  const [counterSaveMsg, setCounterSaveMsg] = useState<string | null>(null);
  const [counterSaveErr, setCounterSaveErr] = useState<string | null>(null);
  const counterInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setEdits({}); setCounterSaveMsg(null); setCounterSaveErr(null);
  }, [month, groupId]);

  const filteredCounters = useMemo(() => {
    const q = counterSearch.trim().toLowerCase();
    let list = counterData.filter((e) => {
      if (pendingOnly && e.currentCounter !== e.previousCounter) return false;
      if (q && !e.customerName.toLowerCase().includes(q)) return false;
      if (counterBuildingFilter && buildingNameOfCustomerId(e.customerId) !== counterBuildingFilter) return false;
      return true;
    });
    if (counterSortKey) {
      const dir = counterSortDir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        let av: string | number;
        let bv: string | number;
        switch (counterSortKey) {
          case 'name': av = a.customerName.toLowerCase(); bv = b.customerName.toLowerCase(); break;
          case 'building': av = buildingNameOfCustomerId(a.customerId).toLowerCase(); bv = buildingNameOfCustomerId(b.customerId).toLowerCase(); break;
          case 'price': av = a.kwhPrice; bv = b.kwhPrice; break;
          case 'previous': av = a.previousCounter; bv = b.previousCounter; break;
          case 'current': av = a.currentCounter; bv = b.currentCounter; break;
          case 'usage': av = a.currentCounter - a.previousCounter; bv = b.currentCounter - b.previousCounter; break;
          case 'amount': av = (a.currentCounter - a.previousCounter) * a.kwhPrice; bv = (b.currentCounter - b.previousCounter) * b.kwhPrice; break;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counterData, counterSearch, pendingOnly, counterBuildingFilter, counterSortKey, counterSortDir, customerById, buildingNameById]);

  const dirtyCounterIds = useMemo(
    () => Object.keys(edits).filter((id) => {
      const original = counterData.find((e) => e.consumptionId === id);
      return original && edits[id] !== original.currentCounter;
    }),
    [edits, counterData],
  );

  function setReading(id: string, value: string) {
    if (value === '') {
      setEdits((prev) => { const next = { ...prev }; delete next[id]; return next; });
      return;
    }
    const num = Number(value);
    if (Number.isNaN(num)) return;
    setEdits((prev) => ({ ...prev, [id]: num }));
  }

  function focusNextCounter(id: string) {
    const ids = filteredCounters.map((e) => e.consumptionId);
    const nextId = ids[ids.indexOf(id) + 1];
    if (nextId) counterInputRefs.current[nextId]?.focus();
  }

  async function handleSaveCounters() {
    if (dirtyCounterIds.length === 0) return;
    setCounterSaving(true); setCounterSaveMsg(null); setCounterSaveErr(null);
    try {
      const updates = dirtyCounterIds.map((id) => ({ consumptionId: id, currentCounter: edits[id] }));
      await bulkUpdateCounters(updates);
      setCounterData((prev) => prev.map((e) => (edits[e.consumptionId] !== undefined ? { ...e, currentCounter: edits[e.consumptionId] } : e)));
      setCounterSaveMsg(`Saved ${updates.length} reading${updates.length !== 1 ? 's' : ''}.`);
      setEdits({});
    } catch {
      setCounterSaveErr('Failed to save some readings. Please try again.');
    } finally {
      setCounterSaving(false);
    }
  }

  let groupLabel = '';
  for (const region of regions) {
    const group = region.groups.find((g) => g.id === groupId);
    if (group) { groupLabel = group.label; break; }
  }

  const customersPerType = customers.reduce<Record<string, number>>((acc, c) => {
    acc[c.consumptionTypeId] = (acc[c.consumptionTypeId] ?? 0) + 1;
    return acc;
  }, {});

  const byAmpereAsc = (a: ConsumptionTypeDto, b: ConsumptionTypeDto) => a.Ampere - b.Ampere;
  const counterTypes = types.filter((t) => t.isCounter).sort(byAmpereAsc);
  const fixedTypes = types.filter((t) => !t.isCounter).sort(byAmpereAsc);

  function renderTypeCard(t: ConsumptionTypeDto) {
    return (
      <div key={t.id} className={styles.typeCard}>
        <div className={styles.typeCardHeader}>
          <span className={styles.typeDesc}>{t.description}</span>
          <div className={styles.cardActions}>
            <span className={styles.typeAmpere}>{t.Ampere} A</span>
            <button className={styles.actionBtnEdit} title="Edit" onClick={() => openEditType(t)}><Pencil size={13} /></button>
            <button className={styles.actionBtnDelete} title="Delete"
              onClick={() => setConfirmDelete({ kind: 'type', id: t.id, name: t.description })}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        <div className={styles.typeCardBadges}>
          {t.isCounter && <span className={styles.badge}>Counter</span>}
          {t.ThreePhase && <span className={styles.badge}>3-Phase</span>}
          {!t.isCounter && !t.ThreePhase && <span className={styles.badge}>1-Phase Fixed</span>}
        </div>
        <div className={styles.typeCardFooter}>
          <Users size={12} />
          {customersPerType[t.id] ?? 0} customer{(customersPerType[t.id] ?? 0) !== 1 ? 's' : ''}
        </div>
      </div>
    );
  }

  const balanceByCustomerId = useMemo(
    () => new Map(balances.map((b) => [b.customerId, b])),
    [balances],
  );

  function remainingOf(c: CustomerListItem): number | null {
    return balanceByCustomerId.get(c.id)?.remaining ?? null;
  }

  function renderRemaining(c: CustomerListItem) {
    const remaining = remainingOf(c);
    if (remaining === null) return <span className={styles.noCustomer}>—</span>;
    if (remaining <= 0.001) return <span className={styles.remainingPaid}>${remaining.toFixed(2)}</span>;
    return <span className={styles.remainingOwing}>${remaining.toFixed(2)}</span>;
  }

  function sumRemaining(items: CustomerListItem[]): number {
    return items.reduce((sum, c) => sum + (remainingOf(c) ?? 0), 0);
  }

  function renderGroupRemainingBadge(totalRemaining: number) {
    return (
      <span className={totalRemaining > 0.001 ? styles.groupRemainingOwing : styles.groupRemainingPaid}>
        ${totalRemaining.toFixed(2)} remaining
      </span>
    );
  }

  function toggleSort(key: CustomerSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function renderSortHeader(label: string, sortKeyName: CustomerSortKey) {
    const active = sortKey === sortKeyName;
    return (
      <button type="button" className={styles.sortHeaderBtn} onClick={() => toggleSort(sortKeyName)}>
        {label}
        {active
          ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
          : <ChevronsUpDown size={12} className={styles.sortIconIdle} />}
      </button>
    );
  }

  function toggleCounterSort(key: CounterSortKey) {
    if (counterSortKey === key) {
      setCounterSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setCounterSortKey(key);
      setCounterSortDir('asc');
    }
  }

  function renderCounterSortHeader(label: string, key: CounterSortKey) {
    const active = counterSortKey === key;
    return (
      <button type="button" className={styles.sortHeaderBtn} onClick={() => toggleCounterSort(key)}>
        {label}
        {active
          ? (counterSortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
          : <ChevronsUpDown size={12} className={styles.sortIconIdle} />}
      </button>
    );
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const filteredBuildings = useMemo(() => {
    const q = buildingSearch.trim().toLowerCase();
    const list = q ? buildings.filter((b) => b.name.toLowerCase().includes(q)) : [...buildings];
    list.sort((a, b) => {
      switch (buildingSort) {
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'floors-desc': return b.buildingfloors.length - a.buildingfloors.length;
        case 'floors-asc': return a.buildingfloors.length - b.buildingfloors.length;
        default: return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [buildings, buildingSearch, buildingSort]);

  const filteredSortedCustomers = useMemo(() => {
    const nameQ = colFilters.name.trim().toLowerCase();
    const phoneQ = colFilters.phone.trim().toLowerCase();
    let list = customers.filter((c) => {
      if (nameQ && !fullName(c).toLowerCase().includes(nameQ)) return false;
      if (phoneQ && !(c.phoneNumber ?? '').toLowerCase().includes(phoneQ)) return false;
      if (colFilters.type && c.consumptionTypeId !== colFilters.type) return false;
      if (colFilters.phase && (colFilters.phase === '3' ? !c.consumptionType.ThreePhase : c.consumptionType.ThreePhase)) return false;
      if (colFilters.paymentStatus && c.consumptionStatusId !== colFilters.paymentStatus) return false;
      if (colFilters.building && buildingNameOf(c) !== colFilters.building) return false;
      if (colFilters.status && c.status !== colFilters.status) return false;
      if (colFilters.balance) {
        const remaining = remainingOf(c);
        if (colFilters.balance === 'owing' && !(remaining !== null && remaining > 0.001)) return false;
        if (colFilters.balance === 'paid' && !(remaining !== null && remaining <= 0.001)) return false;
        if (colFilters.balance === 'nobill' && remaining !== null) return false;
      }
      return true;
    });
    if (sortKey) {
      const dir = sortDir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        let av: string | number;
        let bv: string | number;
        switch (sortKey) {
          case 'name': av = fullName(a).toLowerCase(); bv = fullName(b).toLowerCase(); break;
          case 'phone': av = a.phoneNumber ?? ''; bv = b.phoneNumber ?? ''; break;
          case 'type': av = a.consumptionType.description.toLowerCase(); bv = b.consumptionType.description.toLowerCase(); break;
          case 'ampere': av = a.consumptionType.Ampere; bv = b.consumptionType.Ampere; break;
          case 'phase': av = a.consumptionType.ThreePhase ? 1 : 0; bv = b.consumptionType.ThreePhase ? 1 : 0; break;
          case 'paymentStatus': av = a.consumptionStatus.Status.toLowerCase(); bv = b.consumptionStatus.Status.toLowerCase(); break;
          case 'building': av = buildingNameOf(a).toLowerCase(); bv = buildingNameOf(b).toLowerCase(); break;
          case 'status': av = a.status; bv = b.status; break;
          case 'remaining': av = remainingOf(a) ?? -Infinity; bv = remainingOf(b) ?? -Infinity; break;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, colFilters, sortKey, sortDir, buildingNameById, balanceByCustomerId]);

  const customersByBuilding = useMemo(() => {
    const groups = new Map<string, { label: string; items: CustomerListItem[] }>();
    for (const c of customers) {
      const key = c.buildingFloor?.buildingId ?? '__unassigned__';
      const label = c.buildingFloor ? (buildingNameById.get(c.buildingFloor.buildingId) ?? 'Unknown building') : 'Unassigned';
      if (!groups.has(key)) groups.set(key, { label, items: [] });
      groups.get(key)!.items.push(c);
    }
    return Array.from(groups.entries())
      .map(([key, g]) => ({ key, ...g, totalRemaining: sumRemaining(g.items) }))
      .sort((a, b) => (a.key === '__unassigned__' ? 1 : b.key === '__unassigned__' ? -1 : a.label.localeCompare(b.label)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, buildingNameById, balanceByCustomerId]);

  const customersByType = useMemo(() => {
    const groups = new Map<string, { type: ConsumptionTypeDto | undefined; label: string; items: CustomerListItem[] }>();
    for (const c of customers) {
      const key = c.consumptionTypeId;
      if (!groups.has(key)) {
        const type = types.find((t) => t.id === key);
        groups.set(key, { type, label: c.consumptionType.description, items: [] });
      }
      groups.get(key)!.items.push(c);
    }
    return Array.from(groups.entries())
      .map(([key, g]) => ({ key, ...g, totalRemaining: sumRemaining(g.items) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, types, balanceByCustomerId]);

  // ── Edit Type ──
  const [editTypeOpen, setEditTypeOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeForm, setTypeForm] = useState<TypeForm>({ description: '', Ampere: '', isCounter: false, ThreePhase: false });
  const [typeSubmitting, setTypeSubmitting] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  // ── Edit Building ──
  const [editBuildingOpen, setEditBuildingOpen] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [buildingName, setBuildingName] = useState('');
  const [buildingSubmitting, setBuildingSubmitting] = useState(false);
  const [buildingError, setBuildingError] = useState<string | null>(null);

  // ── Edit Customer ──
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(EMPTY_CUSTOMER);
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // ── Delete Confirm ──
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: 'type' | 'building' | 'customer'; id: string; name: string;
  } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function toggleBuilding(id: string) {
    setExpandedBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openEditType(t: ConsumptionTypeDto) {
    setEditingTypeId(t.id);
    setTypeForm({ description: t.description, Ampere: String(t.Ampere), isCounter: t.isCounter, ThreePhase: t.ThreePhase });
    setTypeError(null);
    setEditTypeOpen(true);
  }

  function openEditBuilding(b: BuildingDetail) {
    setEditingBuildingId(b.id);
    setBuildingName(b.name);
    setBuildingError(null);
    setEditBuildingOpen(true);
  }

  function openEditCustomer(c: CustomerListItem) {
    setEditingCustomerId(c.id);
    setCustomerForm({
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
    setCustomerError(null);
    setEditCustomerOpen(true);
  }

  async function handleTypeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTypeId) return;
    setTypeSubmitting(true);
    setTypeError(null);
    try {
      await updateConsumptionType(editingTypeId, {
        description: typeForm.description,
        Ampere: Number(typeForm.Ampere),
        isCounter: typeForm.isCounter,
        ThreePhase: typeForm.ThreePhase,
      });
      setEditTypeOpen(false);
      void refetchTypes();
    } catch {
      setTypeError('Failed to save changes.');
    } finally {
      setTypeSubmitting(false);
    }
  }

  async function handleBuildingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBuildingId) return;
    setBuildingSubmitting(true);
    setBuildingError(null);
    try {
      await updateBuilding(editingBuildingId, { name: buildingName });
      setEditBuildingOpen(false);
      void refetchBuildings();
    } catch {
      setBuildingError('Failed to save changes.');
    } finally {
      setBuildingSubmitting(false);
    }
  }

  async function handleCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCustomerId) return;
    setCustomerSubmitting(true);
    setCustomerError(null);
    try {
      await updateCustomer(editingCustomerId, { ...customerForm, floorNumber: Number(customerForm.floorNumber) });
      setEditCustomerOpen(false);
      void refetchCustomers();
    } catch {
      setCustomerError('Failed to save changes.');
    } finally {
      setCustomerSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      if (confirmDelete.kind === 'type') {
        await deleteConsumptionType(confirmDelete.id);
        void refetchTypes();
      } else if (confirmDelete.kind === 'building') {
        await deleteBuilding(confirmDelete.id);
        setExpandedBuildings((prev) => { const next = new Set(prev); next.delete(confirmDelete.id); return next; });
        void refetchBuildings();
      } else {
        await deleteCustomer(confirmDelete.id);
        void refetchCustomers();
      }
      setConfirmDelete(null);
    } catch {
      setDeleteError('Cannot delete: this item may still have linked records. Remove them first.');
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function setCField<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setCustomerForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className={styles.page}>

      {/* ── Edit Type Dialog ── */}
      <Dialog.Root open={editTypeOpen} onOpenChange={(o) => { setEditTypeOpen(o); if (!o) setTypeError(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} aria-describedby={undefined}>
            <div className={styles.dialogHeader}>
              <Dialog.Title className={styles.dialogTitle}>Edit Subscription Type</Dialog.Title>
              <Dialog.Close className={styles.dialogCloseBtn}><X size={18} /></Dialog.Close>
            </div>
            <form onSubmit={handleTypeSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formFieldFull}>
                  <label className={styles.formLabel}>Description</label>
                  <input className={styles.formInput} value={typeForm.description}
                    onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} required />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Ampere</label>
                  <input className={styles.formInput} type="number" value={typeForm.Ampere}
                    onChange={(e) => setTypeForm((p) => ({ ...p, Ampere: e.target.value }))} required />
                </div>
                <div className={styles.formField}>
                  <div className={styles.formCheckboxRow}>
                    <input className={styles.formCheckbox} type="checkbox" id="etIsCounter"
                      checked={typeForm.isCounter} onChange={(e) => setTypeForm((p) => ({ ...p, isCounter: e.target.checked }))} />
                    <label className={styles.formCheckboxLabel} htmlFor="etIsCounter">Counter</label>
                  </div>
                  <div className={styles.formCheckboxRow}>
                    <input className={styles.formCheckbox} type="checkbox" id="etThreePhase"
                      checked={typeForm.ThreePhase} onChange={(e) => setTypeForm((p) => ({ ...p, ThreePhase: e.target.checked }))} />
                    <label className={styles.formCheckboxLabel} htmlFor="etThreePhase">3-Phase</label>
                  </div>
                </div>
              </div>
              {typeError && <p className={styles.formError}>{typeError}</p>}
              <div className={styles.formActions}>
                <Dialog.Close className={styles.btnCancel} type="button">Cancel</Dialog.Close>
                <button type="submit" className={styles.btnSubmit} disabled={typeSubmitting}>
                  {typeSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Edit Building Dialog ── */}
      <Dialog.Root open={editBuildingOpen} onOpenChange={(o) => { setEditBuildingOpen(o); if (!o) setBuildingError(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} aria-describedby={undefined}>
            <div className={styles.dialogHeader}>
              <Dialog.Title className={styles.dialogTitle}>Rename Building</Dialog.Title>
              <Dialog.Close className={styles.dialogCloseBtn}><X size={18} /></Dialog.Close>
            </div>
            <form onSubmit={handleBuildingSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formFieldFull}>
                  <label className={styles.formLabel}>Building Name</label>
                  <input className={styles.formInput} value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)} required />
                </div>
              </div>
              {buildingError && <p className={styles.formError}>{buildingError}</p>}
              <div className={styles.formActions}>
                <Dialog.Close className={styles.btnCancel} type="button">Cancel</Dialog.Close>
                <button type="submit" className={styles.btnSubmit} disabled={buildingSubmitting}>
                  {buildingSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Edit Customer Dialog ── */}
      <Dialog.Root open={editCustomerOpen} onOpenChange={(o) => { setEditCustomerOpen(o); if (!o) setCustomerError(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} aria-describedby={undefined}>
            <div className={styles.dialogHeader}>
              <Dialog.Title className={styles.dialogTitle}>Edit Customer</Dialog.Title>
              <Dialog.Close className={styles.dialogCloseBtn}><X size={18} /></Dialog.Close>
            </div>
            <form onSubmit={handleCustomerSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>First Name</label>
                  <input className={styles.formInput} value={customerForm.firstName}
                    onChange={(e) => setCField('firstName', e.target.value)} required />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Middle Name</label>
                  <input className={styles.formInput} value={customerForm.middleName}
                    onChange={(e) => setCField('middleName', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Last Name</label>
                  <input className={styles.formInput} value={customerForm.lastName}
                    onChange={(e) => setCField('lastName', e.target.value)} required />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Phone</label>
                  <input className={styles.formInput} value={customerForm.phoneNumber}
                    onChange={(e) => setCField('phoneNumber', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Subscription Type</label>
                  <select className={styles.formSelect} value={customerForm.consumptionTypeId}
                    onChange={(e) => setCField('consumptionTypeId', e.target.value)} required>
                    <option value="">Select type…</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>{t.description} ({t.Ampere} A)</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Payment Status</label>
                  <select className={styles.formSelect} value={customerForm.consumptionStatusId}
                    onChange={(e) => setCField('consumptionStatusId', e.target.value)} required>
                    <option value="">Select status…</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>{s.Status}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Building</label>
                  <select className={styles.formSelect} value={customerForm.buildingId}
                    onChange={(e) => setCField('buildingId', e.target.value)}>
                    <option value="">No building</option>
                    {buildingList.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Floor Number</label>
                  <input className={styles.formInput} type="number" value={customerForm.floorNumber}
                    onChange={(e) => setCField('floorNumber', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Apartment Side</label>
                  <input className={styles.formInput} value={customerForm.apartmentSide}
                    onChange={(e) => setCField('apartmentSide', e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Account Status</label>
                  <select className={styles.formSelect} value={customerForm.status}
                    onChange={(e) => setCField('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className={styles.formFieldFull}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea className={styles.formTextarea} value={customerForm.description}
                    onChange={(e) => setCField('description', e.target.value)} rows={2} />
                </div>
                <div className={styles.formFieldFull}>
                  <div className={styles.formCheckboxRow}>
                    <input className={styles.formCheckbox} type="checkbox" id="ecIsCounter"
                      checked={customerForm.isCounter} onChange={(e) => setCField('isCounter', e.target.checked)} />
                    <label className={styles.formCheckboxLabel} htmlFor="ecIsCounter">Counter-based billing</label>
                  </div>
                </div>
              </div>
              {customerError && <p className={styles.formError}>{customerError}</p>}
              <div className={styles.formActions}>
                <Dialog.Close className={styles.btnCancel} type="button">Cancel</Dialog.Close>
                <button type="submit" className={styles.btnSubmit} disabled={customerSubmitting}>
                  {customerSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog.Root open={!!confirmDelete} onOpenChange={(o) => { if (!o) { setConfirmDelete(null); setDeleteError(null); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={`${styles.dialogContent} ${styles.confirmDialog}`} aria-describedby={undefined}>
            <div className={styles.dialogHeader}>
              <Dialog.Title className={styles.dialogTitle}>Confirm Delete</Dialog.Title>
              <Dialog.Close className={styles.dialogCloseBtn}><X size={18} /></Dialog.Close>
            </div>
            <p className={styles.confirmText}>
              Delete <strong>{confirmDelete?.name}</strong>?
              {confirmDelete?.kind !== 'customer' && (
                <span className={styles.confirmSub}> This will fail if linked records exist.</span>
              )}
            </p>
            {deleteError && <p className={styles.formError}>{deleteError}</p>}
            <div className={styles.formActions}>
              <Dialog.Close className={styles.btnCancel} type="button">Cancel</Dialog.Close>
              <button className={styles.btnDelete} onClick={handleDelete} disabled={deleteSubmitting}>
                {deleteSubmitting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Page Header ── */}
      <div className={styles.header}>
        <Link to={`/generator-groups/${groupId}`} className={styles.backLink}>
          <ArrowLeft size={14} />
          Back to {groupLabel || 'Group'}
        </Link>
        <h1 className={styles.title}>{groupLabel || 'Group'} — Management</h1>
      </div>

      {/* ── Tab Bar ── */}
      <div className={styles.tabBar}>
        <button className={`${styles.tab} ${activeTab === 'types' ? styles.tabActive : ''}`} onClick={() => setActiveTab('types')}>
          <Zap size={14} /> Subscription Types
          <span className={styles.tabBadge}>{types.length}</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'buildings' ? styles.tabActive : ''}`} onClick={() => setActiveTab('buildings')}>
          <Building2 size={14} /> Buildings
          <span className={styles.tabBadge}>{buildings.length}</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'customers' ? styles.tabActive : ''}`} onClick={() => setActiveTab('customers')}>
          <Users size={14} /> Customers
          <span className={styles.tabBadge}>{customers.length}</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'readings' ? styles.tabActive : ''}`} onClick={() => setActiveTab('readings')}>
          <Gauge size={14} /> Meter Readings
          <span className={styles.tabBadge}>{counterData.length}</span>
        </button>
      </div>

      {/* ── Content ── */}
      <div className={styles.content}>

        {/* Subscription Types */}
        {activeTab === 'types' && (
          <div className={styles.section}>
            {typesLoading ? <p className={styles.empty}>Loading…</p> : types.length === 0 ? (
              <p className={styles.empty}>No subscription types yet.</p>
            ) : (
              <>
                <div className={styles.typeGroupHeader}>
                  <Gauge size={14} color="#60a5fa" />
                  <span className={styles.typeGroupTitle}>Counter</span>
                  <span className={styles.tabBadge}>{counterTypes.length}</span>
                </div>
                {counterTypes.length === 0 ? (
                  <p className={styles.empty}>No counter types yet.</p>
                ) : (
                  <div className={styles.typeGrid}>
                    {counterTypes.map((t) => renderTypeCard(t))}
                  </div>
                )}

                <div className={styles.typeGroupHeader} style={{ marginTop: '1.5rem' }}>
                  <Zap size={14} color="#a78bfa" />
                  <span className={styles.typeGroupTitle}>Fixed</span>
                  <span className={styles.tabBadge}>{fixedTypes.length}</span>
                </div>
                {fixedTypes.length === 0 ? (
                  <p className={styles.empty}>No fixed types yet.</p>
                ) : (
                  <div className={styles.typeGrid}>
                    {fixedTypes.map((t) => renderTypeCard(t))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Buildings */}
        {activeTab === 'buildings' && (
          <div className={styles.section}>
            {buildingsLoading ? <p className={styles.empty}>Loading…</p> : buildings.length === 0 ? (
              <p className={styles.empty}>No buildings yet.</p>
            ) : (
              <>
                <div className={styles.readingsToolbar}>
                  <div className={styles.readingsSearchWrap}>
                    <Search size={13} className={styles.readingsSearchIcon} />
                    <input
                      className={styles.readingsSearchInput}
                      placeholder="Search building…"
                      value={buildingSearch}
                      onChange={(e) => setBuildingSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className={styles.formSelect}
                    style={{ width: 180 }}
                    value={buildingSort}
                    onChange={(e) => setBuildingSort(e.target.value as typeof buildingSort)}
                  >
                    <option value="name-asc">Name A–Z</option>
                    <option value="name-desc">Name Z–A</option>
                    <option value="floors-desc">Most floors</option>
                    <option value="floors-asc">Fewest floors</option>
                  </select>
                  <span className={styles.tabBadge} style={{ marginLeft: 'auto' }}>
                    {filteredBuildings.length} of {buildings.length}
                  </span>
                </div>

                {filteredBuildings.length === 0 ? (
                  <p className={styles.empty}>No buildings match.</p>
                ) : (
                  <div className={`${styles.buildingList} ${styles.scrollPane}`}>
                    {filteredBuildings.map((b) => {
                      const expanded = expandedBuildings.has(b.id);
                      return (
                        <div key={b.id} className={styles.buildingCard}>
                          <div className={styles.buildingToggleRow}>
                            <button className={styles.buildingToggle} onClick={() => toggleBuilding(b.id)}>
                              <Building2 size={16} color="#a78bfa" />
                              <span className={styles.buildingName}>{b.name}</span>
                              <span className={styles.buildingFloorCount}>
                                {b.buildingfloors.length} floor{b.buildingfloors.length !== 1 ? 's' : ''}
                              </span>
                              {expanded ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                            </button>
                            <div className={styles.buildingRowActions}>
                              <button className={styles.actionBtnEdit} title="Rename" onClick={() => openEditBuilding(b)}>
                                <Pencil size={13} />
                              </button>
                              <button className={styles.actionBtnDelete} title="Delete"
                                onClick={() => setConfirmDelete({ kind: 'building', id: b.id, name: b.name })}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {expanded && (
                            <div className={styles.buildingFloors}>
                              {b.buildingfloors.length === 0 ? (
                                <p className={styles.floorEmpty}>No floors recorded.</p>
                              ) : (
                                <table className={styles.floorTable}>
                                  <thead>
                                    <tr><th>Floor</th><th>Side</th><th>Resident</th></tr>
                                  </thead>
                                  <tbody>
                                    {b.buildingfloors.map((f) => (
                                      <tr key={f.id}>
                                        <td>{f.floorNumber}</td>
                                        <td>{f.apartmentSide}</td>
                                        <td>
                                          {f.customer
                                            ? [f.customer.firstName, f.customer.middleName, f.customer.lastName].filter(Boolean).join(' ')
                                            : <span className={styles.noCustomer}>—</span>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Customers */}
        {activeTab === 'customers' && (
          <div className={styles.section}>
            <div className={styles.viewSwitcher}>
              <button className={`${styles.viewBtn} ${customerView === 'table' ? styles.viewBtnActive : ''}`} onClick={() => setCustomerView('table')}>
                <Table2 size={13} /> Table
              </button>
              <button className={`${styles.viewBtn} ${customerView === 'byBuilding' ? styles.viewBtnActive : ''}`} onClick={() => setCustomerView('byBuilding')}>
                <Building2 size={13} /> By Building
              </button>
              <button className={`${styles.viewBtn} ${customerView === 'byType' ? styles.viewBtnActive : ''}`} onClick={() => setCustomerView('byType')}>
                <Zap size={13} /> By Subscription Type
              </button>
              <span className={styles.tabBadge} style={{ marginLeft: 'auto' }}>
                {customerView === 'table' ? `${filteredSortedCustomers.length} of ${customers.length}` : `${customers.length} total`}
              </span>
            </div>

            {customersLoading ? <p className={styles.empty}>Loading…</p> : customers.length === 0 ? (
              <p className={styles.empty}>No customers yet.</p>
            ) : customerView === 'table' ? (
              <div className={`${styles.tableWrap} ${styles.scrollPane}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{renderSortHeader('Name', 'name')}</th>
                      <th>{renderSortHeader('Building / Floor', 'building')}</th>
                      <th>{renderSortHeader('Subscription Type', 'type')}</th>
                      <th>{renderSortHeader('Ampere', 'ampere')}</th>
                      <th>{renderSortHeader('Phase', 'phase')}</th>
                      <th>{renderSortHeader('Payment Status', 'paymentStatus')}</th>
                      <th>{renderSortHeader('Status', 'status')}</th>
                      <th>{renderSortHeader('Remaining', 'remaining')}</th>
                      <th></th>
                    </tr>
                    <tr className={styles.filterRow}>
                      <th>
                        <input className={styles.colFilterInput} placeholder="Filter…" value={colFilters.name}
                          onChange={(e) => setColFilters((f) => ({ ...f, name: e.target.value }))} />
                      </th>
                      <th>
                        <select className={styles.colFilterInput} value={colFilters.building}
                          onChange={(e) => setColFilters((f) => ({ ...f, building: e.target.value }))}>
                          <option value="">All</option>
                          {buildingList.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                      </th>
                      <th>
                        <select className={styles.colFilterInput} value={colFilters.type}
                          onChange={(e) => setColFilters((f) => ({ ...f, type: e.target.value }))}>
                          <option value="">All</option>
                          {types.map((t) => <option key={t.id} value={t.id}>{t.description}</option>)}
                        </select>
                      </th>
                      <th></th>
                      <th>
                        <select className={styles.colFilterInput} value={colFilters.phase}
                          onChange={(e) => setColFilters((f) => ({ ...f, phase: e.target.value }))}>
                          <option value="">All</option>
                          <option value="3">3-Phase</option>
                          <option value="1">1-Phase</option>
                        </select>
                      </th>
                      <th>
                        <select className={styles.colFilterInput} value={colFilters.paymentStatus}
                          onChange={(e) => setColFilters((f) => ({ ...f, paymentStatus: e.target.value }))}>
                          <option value="">All</option>
                          {statuses.map((s) => <option key={s.id} value={s.id}>{s.Status}</option>)}
                        </select>
                      </th>
                      <th>
                        <select className={styles.colFilterInput} value={colFilters.status}
                          onChange={(e) => setColFilters((f) => ({ ...f, status: e.target.value }))}>
                          <option value="">All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </th>
                      <th>
                        <select className={styles.colFilterInput} value={colFilters.balance}
                          onChange={(e) => setColFilters((f) => ({ ...f, balance: e.target.value }))}>
                          <option value="">All</option>
                          <option value="owing">Owing</option>
                          <option value="paid">Paid up</option>
                          <option value="nobill">No bill this month</option>
                        </select>
                      </th>
                      <th>
                        {(colFilters.name || colFilters.type || colFilters.phase || colFilters.paymentStatus || colFilters.building || colFilters.status || colFilters.balance) && (
                          <button type="button" className={styles.clearFiltersBtn} onClick={() => setColFilters(EMPTY_CUSTOMER_FILTERS)}>
                            Clear
                          </button>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSortedCustomers.length === 0 && (
                      <tr><td colSpan={9} className={styles.empty}>No customers match.</td></tr>
                    )}
                    {filteredSortedCustomers.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link to={`/customers/${c.id}`} className={styles.customerLink}>
                            {fullName(c)}
                          </Link>
                        </td>
                        <td>
                          {c.buildingFloor
                            ? `${buildingNameOf(c)} · Floor ${c.buildingFloor.floorNumber} ${c.buildingFloor.apartmentSide}`
                            : '—'}
                        </td>
                        <td>{c.consumptionType.description}</td>
                        <td>{c.consumptionType.Ampere} A</td>
                        <td>{c.consumptionType.ThreePhase ? '3-Phase' : '1-Phase'}</td>
                        <td>
                          <span className={`${styles.statusPill} ${getPaymentClass(c.consumptionStatus.Status, styles)}`}>
                            {c.consumptionStatus.Status}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.statusPill} ${c.status === 'active' ? styles.pillActive : styles.pillInactive}`}>
                            {c.status}
                          </span>
                        </td>
                        <td>{renderRemaining(c)}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button className={styles.actionBtnEdit} title="Edit" onClick={() => openEditCustomer(c)}>
                              <Pencil size={13} />
                            </button>
                            <button className={styles.actionBtnDelete} title="Delete"
                              onClick={() => setConfirmDelete({ kind: 'customer', id: c.id, name: `${c.firstName} ${c.lastName}` })}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : customerView === 'byBuilding' ? (
              <div className={`${styles.buildingList} ${styles.scrollPane}`}>
                {customersByBuilding.map((g) => {
                  const key = `building:${g.key}`;
                  const expanded = expandedGroups.has(key);
                  return (
                    <div key={key} className={styles.buildingCard}>
                      <button className={styles.buildingToggle} onClick={() => toggleGroup(key)}>
                        <Building2 size={16} color="#a78bfa" />
                        <span className={styles.buildingName}>{g.label}</span>
                        <span className={styles.buildingFloorCount}>{g.items.length} customer{g.items.length !== 1 ? 's' : ''}</span>
                        {renderGroupRemainingBadge(g.totalRemaining)}
                        {expanded ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                      </button>
                      {expanded && (
                        <div className={styles.buildingFloors}>
                          <table className={styles.floorTable}>
                            <thead>
                              <tr><th>Customer</th><th>Floor</th><th>Subscription</th><th>Payment</th><th>Remaining</th></tr>
                            </thead>
                            <tbody>
                              {g.items.map((c) => (
                                <tr key={c.id}>
                                  <td><Link to={`/customers/${c.id}`} className={styles.customerLink}>{fullName(c)}</Link></td>
                                  <td>{c.buildingFloor ? `${c.buildingFloor.floorNumber} ${c.buildingFloor.apartmentSide}` : '—'}</td>
                                  <td>{c.consumptionType.description}</td>
                                  <td>
                                    <span className={`${styles.statusPill} ${getPaymentClass(c.consumptionStatus.Status, styles)}`}>
                                      {c.consumptionStatus.Status}
                                    </span>
                                  </td>
                                  <td>{renderRemaining(c)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`${styles.buildingList} ${styles.scrollPane}`}>
                {customersByType.map((g) => {
                  const key = `type:${g.key}`;
                  const expanded = expandedGroups.has(key);
                  return (
                    <div key={key} className={styles.buildingCard}>
                      <button className={styles.buildingToggle} onClick={() => toggleGroup(key)}>
                        <Zap size={16} color="#facc15" />
                        <span className={styles.buildingName}>{g.label}</span>
                        {g.type && (
                          <span className={styles.buildingFloorCount}>
                            {g.type.Ampere} A · {g.type.ThreePhase ? '3-Phase' : '1-Phase'} · {g.type.isCounter ? 'Counter' : 'Fixed'}
                          </span>
                        )}
                        <span className={styles.buildingFloorCount}>{g.items.length} customer{g.items.length !== 1 ? 's' : ''}</span>
                        {renderGroupRemainingBadge(g.totalRemaining)}
                        {expanded ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                      </button>
                      {expanded && (
                        <div className={styles.buildingFloors}>
                          <table className={styles.floorTable}>
                            <thead>
                              <tr><th>Customer</th><th>Building / Floor</th><th>Payment</th><th>Status</th><th>Remaining</th></tr>
                            </thead>
                            <tbody>
                              {g.items.map((c) => (
                                <tr key={c.id}>
                                  <td><Link to={`/customers/${c.id}`} className={styles.customerLink}>{fullName(c)}</Link></td>
                                  <td>{c.buildingFloor ? `${buildingNameOf(c)} · Floor ${c.buildingFloor.floorNumber} ${c.buildingFloor.apartmentSide}` : '—'}</td>
                                  <td>
                                    <span className={`${styles.statusPill} ${getPaymentClass(c.consumptionStatus.Status, styles)}`}>
                                      {c.consumptionStatus.Status}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`${styles.statusPill} ${c.status === 'active' ? styles.pillActive : styles.pillInactive}`}>
                                      {c.status}
                                    </span>
                                  </td>
                                  <td>{renderRemaining(c)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Meter Readings */}
        {activeTab === 'readings' && (
          <div className={styles.section}>
            <div className={styles.readingsToolbar}>
              <div className={styles.monthPicker}>
                <button className={styles.monthPickerBtn} onClick={() => goMonth(-1)}><ChevronLeft size={14} /></button>
                <span className={styles.monthPickerLabel}>{fmtMonth(month)}</span>
                <button className={styles.monthPickerBtn} onClick={() => goMonth(1)}><ChevronRight size={14} /></button>
              </div>
              <div className={styles.readingsSearchWrap}>
                <Search size={13} className={styles.readingsSearchIcon} />
                <input
                  className={styles.readingsSearchInput}
                  placeholder="Search customer…"
                  value={counterSearch}
                  onChange={(e) => setCounterSearch(e.target.value)}
                />
              </div>
              <label className={styles.readingsPendingToggle}>
                <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
                Pending only
              </label>
              <select
                className={styles.colFilterInput}
                style={{ width: 160 }}
                value={counterBuildingFilter}
                onChange={(e) => setCounterBuildingFilter(e.target.value)}
              >
                <option value="">All buildings</option>
                {buildingList.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
              {(counterSearch || counterBuildingFilter || pendingOnly) && (
                <button type="button" className={styles.clearFiltersBtn} onClick={() => { setCounterSearch(''); setCounterBuildingFilter(''); setPendingOnly(false); }}>
                  Clear
                </button>
              )}
            </div>

            {countersLoading ? <p className={styles.empty}>Loading…</p> : countersError ? (
              <p className={styles.formError}>{countersError}</p>
            ) : filteredCounters.length === 0 ? (
              <p className={styles.empty}>
                {counterData.length === 0 ? 'No counter customers billed for this month.' : 'No customers match.'}
              </p>
            ) : (
              <div className={`${styles.tableWrap} ${styles.scrollPane}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{renderCounterSortHeader('Customer', 'name')}</th>
                      <th>{renderCounterSortHeader('Building', 'building')}</th>
                      <th>{renderCounterSortHeader('kWh Price', 'price')}</th>
                      <th>{renderCounterSortHeader('Previous', 'previous')}</th>
                      <th>{renderCounterSortHeader('Current Reading', 'current')}</th>
                      <th>{renderCounterSortHeader('Usage', 'usage')}</th>
                      <th>{renderCounterSortHeader('Est. Amount', 'amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCounters.map((e) => {
                      const value = edits[e.consumptionId] ?? e.currentCounter;
                      const usage = value - e.previousCounter;
                      const isDirty = edits[e.consumptionId] !== undefined && edits[e.consumptionId] !== e.currentCounter;
                      const isNegative = usage < 0;
                      return (
                        <tr key={e.consumptionId}>
                          <td>
                            <Link to={`/customers/${e.customerId}`} className={styles.customerLink}>{e.customerName}</Link>
                          </td>
                          <td className={styles.noCustomer}>{buildingNameOfCustomerId(e.customerId) || '—'}</td>
                          <td>${e.kwhPrice.toFixed(3)}</td>
                          <td>{e.previousCounter}</td>
                          <td>
                            <input
                              ref={(el) => { counterInputRefs.current[e.consumptionId] = el; }}
                              type="number"
                              className={`${styles.counterInput} ${isDirty ? styles.counterInputDirty : ''} ${isNegative ? styles.counterInputWarn : ''}`}
                              value={value}
                              onChange={(ev) => setReading(e.consumptionId, ev.target.value)}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter') { ev.preventDefault(); focusNextCounter(e.consumptionId); }
                              }}
                            />
                          </td>
                          <td style={isNegative ? { color: '#f87171', fontWeight: 600 } : undefined}>{usage}</td>
                          <td>${(usage * e.kwhPrice).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className={styles.counterSaveBar}>
              {counterSaveMsg && <span className={styles.counterSaveMsg}><CheckCircle size={13} /> {counterSaveMsg}</span>}
              {counterSaveErr && <span className={styles.counterSaveErr}><AlertCircle size={13} /> {counterSaveErr}</span>}
              <span className={styles.counterSaveCount}>
                {dirtyCounterIds.length === 0 ? 'No unsaved changes' : `${dirtyCounterIds.length} unsaved change${dirtyCounterIds.length !== 1 ? 's' : ''}`}
              </span>
              <button className={styles.counterSaveBtn} disabled={counterSaving || dirtyCounterIds.length === 0} onClick={handleSaveCounters}>
                {counterSaving ? <><Loader size={14} className={styles.counterSpin} /> Saving…</> : 'Save All'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function getPaymentClass(status: string, s: typeof styles): string {
  switch (status.toLowerCase()) {
    case 'paid':    return s.pillPaid;
    case 'unpaid':  return s.pillUnpaid;
    case 'overdue': return s.pillOverdue;
    default:        return s.pillInactive;
  }
}
