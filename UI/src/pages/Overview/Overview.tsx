import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Zap,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  generators,
  calculateGeneratorTotalLoad,
  calculateGeneratorTotalBill,
  getGeneratorStatusStyle,
} from '../../app/data/mockData';
import { SimpleBarChart } from '../../app/components/SimpleBarChart';
import styles from './Overview.module.css';

const COLORS = ['#facc15', '#38bdf8', '#a78bfa', '#fb923c'];

export function Overview() {
  const allCustomers = generators.flatMap((g) => g.customers);
  const totalCustomers = allCustomers.length;
  const totalRevenue = generators.reduce(
    (sum, g) => sum + calculateGeneratorTotalBill(g),
    0,
  );
  const totalLoad = generators.reduce(
    (sum, g) => sum + calculateGeneratorTotalLoad(g),
    0,
  );
  const overdueCount = allCustomers.filter(
    (c) => c.status === 'overdue',
  ).length;
  const unpaidCount = allCustomers.filter((c) => c.status === 'unpaid').length;

  const loadChartData = generators.map((gen, i) => ({
    name: gen.name.replace('Generator ', 'Gen '),
    value: parseFloat(calculateGeneratorTotalLoad(gen).toFixed(1)),
    color: COLORS[i],
  }));

  const revenueChartData = generators.map((gen, i) => ({
    name: gen.name.replace('Generator ', 'Gen '),
    value: parseFloat(calculateGeneratorTotalBill(gen).toFixed(2)),
    color: COLORS[i],
  }));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>System Overview</h1>
        <p className={styles.pageSub}>All generators — March 2026</p>
      </div>

      <div className={styles.kpiGrid}>
        <StatCard
          icon={<Users size={20} color="#60a5fa" />}
          label="Total Clients"
          value={totalCustomers.toString()}
          sub="Across all generators"
          cardClass={styles.statCardBlue}
        />
        <StatCard
          icon={<Zap size={20} color="#facc15" />}
          label="Total Load"
          value={`${totalLoad.toFixed(1)} A`}
          sub="Current draw"
          cardClass={styles.statCardYellow}
        />
        <StatCard
          icon={<DollarSign size={20} color="#34d399" />}
          label="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          sub="This month"
          cardClass={styles.statCardEmerald}
        />
        <StatCard
          icon={<AlertTriangle size={20} color="#f87171" />}
          label="Alerts"
          value={`${overdueCount + unpaidCount}`}
          sub={`${overdueCount} overdue · ${unpaidCount} unpaid`}
          cardClass={styles.statCardRed}
        />
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <Activity size={16} color="#facc15" />
            <h2 className={styles.chartTitle}>Load per Generator (A)</h2>
          </div>
          <SimpleBarChart
            data={loadChartData}
            height={200}
            unit=" A"
            formatValue={(v) => `${v} A`}
          />
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <TrendingUp size={16} color="#34d399" />
            <h2 className={styles.chartTitle}>
              Monthly Revenue per Generator ($)
            </h2>
          </div>
          <SimpleBarChart
            data={revenueChartData}
            height={200}
            formatValue={(v) => `$${v.toFixed(2)}`}
          />
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <h2 className={styles.tableCardTitle}>Generator Summary</h2>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Generator</th>
                <th className={styles.th}>Location</th>
                <th className={styles.th}>Capacity</th>
                <th className={styles.th}>Status</th>
                <th className={`${styles.th} ${styles.thRight}`}>Clients</th>
                <th className={`${styles.th} ${styles.thRight}`}>Total Load</th>
                <th className={`${styles.th} ${styles.thRight}`}>
                  Monthly Bill
                </th>
                <th className={`${styles.th} ${styles.thCenter}`}>Action</th>
              </tr>
            </thead>

            <tbody>
              {generators.map((gen, i) => {
                const load = calculateGeneratorTotalLoad(gen);
                const bill = calculateGeneratorTotalBill(gen);
                const statusStyle = getGeneratorStatusStyle(gen.status);

                return (
                  <tr key={gen.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.genNameCell}>
                        <div
                          className={styles.genBadge}
                          style={{ backgroundColor: COLORS[i] }}
                        >
                          {gen.name.split(' ')[1][0]}
                        </div>
                        <span className={styles.genNameText}>{gen.name}</span>
                      </div>
                    </td>

                    <td className={`${styles.td} ${styles.tdGray}`}>
                      {gen.location}
                    </td>

                    <td className={`${styles.td} ${styles.tdGray}`}>
                      {gen.capacity} kVA
                    </td>

                    <td className={styles.td}>
                      <span className={styles.statusBadge} style={statusStyle}>
                        <span className={styles.statusDot} />
                        {gen.status}
                      </span>
                    </td>

                    <td
                      className={`${styles.td} ${styles.tdRight} ${styles.tdWhite}`}
                    >
                      {gen.customers.length}
                    </td>

                    <td
                      className={`${styles.td} ${styles.tdRight} ${styles.tdYellow}`}
                    >
                      {load.toFixed(1)} A
                    </td>

                    <td
                      className={`${styles.td} ${styles.tdRight} ${styles.tdEmerald}`}
                    >
                      ${bill.toFixed(2)}
                    </td>

                    <td className={`${styles.td} ${styles.tdCenter}`}>
                      <Link to={`/generators/${gen.id}`}>
                        <button className={styles.actionBtn}>
                          View Clients
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  cardClass: string;
}

function StatCard({ icon, label, value, sub, cardClass }: StatCardProps) {
  return (
    <div className={`${styles.statCard} ${cardClass}`}>
      <div className={styles.statIconWrap}>{icon}</div>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statSub}>{sub}</p>
    </div>
  );
}
