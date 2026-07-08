import type { ReceiptData } from '../../api/billing/billing.api';
import { useReceiptTemplate } from '../../context/ReceiptTemplateContext';
import { ReceiptTemplateClassic } from './ReceiptTemplateClassic';
import { ReceiptTemplateModern } from './ReceiptTemplateModern';
import { ReceiptTemplateCompact } from './ReceiptTemplateCompact';

export function ReceiptPrintSheet({ receipts }: { receipts: ReceiptData[] }) {
  const { template } = useReceiptTemplate();

  if (template === 'modern') return <ReceiptTemplateModern receipts={receipts} />;
  if (template === 'compact') return <ReceiptTemplateCompact receipts={receipts} />;
  return <ReceiptTemplateClassic receipts={receipts} />;
}
