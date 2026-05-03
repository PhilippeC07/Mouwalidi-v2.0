import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Users,
  Zap,
  DollarSign,
  AlertTriangle,
  FolderTree,
  Download,
} from 'lucide-react';
import { getGeneratorStatusStyle } from '../../app/data/mockData';
import { useGetGenerators } from '../../hooks/useGetGenerators';
import { useRegions } from '../../hooks/useGetRegions';
import styles from '../GeneratorView/GeneratorView.module.css';

export function GeneratorGroupView() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data: generators, loading: genLoading, error: genError } = useGetGenerators();
  const { data: regions, loading: regLoading, error: regError } = useRegions();

  const loading = genLoading || regLoading;
  const error = genError ?? regError;

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
        {error}
      </div>
    );
  }

  let groupLabel = '';
  let groupGeneratorIds: string[] = [];

  for (const region of regions) {
    const group = region.groups.find((g) => g.id === groupId);
    if (group) {
      groupLabel = group.label;
      groupGeneratorIds = group.items.map((item) => item.id);
      break;
    }
  }

  if (!groupLabel) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        Group not found.
      </div>
    );
  }

  const groupGenerators = generators.filter((g) => groupGeneratorIds.includes(g.id));

  if (groupGenerators.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        No generators in this group.
      </div>
    );
  }

  const totalClients = groupGenerators.reduce((sum, g) => sum + g.totalClients, 0);
  const totalLoad = groupGenerators.reduce((sum, g) => sum + g.totalLoad, 0);
  const totalRevenue = groupGenerators.reduce((sum, g) => sum + g.totalRevenue, 0);
  const overdueCount = groupGenerators.reduce((sum, g) => sum + g.overdueCount, 0);
  const unpaidCount = groupGenerators.reduce((sum, g) => sum + g.unpaidCount, 0);
  const totalKva = groupGenerators.reduce((sum, g) => sum + g.kvaCapacity, 0);

  const hasOffline = groupGenerators.some((g) => g.status === 'offline');
  const hasMaintenance = groupGenerators.some((g) => g.status === 'maintenance');
  const groupStatus: 'running' | 'maintenance' | 'offline' = hasOffline
    ? 'offline'
    : hasMaintenance
      ? 'maintenance'
      : 'running';

  const runningCount = groupGenerators.filter((g) => g.status === 'running').length;
  const statusLabel =
    groupStatus === 'running'
      ? `${runningCount}/${groupGenerators.length} Running`
      : groupStatus === 'offline'
        ? `${groupGenerators.filter((g) => g.status === 'offline').length} Offline`
        : `${groupGenerators.filter((g) => g.status === 'maintenance').length} Maintenance`;

  const loadCapacityA = (totalKva * 0.8 * 1000) / 220;
  const loadPercent = Math.min(100, (totalLoad / loadCapacityA) * 100);

  const loadBarClass =
    loadPercent > 80
      ? styles.loadBarRed
      : loadPercent > 60
        ? styles.loadBarAmber
        : styles.loadBarGreen;

  const paidCount = totalClients - overdueCount - unpaidCount;
  const genStatusStyle = getGeneratorStatusStyle(groupStatus);

  return (
    <div className={styles.page}>
      <div className={styles.genHeader}>
        <div className={styles.genHeaderTop}>
          <div>
            <div className={styles.genTitleRow}>
              <h1 className={styles.genTitle}>{groupLabel}</h1>
              <span className={styles.statusBadge} style={genStatusStyle}>
                <span className={styles.statusDot} />
                {statusLabel}
              </span>
            </div>

            <div className={styles.genMeta}>
              <span className={styles.genMetaItem}>
                <FolderTree size={14} /> {groupGenerators.length} generators
              </span>
              <span className={styles.genMetaItem}>
                <Zap size={14} /> {totalKva} kVA total capacity
              </span>
            </div>
          </div>

          <button className={styles.exportBtn}>
            <Download size={16} />
            Export Report
          </button>
        </div>

        <div className={styles.loadBarSection}>
          <div className={styles.loadBarLabels}>
            <span>Load utilization</span>
            <span>
              {loadPercent.toFixed(1)}% ({totalLoad.toFixed(1)} A /{' '}
              {loadCapacityA.toFixed(0)} A max)
            </span>
          </div>

          <div className={styles.loadBarTrack}>
            <div
              className={`${styles.loadBarFill} ${loadBarClass}`}
              style={{ width: `${loadPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.kpiGrid}>
          <MiniStat
            icon={<Users size={16} color="#60a5fa" />}
            label="Total Clients"
            value={totalClients.toString()}
            cardClass={styles.miniStatBlue}
          />
          <MiniStat
            icon={<Zap size={16} color="#facc15" />}
            label="Total Load"
            value={`${totalLoad.toFixed(1)} A`}
            cardClass={styles.miniStatYellow}
          />
          <MiniStat
            icon={<DollarSign size={16} color="#34d399" />}
            label="Monthly Revenue"
            value={`$${totalRevenue.toFixed(2)}`}
            cardClass={styles.miniStatEmerald}
          />
          <MiniStat
            icon={<AlertTriangle size={16} color="#f87171" />}
            label="Payment Alerts"
            value={`${overdueCount + unpaidCount}`}
            sub={`${overdueCount} overdue · ${unpaidCount} unpaid`}
            cardClass={styles.miniStatRed}
          />
        </div>

        <div className={styles.statusPillsRow}>
          <div className={`${styles.statusPill} ${styles.pillPaid}`}>
            <p className={`${styles.pillLabel} ${styles.pillLabelPaid}`}>Paid</p>
            <p className={`${styles.pillCount} ${styles.pillCountPaid}`}>{paidCount}</p>
          </div>

          <div className={`${styles.statusPill} ${styles.pillUnpaid}`}>
            <p className={`${styles.pillLabel} ${styles.pillLabelUnpaid}`}>Unpaid</p>
            <p className={`${styles.pillCount} ${styles.pillCountUnpaid}`}>{unpaidCount}</p>
          </div>

          <div className={`${styles.statusPill} ${styles.pillOverdue}`}>
            <p className={`${styles.pillLabel} ${styles.pillLabelOverdue}`}>Overdue</p>
            <p className={`${styles.pillCount} ${styles.pillCountOverdue}`}>{overdueCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  sub,
  cardClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  cardClass: string;
}) {
  return (
    <div className={`${styles.miniStat} ${cardClass}`}>
      <div className={styles.miniStatHead}>
        {icon}
        <p className={styles.miniStatLabel}>{label}</p>
      </div>
      <p className={styles.miniStatValue}>{value}</p>
      {sub && <p className={styles.miniStatSub}>{sub}</p>}
    </div>
  );
}
