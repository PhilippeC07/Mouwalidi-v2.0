import { formatMoney } from '../../utils/format';
import styles from './ListPrintSheet.module.css';

export interface CollectionsRow {
  customerId: string;
  name: string;
  buildingInfo: string;
  phoneNumber: string;
  amountOwed: number;
}

export function CollectionsPrintSheet({ title, rows }: { title: string; rows: CollectionsRow[] }) {
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + r.amountOwed, 0);

  return (
    <div className={styles.listPrintRoot}>
      <div className={styles.listPage}>
        <h1 className={styles.listTitle}>{title}</h1>
        <p className={styles.listSubtitle}>
          Collections list — {rows.length} customer{rows.length !== 1 ? 's' : ''} · Total owed: ${formatMoney(total)}
        </p>
        <table className={styles.listTable}>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Building</th>
              <th>Phone</th>
              <th>Amount Owed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.customerId}>
                <td>{r.name}</td>
                <td>{r.buildingInfo}</td>
                <td>{r.phoneNumber}</td>
                <td>${formatMoney(r.amountOwed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
