import type { ReceiptData } from '../../api/billing/billing.api';
import { useReceiptTemplate, type ReceiptCompanyInfo } from '../../context/ReceiptTemplateContext';
import { fmtDate, consumptionLabel, plainNumber, receiptMonthNum } from './receiptUtils';
import styles from './ReceiptTemplateCompact.module.css';

function ReceiptStub({ r, showHeader, companyInfo }: { r: ReceiptData; showHeader: boolean; companyInfo: ReceiptCompanyInfo }) {
  const usage = r.currentCounter - r.previousCounter;
  const kwhAmount = usage * r.kwhPrice;

  return (
    <div className={styles.stub}>
      <div className={styles.headerZone}>
        {showHeader && (
          <div className={styles.companyHeader}>
            <span className={styles.companyName}>{companyInfo.name}</span>
            <span className={styles.companyPhones}>تلفون {companyInfo.phone} / صيانة {companyInfo.maintenancePhone}</span>
          </div>
        )}
      </div>

      <div className={styles.lines}>
        <div className={styles.line}><b>اسم المشترك:</b> {r.customerName}</div>
        <div className={styles.line}><b>التاريخ:</b> {fmtDate(r.date)}</div>
        <div className={styles.line}><b>الإستهلاك:</b> {consumptionLabel(r)}</div>
        <div className={styles.line}><b>إشتراك شهري:</b> {plainNumber(r.monthlyFee)}</div>
        {r.isCounter && (
          <div className={styles.line}>
            <b>عداد 1:</b> {plainNumber(r.previousCounter)} &nbsp;|&nbsp;
            <b>عداد 2:</b> {plainNumber(r.currentCounter)} &nbsp;|&nbsp;
            <b>فرق:</b> {plainNumber(usage)} &nbsp;|&nbsp;
            <b>مبلغ ك.و.س:</b> {plainNumber(kwhAmount)}
          </div>
        )}
      </div>

      <div className={styles.balanceLine}>
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
        <p className={styles.monthTag}>شهر <span className={styles.monthValue}>{receiptMonthNum(r.date)}</span></p>
        {r.buildingName && <p className={styles.buildingTag}>{r.buildingName}</p>}
      </div>
      <ReceiptStub r={r} showHeader={false} companyInfo={companyInfo} />
    </div>
  );
}

export function ReceiptTemplateCompact({ receipts, preview }: { receipts: ReceiptData[]; preview?: boolean }) {
  const { companyInfo } = useReceiptTemplate();
  return (
    <div className={`${styles.printRoot} ${preview ? styles.previewRoot : ''}`}>
      {receipts.map((r) => (
        <ReceiptPage key={`${r.customerId}-${r.consumptionId}`} r={r} companyInfo={companyInfo} />
      ))}
    </div>
  );
}
