import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { getMyRegionTeam, type TeamMember } from '../../api/employee/employee.api';
import settingsStyles from '../SettingsView/SettingsView.module.css';
import styles from './TeamView.module.css';

function apiErr(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'An error occurred.';
}

function initials(member: TeamMember): string {
  return `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();
}

export function TeamView() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyRegionTeam()
      .then((data) => { if (!cancelled) setTeam(data); })
      .catch((e: unknown) => { if (!cancelled) setErr(apiErr(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={settingsStyles.page}>
      <div className={settingsStyles.pageHeader}>
        <h1 className={settingsStyles.pageTitle}>Our Team</h1>
        <p className={settingsStyles.pageSubtitle}>The staff serving your area</p>
      </div>

      <div className={settingsStyles.content}>
        <section className={settingsStyles.section}>
          {loading && <p className={settingsStyles.manageEmpty}>Loading…</p>}
          {err && <p className={settingsStyles.manageErr}>{err}</p>}
          {!loading && !err && team.length === 0 && (
            <p className={settingsStyles.manageEmpty}>No team information has been published yet.</p>
          )}

          <div className={styles.grid}>
            {team.map((member) => (
              <div key={member.id} className={styles.card}>
                {member.profilePictureUrl ? (
                  <img src={member.profilePictureUrl} alt="" className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatar}>{initials(member)}</div>
                )}
                <div>
                  <p className={styles.name}>{member.firstName} {member.lastName}</p>
                  <p className={styles.role}>{member.role}</p>
                  {member.phoneNumber && (
                    <p className={styles.phone}><Phone size={12} style={{ verticalAlign: '-1px', marginRight: '4px' }} />{member.phoneNumber}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
