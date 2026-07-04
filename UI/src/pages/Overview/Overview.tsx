import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Zap,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { getGroupSummaries, type GroupOverviewDto } from '../../api/generator/generator.api';
import { SimpleBarChart } from '../../app/components/SimpleBarChart';
import styles from './Overview.module.css';

const COLORS = ['#facc15', '#38bdf8', '#a78bfa', '#fb923c', '#34d399', '#f472b6'];

export function Overview() {
  const [groups, setGroups] = useState<GroupOverviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGroupSummaries()
      .then(setGroups)
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const totalCustomers = groups.reduce((s, g) => s + g.totalClients, 0);
  const totalLoad = groups.reduce((s, g) => s + g.totalLoad, 0);
  const totalRevenue = groups.reduce((s, g) => s + g.totalRevenue, 0);
  const overdueCount = groups.reduce((s, g) => s + g.overdueCount, 0);
  const unpaidCount = groups.reduce((s, g) => s + g.unpaidCount, 0);

  const loadChartData = groups.map((g, i) => ({
    name: g.name,
    value: parseFloat(g.totalLoad.toFixed(1)),
    color: COLORS[i % COLORS.length],
  }));

  const revenueChartData = groups.map((g, i) => ({
    name: g.name,
    value: parseFloat(g.totalRevenue.toFixed(2)),
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>System Overview</h1>
        <p className={styles.pageSub}>All generator groups</p>
      </div>

      {loading && <p style={{ color: '#6b7280', padding: '24px' }}>Loading…</p>}
      {error && <p style={{ color: '#f87171', padding: '24px' }}>{error}</p>}

      {!loading && !error && (
        <>
          <div className={styles.kpiGrid}>
            <StatCard
              icon={<Users size={20} color="#60a5fa" />}
              label="Total Clients"
              value={totalCustomers.toString()}
              sub="Across all groups"
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
              sub="Total collected"
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
                <h2 className={styles.chartTitle}>Load per Group (A)</h2>
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
                <h2 className={styles.chartTitle}>Revenue per Group ($)</h2>
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
              <h2 className={styles.tableCardTitle}>Group Summary</h2>
            </div>

            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Group</th>
                    <th className={styles.th}>Region</th>
                    <th className={`${styles.th} ${styles.thRight}`}>Generators</th>
                    <th className={`${styles.th} ${styles.thRight}`}>Total kVA</th>
                    <th className={`${styles.th} ${styles.thRight}`}>Clients</th>
                    <th className={`${styles.th} ${styles.thRight}`}>Total Load</th>
                    <th className={`${styles.th} ${styles.thRight}`}>Revenue</th>
                    <th className={`${styles.th} ${styles.thCenter}`}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {groups.map((g, i) => (
                    <tr key={g.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.genNameCell}>
                          <div
                            className={styles.genBadge}
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          >
                            {g.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={styles.genNameText}>{g.name}</span>
                        </div>
                      </td>

                      <td className={`${styles.td} ${styles.tdGray}`}>{g.region}</td>

                      <td className={`${styles.td} ${styles.tdRight} ${styles.tdGray}`}>
                        {g.generatorCount}
                      </td>

                      <td className={`${styles.td} ${styles.tdRight} ${styles.tdGray}`}>
                        {g.totalKva} kVA
                      </td>

                      <td className={`${styles.td} ${styles.tdRight} ${styles.tdWhite}`}>
                        {g.totalClients}
                      </td>

                      <td className={`${styles.td} ${styles.tdRight} ${styles.tdYellow}`}>
                        {g.totalLoad.toFixed(1)} A
                      </td>

                      <td className={`${styles.td} ${styles.tdRight} ${styles.tdEmerald}`}>
                        ${g.totalRevenue.toFixed(2)}
                      </td>

                      <td className={`${styles.td} ${styles.tdCenter}`}>
                        <Link to={`/generator-groups/${g.id}`}>
                          <button className={styles.actionBtn}>View</button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
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
