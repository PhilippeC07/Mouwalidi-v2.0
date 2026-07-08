import type { ReceiptData } from '../../api/billing/billing.api';
import { useReceiptTemplate, type ReceiptCompanyInfo } from '../../context/ReceiptTemplateContext';
import { fmtDate, consumptionLabel, plainNumber, receiptMonthNum } from './receiptUtils';
import styles from './ReceiptTemplateModern.module.css';

function ReceiptStub({ r, showHeader, companyInfo }: { r: ReceiptData; showHeader: boolean; companyInfo: ReceiptCompanyInfo }) {
  const usage = r.currentCounter - r.previousCounter;
  const kwhAmount = usage * r.kwhPrice;

  return (
    <div className={styles.stub}>
      <div className={styles.headerZone}>
        {showHeader ? (
          <div className={styles.companyHeader}>
            <h1 className={styles.companyName}>{companyInfo.name}</h1>
            <p className={styles.companyPhones}>
              تلفون {companyInfo.phone} &nbsp;·&nbsp; قسم الصيانة {companyInfo.maintenancePhone}
            </p>
          </div>
        ) : (
          <div className={styles.copyTag}>نسخة المشترك</div>
        )}
      </div>

      <div className={styles.fieldsBox}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>اسم المشترك</span>
          <span className={styles.fieldValue}>{r.customerName}</span>
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>التاريخ</span>
          <span className={styles.fieldValue}>{fmtDate(r.date)}</span>
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>الإستهلاك</span>
          <span className={styles.fieldValue}>{consumptionLabel(r)}</span>
        </div>
      </div>

      <div className={styles.breakdownGrid}>
        <div className={styles.breakdownCell}>
          <span className={styles.breakdownLbl}>إشتراك شهري</span>
          <span className={styles.breakdownVal}>{plainNumber(r.monthlyFee)}</span>
        </div>
        {r.isCounter && (
          <>
            <div className={styles.breakdownCell}>
              <span className={styles.breakdownLbl}>عداد Kwh 1</span>
              <span className={styles.breakdownVal}>{plainNumber(r.previousCounter)}</span>
            </div>
            <div className={styles.breakdownCell}>
              <span className={styles.breakdownLbl}>عداد Kwh 2</span>
              <span className={styles.breakdownVal}>{plainNumber(r.currentCounter)}</span>
            </div>
            <div className={styles.breakdownCell}>
              <span className={styles.breakdownLbl}>Difference</span>
              <span className={styles.breakdownVal}>{plainNumber(usage)}</span>
            </div>
            <div className={styles.breakdownCell}>
              <span className={styles.breakdownLbl}>Kwh Amount</span>
              <span className={styles.breakdownVal}>{plainNumber(kwhAmount)}</span>
            </div>
          </>
        )}
      </div>

      <div className={styles.balanceBar}>
        <span className={styles.balanceLabel}>الرصيد الباقي</span>
        <span className={styles.balanceValue}>{plainNumber(r.remaining)}</span>
      </div>
    </div>
  );
}

function ReceiptPage({ r, companyInfo }: { r: ReceiptData; companyInfo: ReceiptCompanyInfo }) {
  return (
    <div className={styles.page}>
      <ReceiptStub r={r} showHeader companyInfo={companyInfo} />
      <div className={styles.middleStub}>
        <p className={styles.monthTag}>عن شهر <span className={styles.monthValue}>{receiptMonthNum(r.date)}</span></p>
        {r.buildingName && <p className={styles.buildingTag}>{r.buildingName}</p>}
      </div>
      <ReceiptStub r={r} showHeader={false} companyInfo={companyInfo} />
    </div>
  );
}

export function ReceiptTemplateModern({ receipts, preview }: { receipts: ReceiptData[]; preview?: boolean }) {
  const { companyInfo } = useReceiptTemplate();
  return (
    <div className={`${styles.printRoot} ${preview ? styles.previewRoot : ''}`}>
      {receipts.map((r) => (
        <ReceiptPage key={`${r.customerId}-${r.consumptionId}`} r={r} companyInfo={companyInfo} />
      ))}
    </div>
  );
}
