import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Zap,
  Activity,
  Settings,
  ChevronRight,
  BarChart3,
  MapPin,
  ChevronDown,
  FolderTree,
} from 'lucide-react';
import { useRegions } from '../hooks/useGetRegions';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onCloseSidebar?: () => void;
}

export function Sidebar({ onCloseSidebar }: SidebarProps) {
  const { data: regions, loading, error } = useRegions();

  const [collapsedRegions, setCollapsedRegions] = useState<Set<string>>(
    new Set(),
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const toggleRegion = (regionId: string) => {
    setCollapsedRegions((prev) => {
      const next = new Set(prev);

      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }

      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  };

  const handleNavigate = () => {
    onCloseSidebar?.();
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <Zap size={18} color="#030712" />
        </div>
        <div>
          <p className={styles.logoName}>Mouwalidi</p>
          <p className={styles.logoSub}>Power Management</p>
        </div>
      </div>

      <nav className={styles.nav}>
        <p className={styles.sectionLabel}>Navigation</p>

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`
          }
          onClick={handleNavigate}
        >
          <BarChart3 size={16} />
          <span>Overview</span>
        </NavLink>

        <div className={styles.regionList}>
          <p className={styles.sectionLabel} style={{ marginTop: 12 }}>
            Generators
          </p>

          {loading && (
            <div className={styles.loadingBlock}>
              <p className={styles.loadingText}>Loading regions...</p>
            </div>
          )}

          {error && (
            <div className={styles.errorBlock}>
              <p className={styles.errorText}>{error}</p>
            </div>
          )}

          {!loading &&
            !error &&
            regions.map((region) => {
              const isRegionCollapsed = collapsedRegions.has(region.id);

              return (
                <div key={region.id} className={styles.regionGroup}>
                  {/* Region */}
                  <button
                    type="button"
                    className={styles.regionHeader}
                    onClick={() => toggleRegion(region.id)}
                    aria-expanded={!isRegionCollapsed}
                  >
                    <div className={styles.regionHeaderLeft}>
                      <MapPin size={13} className={styles.regionIcon} />
                      <span className={styles.regionName}>{region.label}</span>
                    </div>

                    <ChevronDown
                      size={13}
                      className={`${styles.regionChevron} ${
                        isRegionCollapsed ? styles.regionChevronCollapsed : ''
                      }`}
                    />
                  </button>

                  {!isRegionCollapsed && (
                    <div className={styles.groupList}>
                      {region.groups.map((group) => {
                        const isGroupCollapsed = collapsedGroups.has(group.id);

                        return (
                          <div key={group.id} className={styles.groupItem}>
                            {/* Generator Group */}
                            <div className={styles.groupHeader}>
                              <NavLink
                                to={`/generator-groups/${group.id}`}
                                className={({ isActive }) =>
                                  `${styles.groupNavLink} ${isActive ? styles.groupNavLinkActive : ''}`
                                }
                                onClick={handleNavigate}
                              >
                                <FolderTree
                                  size={13}
                                  className={styles.groupIcon}
                                />
                                <span className={styles.groupName}>
                                  {group.label}
                                </span>
                              </NavLink>

                              <button
                                type="button"
                                className={styles.groupCollapseBtn}
                                onClick={() => toggleGroup(group.id)}
                                aria-expanded={!isGroupCollapsed}
                              >
                                <ChevronDown
                                  size={13}
                                  className={`${styles.groupChevron} ${
                                    isGroupCollapsed
                                      ? styles.groupChevronCollapsed
                                      : ''
                                  }`}
                                />
                              </button>
                            </div>

                            {!isGroupCollapsed && (
                              <div className={styles.genList}>
                                {group.items.map((generator) => (
                                  <NavLink
                                    key={generator.id}
                                    to={`/generators/${generator.id}`}
                                    className={({ isActive }) =>
                                      `${styles.genBtn} ${
                                        isActive ? styles.genBtnActive : ''
                                      }`
                                    }
                                    onClick={handleNavigate}
                                  >
                                    {({ isActive }) => (
                                      <>
                                        <Activity
                                          size={14}
                                          className={styles.genIcon}
                                        />

                                        <div className={styles.genInfo}>
                                          <p className={styles.genName}>
                                            {generator.label}
                                          </p>
                                        </div>

                                        <div className={styles.genRight}>
                                          <ChevronRight
                                            size={11}
                                            className={`${styles.chevron} ${
                                              isActive
                                                ? styles.chevronActive
                                                : ''
                                            }`}
                                          />
                                        </div>
                                      </>
                                    )}
                                  </NavLink>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </nav>

      <div className={styles.bottom}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `${styles.settingsBtn} ${isActive ? styles.navBtnActive : ''}`
          }
          onClick={handleNavigate}
        >
          <Settings size={16} />
          <span>Settings</span>
        </NavLink>

        <div className={styles.periodCard}>
          <p className={styles.periodLabel}>Billing Period</p>
          <p className={styles.periodValue}>March 2026</p>
        </div>
      </div>
    </div>
  );
}
