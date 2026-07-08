import type { ComponentType } from 'react';
import type { ReceiptData } from '../../api/billing/billing.api';
import type { ReceiptTemplateId } from '../../context/ReceiptTemplateContext';
import { ReceiptTemplateClassic } from './ReceiptTemplateClassic';
import { ReceiptTemplateModern } from './ReceiptTemplateModern';
import { ReceiptTemplateCompact } from './ReceiptTemplateCompact';
import styles from './ReceiptTemplatePreview.module.css';

const SAMPLE_RECEIPT: ReceiptData = {
  consumptionId: 'preview',
  customerId: 'preview',
  customerName: 'جورج كرم',
  buildingName: 'مبنى 5',
  date: new Date().toISOString(),
  isCounter: true,
  ampere: 10,
  threePhase: false,
  monthlyFee: 10,
  previousCounter: 120,
  currentCounter: 145,
  kwhPrice: 5,
  amountPaid: 0,
  balance: 135,
  remaining: 135,
};

const TEMPLATE_COMPONENTS: Record<ReceiptTemplateId, ComponentType<{ receipts: ReceiptData[]; preview?: boolean }>> = {
  classic: ReceiptTemplateClassic,
  modern: ReceiptTemplateModern,
  compact: ReceiptTemplateCompact,
};

/** Renders the real print template at a scaled-down size — a true preview, not a lookalike mockup. */
export function ReceiptTemplatePreview({ template, scale = 0.34 }: { template: ReceiptTemplateId; scale?: number }) {
  const Component = TEMPLATE_COMPONENTS[template];
  return (
    <div className={styles.frame} style={{ width: `calc(220mm * ${scale})`, height: `calc(110mm * ${scale})` }}>
      <div className={styles.scaleWrap} style={{ transform: `scale(${scale})` }}>
        <Component receipts={[SAMPLE_RECEIPT]} preview />
      </div>
    </div>
  );
}
