import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Zap, Building2, Users, ChevronDown, ChevronRight, Pencil, Trash2, X,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useConsumptionLookups } from '../../hooks/useConsumptionLookups';
import { useBuildingDetails } from '../../hooks/useBuildingDetails';
import { useBuildings } from '../../hooks/useBuildings';
import { useCustomers } from '../../hooks/useCustomers';
import { useRegions } from '../../hooks/useGetRegions';
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

type Tab = 'types' | 'buildings' | 'customers';

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

  const { data: regions } = useRegions();
  const { statuses, types, loading: typesLoading, refetchTypes } = useConsumptionLookups(groupId);
  const { data: buildings, loading: buildingsLoading, refetch: refetchBuildings } = useBuildingDetails(groupId);
  const { data: buildingList } = useBuildings(groupId);
  const { data: customers, loading: customersLoading, refetch: refetchCustomers } = useCustomers(groupId);

  let groupLabel = '';
  for (const region of regions) {
    const group = region.groups.find((g) => g.id === groupId);
    if (group) { groupLabel = group.label; break; }
  }

  const customersPerType = customers.reduce<Record<string, number>>((acc, c) => {
    acc[c.consumptionTypeId] = (acc[c.consumptionTypeId] ?? 0) + 1;
    return acc;
  }, {});

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
      </div>

      {/* ── Content ── */}
      <div className={styles.content}>

        {/* Subscription Types */}
        {activeTab === 'types' && (
          <div className={styles.section}>
            {typesLoading ? <p className={styles.empty}>Loading…</p> : types.length === 0 ? (
              <p className={styles.empty}>No subscription types yet.</p>
            ) : (
              <div className={styles.typeGrid}>
                {types.map((t) => (
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
                ))}
              </div>
            )}
          </div>
        )}

        {/* Buildings */}
        {activeTab === 'buildings' && (
          <div className={styles.section}>
            {buildingsLoading ? <p className={styles.empty}>Loading…</p> : buildings.length === 0 ? (
              <p className={styles.empty}>No buildings yet.</p>
            ) : (
              <div className={styles.buildingList}>
                {buildings.map((b) => {
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
          </div>
        )}

        {/* Customers */}
        {activeTab === 'customers' && (
          <div className={styles.section}>
            {customersLoading ? <p className={styles.empty}>Loading…</p> : customers.length === 0 ? (
              <p className={styles.empty}>No customers yet.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Subscription Type</th>
                      <th>Ampere</th>
                      <th>Phase</th>
                      <th>Payment Status</th>
                      <th>Building / Floor</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link to={`/customers/${c.id}`} className={styles.customerLink}>
                            {[c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ')}
                          </Link>
                        </td>
                        <td>{c.phoneNumber ?? '—'}</td>
                        <td>{c.consumptionType.description}</td>
                        <td>{c.consumptionType.Ampere} A</td>
                        <td>{c.consumptionType.ThreePhase ? '3-Phase' : '1-Phase'}</td>
                        <td>
                          <span className={`${styles.statusPill} ${getPaymentClass(c.consumptionStatus.Status, styles)}`}>
                            {c.consumptionStatus.Status}
                          </span>
                        </td>
                        <td>
                          {c.buildingFloor
                            ? `Floor ${c.buildingFloor.floorNumber} ${c.buildingFloor.apartmentSide}`
                            : '—'}
                        </td>
                        <td>
                          <span className={`${styles.statusPill} ${c.status === 'active' ? styles.pillActive : styles.pillInactive}`}>
                            {c.status}
                          </span>
                        </td>
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
            )}
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
