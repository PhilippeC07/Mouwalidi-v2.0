import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { RegionsProvider } from '../context/RegionsContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ReceiptTemplateProvider } from '../context/ReceiptTemplateContext';
import { useAuth } from '../context/AuthContext';
import styles from './app.module.scss';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (user.role === 'CUSTOMER') {
    const ownRoute = `/customers/${user.customerId}`;
    const allowedRoutes = [ownRoute, '/team'];
    if (!allowedRoutes.includes(location.pathname)) return <Navigate to={ownRoute} replace />;
  }

  const isLockedAdmin = user.role === 'ADMIN' && !['active', 'trialing'].includes(user.subscriptionStatus ?? '');
  if (isLockedAdmin && location.pathname !== '/billing-locked') {
    return <Navigate to="/billing-locked" replace />;
  }

  const body = (
    <div className={styles.root}>
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`${styles.sidebarWrapper} ${sidebarOpen ? styles.sidebarWrapperOpen : ''}`}
      >
        <Sidebar onCloseSidebar={() => setSidebarOpen(false)} />
      </div>

      <div className={styles.mainContent}>
        <div className={styles.mobileTopbar}>
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <span className={styles.mobileTitle}>Mouwalidi</span>
        </div>

        <div className={styles.pageContent}>
          <Outlet />
        </div>
      </div>
    </div>
  );

  return (
    <ThemeProvider>
    <ReceiptTemplateProvider>
      {(user.role === 'CUSTOMER' || isLockedAdmin) ? body : <RegionsProvider>{body}</RegionsProvider>}
    </ReceiptTemplateProvider>
    </ThemeProvider>
  );
}
