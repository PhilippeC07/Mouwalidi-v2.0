import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useRegionsContext } from '../../context/RegionsContext';
import {
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  uploadEmployeePhoto,
  uploadEmployeeIdDocument,
  EMPLOYEE_ROLES,
  type Employee,
} from '../../api/employee/employee.api';
import { formatMoney } from '../../utils/format';
import { resolveUploadUrl } from '../../api/axios';
import settingsStyles from '../SettingsView/SettingsView.module.css';
import dialogStyles from '../GeneratorView/GeneratorView.module.css';
import styles from './EmployeesView.module.css';

interface EmployeeFormState {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  salary: string;
  status: string;
  notes: string;
  regionIds: string[];
  photoFile: File | null;
  idDocumentFile: File | null;
  currentPhotoUrl: string | null;
  currentIdDocumentUrl: string | null;
  visibleToCustomers: boolean;
}

const EMPTY_FORM: EmployeeFormState = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  role: EMPLOYEE_ROLES[0],
  salary: '',
  status: 'active',
  notes: '',
  regionIds: [],
  photoFile: null,
  idDocumentFile: null,
  currentPhotoUrl: null,
  currentIdDocumentUrl: null,
  visibleToCustomers: false,
};

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'An error occurred.';
}

function initials(emp: Employee): string {
  return `${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase();
}

export function EmployeesView() {
  const { data: regions } = useRegionsContext();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  function load() {
    setLoading(true);
    setErr(null);
    getEmployees()
      .then(setEmployees)
      .catch((e: unknown) => setErr(apiErr(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErr(null);
    setDialogOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      phoneNumber: emp.phoneNumber ?? '',
      role: emp.role,
      salary: String(emp.salary),
      status: emp.status,
      notes: emp.notes ?? '',
      regionIds: emp.regions.map((r) => r.id),
      photoFile: null,
      idDocumentFile: null,
      currentPhotoUrl: emp.profilePictureUrl,
      currentIdDocumentUrl: emp.idDocumentUrl,
      visibleToCustomers: emp.visibleToCustomers,
    });
    setFormErr(null);
    setDialogOpen(true);
  }

  function toggleRegion(id: string) {
    setForm((f) => ({
      ...f,
      regionIds: f.regionIds.includes(id) ? f.regionIds.filter((r) => r !== id) : [...f.regionIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormErr(null);
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      role: form.role,
      salary: Number(form.salary),
      status: form.status,
      notes: form.notes.trim() || undefined,
      regionIds: form.regionIds,
      visibleToCustomers: form.visibleToCustomers,
    };
    try {
      const employee = editingId ? await updateEmployee(editingId, payload) : await createEmployee(payload);
      if (form.photoFile) await uploadEmployeePhoto(employee.id, form.photoFile);
      if (form.idDocumentFile) await uploadEmployeeIdDocument(employee.id, form.idDocumentFile);
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      setFormErr(apiErr(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteBusy(true);
    try {
      await deleteEmployee(id);
      setDeleteId(null);
      load();
    } catch (err: unknown) {
      setErr(apiErr(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  const canSubmit = form.firstName.trim() !== '' && form.lastName.trim() !== '' && form.role !== '' && form.salary.trim() !== '';

  return (
    <div className={settingsStyles.page}>
      <div className={settingsStyles.pageHeader}>
        <h1 className={settingsStyles.pageTitle}>Employees</h1>
        <p className={settingsStyles.pageSubtitle}>Manage your staff, their roles, salaries, and region assignments</p>
      </div>

      <div className={settingsStyles.content}>
        <section className={settingsStyles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p className={settingsStyles.sectionDesc} style={{ margin: 0 }}>
              {employees.length} employee{employees.length !== 1 ? 's' : ''}
            </p>
            <button className={settingsStyles.infraBtn} onClick={openCreate}>
              <Plus size={13} /> Add Employee
            </button>
          </div>

          {loading && <p className={settingsStyles.manageEmpty}>Loading…</p>}
          {err && <p className={settingsStyles.manageErr}>{err}</p>}
          {!loading && !err && employees.length === 0 && <p className={settingsStyles.manageEmpty}>No employees yet.</p>}

          <div className={styles.grid}>
            {employees.map((emp) => {
              if (deleteId === emp.id) {
                return (
                  <div key={emp.id} className={`${styles.card} ${styles.cardDanger}`}>
                    <p className={styles.deleteText}>Delete "{emp.firstName} {emp.lastName}"?</p>
                    <div className={styles.deleteActions}>
                      <button className={settingsStyles.manageConfirmBtn} disabled={deleteBusy} onClick={() => handleDelete(emp.id)}>
                        {deleteBusy ? '…' : 'Delete'}
                      </button>
                      <button className={settingsStyles.manageCancelBtn} onClick={() => setDeleteId(null)}>Cancel</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={emp.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                      {emp.profilePictureUrl ? (
                        <img src={resolveUploadUrl(emp.profilePictureUrl)!} alt="" className={styles.avatarImg} />
                      ) : (
                        <div className={styles.avatar}>{initials(emp)}</div>
                      )}
                      <div>
                        <p className={styles.cardName}>{emp.firstName} {emp.lastName}</p>
                        <p className={styles.cardRole}>{emp.role}</p>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={settingsStyles.manageEditBtn} onClick={() => openEdit(emp)} title="Edit"><Pencil size={12} /></button>
                      <button className={settingsStyles.manageDeleteBtn} onClick={() => setDeleteId(emp.id)} title="Delete"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className={styles.chips}>
                    <span className={`${styles.chip} ${styles.chipSalary}`}>${formatMoney(emp.salary)}/mo</span>
                    <span className={`${styles.chip} ${emp.status === 'active' ? styles.chipActive : styles.chipInactive}`}>{emp.status}</span>
                    {emp.visibleToCustomers && (
                      <span className={`${styles.chip} ${styles.chipVisible}`}>visible to customers</span>
                    )}
                    {emp.regions.map((region) => (
                      <span key={region.id} className={`${styles.chip} ${styles.chipRegion}`}>{region.name}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={dialogStyles.dialogOverlay} />
          <Dialog.Content className={dialogStyles.dialogContent} aria-describedby={undefined}>
            <div className={dialogStyles.dialogHeader}>
              <Dialog.Title className={dialogStyles.dialogTitle}>
                {editingId ? 'Edit Employee' : 'Add Employee'}
              </Dialog.Title>
              <Dialog.Close className={dialogStyles.dialogCloseBtn}>
                <X size={18} />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={dialogStyles.formGrid}>
                <div className={dialogStyles.formField}>
                  <label className={dialogStyles.formLabel}>First Name *</label>
                  <input
                    className={dialogStyles.formInput}
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className={dialogStyles.formField}>
                  <label className={dialogStyles.formLabel}>Last Name *</label>
                  <input
                    className={dialogStyles.formInput}
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    required
                  />
                </div>
                <div className={dialogStyles.formField}>
                  <label className={dialogStyles.formLabel}>Phone Number</label>
                  <input
                    className={dialogStyles.formInput}
                    value={form.phoneNumber}
                    onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    placeholder="+961 70 000 000"
                  />
                </div>
                <div className={dialogStyles.formField}>
                  <label className={dialogStyles.formLabel}>Role *</label>
                  <select
                    className={`${dialogStyles.formInput} ${dialogStyles.formSelect}`}
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    required
                  >
                    {EMPLOYEE_ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div className={dialogStyles.formField}>
                  <label className={dialogStyles.formLabel}>Monthly Salary ($) *</label>
                  <input
                    className={dialogStyles.formInput}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.salary}
                    onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className={dialogStyles.formField}>
                  <label className={dialogStyles.formLabel}>Status</label>
                  <select
                    className={`${dialogStyles.formInput} ${dialogStyles.formSelect}`}
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className={`${dialogStyles.formField} ${dialogStyles.formFieldFull}`}>
                  <label className={dialogStyles.formCheckboxRow}>
                    <input
                      type="checkbox"
                      className={dialogStyles.formCheckbox}
                      checked={form.visibleToCustomers}
                      onChange={(e) => setForm((f) => ({ ...f, visibleToCustomers: e.target.checked }))}
                    />
                    <span className={dialogStyles.formCheckboxLabel}>
                      Visible to customers in this employee's regions (shows name, picture, phone, and role on their team page)
                    </span>
                  </label>
                </div>

                <div className={dialogStyles.formField}>
                  <label className={dialogStyles.formLabel}>Profile Picture</label>
                  <input
                    className={dialogStyles.formInput}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm((f) => ({ ...f, photoFile: e.target.files?.[0] ?? null }))}
                  />
                  {form.currentPhotoUrl && !form.photoFile && (
                    <a href={resolveUploadUrl(form.currentPhotoUrl)!} target="_blank" rel="noreferrer" style={{ color: 'var(--tx-4)', fontSize: '0.75rem' }}>
                      View current photo
                    </a>
                  )}
                </div>
                <div className={dialogStyles.formField}>
                  <label className={dialogStyles.formLabel}>ID Document</label>
                  <input
                    className={dialogStyles.formInput}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setForm((f) => ({ ...f, idDocumentFile: e.target.files?.[0] ?? null }))}
                  />
                  {form.currentIdDocumentUrl && !form.idDocumentFile && (
                    <a href={resolveUploadUrl(form.currentIdDocumentUrl)!} target="_blank" rel="noreferrer" style={{ color: 'var(--tx-4)', fontSize: '0.75rem' }}>
                      View current ID document
                    </a>
                  )}
                </div>

                <div className={`${dialogStyles.formField} ${dialogStyles.formFieldFull}`}>
                  <label className={dialogStyles.formLabel}>Assigned Regions</label>
                  {regions.length === 0 ? (
                    <p style={{ color: 'var(--tx-4)', fontSize: '0.82rem', margin: 0 }}>No regions yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {regions.map((region) => (
                        <label key={region.id} className={dialogStyles.formCheckboxRow}>
                          <input
                            type="checkbox"
                            className={dialogStyles.formCheckbox}
                            checked={form.regionIds.includes(region.id)}
                            onChange={() => toggleRegion(region.id)}
                          />
                          <span className={dialogStyles.formCheckboxLabel}>{region.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${dialogStyles.formField} ${dialogStyles.formFieldFull}`}>
                  <label className={dialogStyles.formLabel}>Notes</label>
                  <textarea
                    className={`${dialogStyles.formInput} ${dialogStyles.formTextarea}`}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              {formErr && (
                <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '12px' }}>{formErr}</p>
              )}

              <div className={dialogStyles.formActions}>
                <Dialog.Close className={dialogStyles.btnCancel} type="button" disabled={submitting}>
                  Cancel
                </Dialog.Close>
                <button type="submit" className={dialogStyles.btnSubmit} disabled={submitting || !canSubmit}>
                  {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
