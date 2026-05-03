import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Users,
  Zap,
  DollarSign,
  AlertTriangle,
  MapPin,
  Download,
} from 'lucide-react';
import { getGeneratorStatusStyle } from '../../app/data/mockData';
import { useGetGenerators } from '../../hooks/useGetGenerators';
import styles from './GeneratorView.module.css';

export function GeneratorView() {
  const { id } = useParams<{ id: string }>();
  const { data: generators, loading, error } = useGetGenerators();

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
        }}
      >
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f87171',
        }}
      >
        {error}
      </div>
    );
  }

  const generator = generators.find((g) => g.id === id);

  if (!generator) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
        }}
      >
        Generator not found.
      </div>
    );
  }

  const loadCapacityA = (generator.kvaCapacity * 0.8 * 1000) / 220;
  const loadPercent = Math.min(100, (generator.totalLoad / loadCapacityA) * 100);

  const loadBarClass =
    loadPercent > 80
      ? styles.loadBarRed
      : loadPercent > 60
        ? styles.loadBarAmber
        : styles.loadBarGreen;

  const paidCount =
    generator.totalClients - generator.overdueCount - generator.unpaidCount;
  const genStatusStyle = getGeneratorStatusStyle(
    generator.status as 'running' | 'maintenance' | 'offline',
  );

  return (
    <div className={styles.page}>
      <div className={styles.genHeader}>
        <div className={styles.genHeaderTop}>
          <div>
            <div className={styles.genTitleRow}>
              <h1 className={styles.genTitle}>{generator.name}</h1>
              <span className={styles.statusBadge} style={genStatusStyle}>
                <span className={styles.statusDot} />
                {generator.status}
              </span>
            </div>

            <div className={styles.genMeta}>
              <span className={styles.genMetaItem}>
                <MapPin size={14} /> {generator.location}
              </span>
              <span className={styles.genMetaItem}>
                <Zap size={14} /> {generator.kvaCapacity} kVA capacity
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
              {loadPercent.toFixed(1)}% ({generator.totalLoad.toFixed(1)} A /{' '}
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
            value={generator.totalClients.toString()}
            cardClass={styles.miniStatBlue}
          />
          <MiniStat
            icon={<Zap size={16} color="#facc15" />}
            label="Total Load"
            value={`${generator.totalLoad.toFixed(1)} A`}
            cardClass={styles.miniStatYellow}
          />
          <MiniStat
            icon={<DollarSign size={16} color="#34d399" />}
            label="Monthly Revenue"
            value={`$${generator.totalRevenue.toFixed(2)}`}
            cardClass={styles.miniStatEmerald}
          />
          <MiniStat
            icon={<AlertTriangle size={16} color="#f87171" />}
            label="Payment Alerts"
            value={`${generator.overdueCount + generator.unpaidCount}`}
            sub={`${generator.overdueCount} overdue · ${generator.unpaidCount} unpaid`}
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
            <p className={`${styles.pillCount} ${styles.pillCountUnpaid}`}>
              {generator.unpaidCount}
            </p>
          </div>

          <div className={`${styles.statusPill} ${styles.pillOverdue}`}>
            <p className={`${styles.pillLabel} ${styles.pillLabelOverdue}`}>Overdue</p>
            <p className={`${styles.pillCount} ${styles.pillCountOverdue}`}>
              {generator.overdueCount}
            </p>
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
