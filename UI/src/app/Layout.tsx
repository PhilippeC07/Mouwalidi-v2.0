import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { RegionsProvider } from '../context/RegionsContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ReceiptTemplateProvider } from '../context/ReceiptTemplateContext';
import styles from './app.module.scss';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
    <ReceiptTemplateProvider>
    <RegionsProvider>
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
    </RegionsProvider>
    </ReceiptTemplateProvider>
    </ThemeProvider>
  );
}
