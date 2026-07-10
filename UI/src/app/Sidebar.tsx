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
  CreditCard,
  BookOpen,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useRegions } from '../hooks/useGetRegions';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onCloseSidebar?: () => void;
}

export function Sidebar({ onCloseSidebar }: SidebarProps) {
  const { data: regions, loading, error } = useRegions();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();

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

  if (user?.role === 'CUSTOMER') {
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

        <div className={styles.bottom} style={{ marginTop: 'auto', borderTop: 'none' }}>
          <div className={styles.userRow}>
            <span className={styles.userEmail} title={user.email}>{user.name || user.email}</span>
            <button className={styles.logoutBtn} onClick={logout} title="Log out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      <div className={styles.topSection}>
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
      </div>

      <nav className={styles.nav}>
        <div className={styles.regionList}>
          <p className={styles.sectionLabel}>
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
                  <div className={styles.regionHeader}>
                    <NavLink
                      to={`/region/${region.id}`}
                      className={({ isActive }) =>
                        `${styles.regionHeaderLeft} ${isActive ? styles.regionHeaderLeftActive : ''}`
                      }
                      onClick={handleNavigate}
                    >
                      <MapPin size={13} className={styles.regionIcon} />
                      <span className={styles.regionName}>{region.label}</span>
                    </NavLink>

                    <button
                      type="button"
                      className={styles.regionChevronBtn}
                      onClick={() => toggleRegion(region.id)}
                      aria-expanded={!isRegionCollapsed}
                      aria-label={isRegionCollapsed ? 'Expand region' : 'Collapse region'}
                    >
                      <ChevronDown
                        size={13}
                        className={`${styles.regionChevron} ${
                          isRegionCollapsed ? styles.regionChevronCollapsed : ''
                        }`}
                      />
                    </button>
                  </div>

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

      {/* ── Accounting ── */}
      <div className={styles.accountingSection}>
        <p className={styles.sectionLabel}>Accounting</p>

        <NavLink
          to="/accounting/summary"
          className={({ isActive }) => `${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`}
          onClick={handleNavigate}
        >
          <BarChart3 size={15} />
          <span>Summary</span>
        </NavLink>

        <NavLink
          to="/accounting/receivables"
          className={({ isActive }) => `${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`}
          onClick={handleNavigate}
        >
          <BookOpen size={15} />
          <span>Receivables</span>
        </NavLink>

        <NavLink
          to="/accounting/payments"
          className={({ isActive }) => `${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`}
          onClick={handleNavigate}
        >
          <CreditCard size={15} />
          <span>Payments</span>
        </NavLink>
      </div>

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

        <button className={styles.themeToggle} onClick={toggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>

        {user && (
          <div className={styles.userRow}>
            <span className={styles.userEmail} title={user.email}>{user.name || user.email}</span>
            <button className={styles.logoutBtn} onClick={logout} title="Log out">
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
