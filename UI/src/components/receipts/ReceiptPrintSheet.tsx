import type { ReceiptData } from '../../api/billing/billing.api';
import styles from './ReceiptPrintSheet.module.css';

const COMPANY_NAME = 'مولدات إميل الشدياق';
const COMPANY_PHONE = '76/901902';
const COMPANY_MAINTENANCE_PHONE = '70/186952';

function fmtDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

function consumptionLabel(r: ReceiptData) {
  return r.threePhase ? `3x${r.ampere} Amp(KWH)` : `${r.ampere} Amp(KWH)`;
}

/** Plain display: whole numbers as-is, otherwise 1 decimal place — no thousands separators. */
function plainNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function ReceiptStub({ r, showHeader }: { r: ReceiptData; showHeader: boolean }) {
  const usage = r.currentCounter - r.previousCounter;
  const kwhAmount = usage * r.kwhPrice;

  return (
    <div className={`${styles.stub} ${showHeader ? styles.stubHeader : styles.stubPlain}`}>
      <div className={styles.headerZone}>
        {showHeader && (
          <div className={styles.companyHeader}>
            <h1 className={styles.companyName}>{COMPANY_NAME}</h1>
            <p className={styles.companyPhone}>تلفون&nbsp;&nbsp;{COMPANY_PHONE}</p>
            <p className={styles.companyPhone}>قسم الصيانة&nbsp;&nbsp;{COMPANY_MAINTENANCE_PHONE}</p>
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

function ReceiptPage({ r }: { r: ReceiptData }) {
  const d = new Date(r.date);
  const monthNum = d.getUTCMonth() + 1;

  return (
    <div className={styles.page}>
      <ReceiptStub r={r} showHeader />
      <div className={styles.middleStub}>
        <p className={styles.monthTag}>عن شهر <span className={styles.monthValue}>{monthNum}</span></p>
        {r.buildingName && <p className={styles.buildingTag}>Building: {r.buildingName}</p>}
      </div>
      <ReceiptStub r={r} showHeader={false} />
    </div>
  );
}

export function ReceiptPrintSheet({ receipts }: { receipts: ReceiptData[] }) {
  return (
    <div className={styles.printRoot}>
      {receipts.map((r) => (
        <ReceiptPage key={`${r.customerId}-${r.consumptionId}`} r={r} />
      ))}
    </div>
  );
}
