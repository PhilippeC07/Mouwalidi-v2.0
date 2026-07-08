import { createContext, useContext, useEffect, useState } from 'react';

export type ReceiptTemplateId = 'classic' | 'modern' | 'compact';

export interface ReceiptCompanyInfo {
  name: string;
  phone: string;
  maintenancePhone: string;
}

interface ReceiptTemplateContextValue {
  template: ReceiptTemplateId;
  setTemplate: (t: ReceiptTemplateId) => void;
  companyInfo: ReceiptCompanyInfo;
  setCompanyInfo: (info: ReceiptCompanyInfo) => void;
}

const TEMPLATE_STORAGE_KEY = 'receiptTemplate';
const COMPANY_INFO_STORAGE_KEY = 'receiptCompanyInfo';
const DEFAULT_TEMPLATE: ReceiptTemplateId = 'classic';

// The receipt's title and phone numbers as they were hardcoded before this
// became admin-editable — kept as the default so existing printed receipts
// don't change unless someone deliberately edits them in Settings.
export const DEFAULT_COMPANY_INFO: ReceiptCompanyInfo = {
  name: 'مولدات إميل الشدياق',
  phone: '76/901902',
  maintenancePhone: '70/186952',
};

const ReceiptTemplateContext = createContext<ReceiptTemplateContextValue>({
  template: DEFAULT_TEMPLATE,
  setTemplate: () => {},
  companyInfo: DEFAULT_COMPANY_INFO,
  setCompanyInfo: () => {},
});

export function ReceiptTemplateProvider({ children }: { children: React.ReactNode }) {
  const [template, setTemplate] = useState<ReceiptTemplateId>(() => {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY) as ReceiptTemplateId | null;
    return stored === 'classic' || stored === 'modern' || stored === 'compact' ? stored : DEFAULT_TEMPLATE;
  });

  const [companyInfo, setCompanyInfo] = useState<ReceiptCompanyInfo>(() => {
    try {
      const stored = localStorage.getItem(COMPANY_INFO_STORAGE_KEY);
      if (!stored) return DEFAULT_COMPANY_INFO;
      const parsed = JSON.parse(stored) as Partial<ReceiptCompanyInfo>;
      return {
        name: parsed.name ?? DEFAULT_COMPANY_INFO.name,
        phone: parsed.phone ?? DEFAULT_COMPANY_INFO.phone,
        maintenancePhone: parsed.maintenancePhone ?? DEFAULT_COMPANY_INFO.maintenancePhone,
      };
    } catch {
      return DEFAULT_COMPANY_INFO;
    }
  });

  useEffect(() => {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, template);
  }, [template]);

  useEffect(() => {
    localStorage.setItem(COMPANY_INFO_STORAGE_KEY, JSON.stringify(companyInfo));
  }, [companyInfo]);

  return (
    <ReceiptTemplateContext.Provider value={{ template, setTemplate, companyInfo, setCompanyInfo }}>
      {children}
    </ReceiptTemplateContext.Provider>
  );
}

export const useReceiptTemplate = () => useContext(ReceiptTemplateContext);
