import { api } from '../axios';

export const EMPLOYEE_ROLES = ['Collector', 'Maintenance', 'Accountant', 'Manager'] as const;

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
  salary: number;
  status?: string;
  notes?: string;
  regionIds?: string[];
  visibleToCustomers?: boolean;
}

export interface UpdateEmployeePayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
  salary?: number;
  status?: string;
  notes?: string;
  regionIds?: string[];
  visibleToCustomers?: boolean;
}

export interface EmployeeRegion {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  role: string;
  salary: number;
  status: string;
  notes: string | null;
  regions: EmployeeRegion[];
  profilePictureUrl: string | null;
  idDocumentUrl: string | null;
  visibleToCustomers: boolean;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  role: string;
  profilePictureUrl: string | null;
}

export const createEmployee = async (payload: CreateEmployeePayload): Promise<Employee> => {
  const { data } = await api.post<Employee>('/employees', payload);
  return data;
};

export const getEmployees = async (): Promise<Employee[]> => {
  const { data } = await api.get<Employee[]>('/employees');
  return data;
};

export const updateEmployee = async (id: string, payload: UpdateEmployeePayload): Promise<Employee> => {
  const { data } = await api.patch<Employee>(`/employees/${id}`, payload);
  return data;
};

export const deleteEmployee = async (id: string) => {
  const { data } = await api.delete(`/employees/${id}`);
  return data;
};

export const getMyRegionTeam = async (): Promise<TeamMember[]> => {
  const { data } = await api.get<TeamMember[]>('/employees/my-team');
  return data;
};

// The shared `api` instance defaults Content-Type to application/json for
// every request; that default must be cleared here so the browser can set
// its own multipart boundary for FormData bodies (setting a 'multipart/
// form-data' header manually would omit the boundary and break parsing).
const UPLOAD_HEADERS = { 'Content-Type': undefined };

export const uploadEmployeePhoto = async (id: string, file: File): Promise<Employee> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<Employee>(`/employees/${id}/photo`, formData, { headers: UPLOAD_HEADERS });
  return data;
};

export const uploadEmployeeIdDocument = async (id: string, file: File): Promise<Employee> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<Employee>(`/employees/${id}/id-document`, formData, { headers: UPLOAD_HEADERS });
  return data;
};
