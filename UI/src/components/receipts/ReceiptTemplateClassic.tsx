import type { ReceiptData } from '../../api/billing/billing.api';
import { useReceiptTemplate, type ReceiptCompanyInfo } from '../../context/ReceiptTemplateContext';
import { fmtDate, consumptionLabel, plainNumber } from './receiptUtils';
import styles from './ReceiptTemplateClassic.module.css';

function ReceiptStub({ r, showHeader, companyInfo }: { r: ReceiptData; showHeader: boolean; companyInfo: ReceiptCompanyInfo }) {
  const usage = r.currentCounter - r.previousCounter;
  const kwhAmount = usage * r.kwhPrice;

  return (
    <div className={`${styles.stub} ${showHeader ? styles.stubHeader : styles.stubPlain}`}>
      <div className={styles.headerZone}>
        {showHeader && (
          <div className={styles.companyHeader}>
            <h1 className={styles.companyName}>{companyInfo.name}</h1>
            <p className={styles.companyPhone}>تلفون&nbsp;&nbsp;{companyInfo.phone}</p>
            <p className={styles.companyPhone}>قسم الصيانة&nbsp;&nbsp;{companyInfo.maintenancePhone}</p>
          </div>
        )}
      </div>

      <div className={styles.hugRow}>
        <div className={styles.tableWrap}>
          <table className={styles.boxedTable}>
            <tbody>
              <tr>
                <td className={styles.labelCell}>اسم المشترك</td>
                <td className={styles.valueCell}><span className={styles.valueText}>{r.customerName}</span></td>
              </tr>
              <tr>
                <td className={styles.labelCell}>المبلغ وقدره</td>
                <td className={styles.valueCell}><span className={styles.valueText}>{plainNumber(r.remaining)}</span></td>
              </tr>
              <tr>
                <td className={styles.labelCell}>التاريخ</td>
                <td className={styles.valueCell}><span className={styles.valueText}>{fmtDate(r.date)}</span></td>
              </tr>
              <tr>
                <td className={styles.labelCell}>الإستهلاك</td>
                <td className={styles.valueCell}><span className={styles.valueText}>{consumptionLabel(r)}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.hugRow}>
        <div className={styles.breakdown}>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLbl}>:إشتراك شهري</span>
            <span className={styles.breakdownVal}>{plainNumber(r.monthlyFee)}</span>
          </div>
          {r.isCounter && (
            <>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLbl}>Kwh 1 :عداد</span>
                <span className={styles.breakdownVal}>{plainNumber(r.previousCounter)}</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLbl}>Kwh 2 :عداد</span>
                <span className={styles.breakdownVal}>{plainNumber(r.currentCounter)}</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLbl}>:Difference</span>
                <span className={styles.breakdownVal}>{plainNumber(usage)}</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLbl}>:Kwh Amount</span>
                <span className={styles.breakdownVal}>{plainNumber(kwhAmount)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={`${styles.hugRow} ${styles.balanceWrap}`}>
        <div className={styles.tableWrap}>
          <table className={styles.boxedTable}>
            <tbody>
              <tr>
                <td className={styles.labelCell}>الرصيد الباقي</td>
                <td className={styles.valueCell}><span className={styles.valueText}>{plainNumber(r.remaining)}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReceiptPage({ r, companyInfo }: { r: ReceiptData; companyInfo: ReceiptCompanyInfo }) {
  const d = new Date(r.date);
  const monthNum = d.getUTCMonth() + 1;

  return (
    <div className={styles.page}>
      <ReceiptStub r={r} showHeader companyInfo={companyInfo} />
      <div className={styles.middleStub}>
        <p className={styles.monthTag}>عن شهر <span className={styles.monthValue}>{monthNum}</span></p>
        {r.buildingName && <p className={styles.buildingTag}>Building: {r.buildingName}</p>}
      </div>
      <ReceiptStub r={r} showHeader={false} companyInfo={companyInfo} />
    </div>
  );
}

export function ReceiptTemplateClassic({ receipts, preview }: { receipts: ReceiptData[]; preview?: boolean }) {
  const { companyInfo } = useReceiptTemplate();
  return (
    <div className={`${styles.printRoot} ${preview ? styles.previewRoot : ''}`}>
      {receipts.map((r) => (
        <ReceiptPage key={`${r.customerId}-${r.consumptionId}`} r={r} companyInfo={companyInfo} />
      ))}
    </div>
  );
}
