import styles from './ListPrintSheet.module.css';

export interface MeterReadingRow {
  customerId: string;
  name: string;
  buildingInfo: string;
}

export function MeterReadingPrintSheet({ title, rows }: { title: string; rows: MeterReadingRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className={styles.listPrintRoot}>
      <div className={styles.listPage}>
        <h1 className={styles.listTitle}>{title}</h1>
        <p className={styles.listSubtitle}>
          Meter reading sheet — {rows.length} customer{rows.length !== 1 ? 's' : ''}
        </p>
        <table className={styles.listTable}>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Building / Floor</th>
              <th className={styles.blankCell}>Current Counter</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.customerId}>
                <td>{r.name}</td>
                <td>{r.buildingInfo}</td>
                <td className={styles.blankCell} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
