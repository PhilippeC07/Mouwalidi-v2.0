import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout.tsx';
import { Overview } from '../pages/Overview/Overview.tsx';
import { GeneratorView } from '../pages/GeneratorView/GeneratorView.tsx';
import { GeneratorGroupView } from '../pages/GeneratorGroupView/GeneratorGroupView.tsx';
import { RegionView } from '../pages/RegionView/RegionView.tsx';
import { GroupManagementView } from '../pages/GroupManagementView/GroupManagementView.tsx';
import { SettingsView } from '../pages/SettingsView/SettingsView.tsx';
import { CustomerDetailView } from '../pages/CustomerDetailView/CustomerDetailView.tsx';
import { AccountingSummary } from '../pages/AccountingView/AccountingSummary.tsx';
import { AccountingReceivables } from '../pages/AccountingView/AccountingReceivables.tsx';
import { AccountingPayments } from '../pages/AccountingView/AccountingPayments.tsx';
import { LoginView } from '../pages/LoginView/LoginView.tsx';
import { BillingLockedView } from '../pages/BillingLockedView/BillingLockedView.tsx';
import { AuthProvider } from '../context/AuthContext.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="generators/:id" element={<GeneratorView />} />
            <Route path="region/:regionId" element={<RegionView />} />
            <Route path="generator-groups/:groupId" element={<GeneratorGroupView />} />
            <Route path="generator-groups/:groupId/manage" element={<GroupManagementView />} />
            <Route path="settings" element={<SettingsView />} />
            <Route path="customers/:customerId" element={<CustomerDetailView />} />
            <Route path="billing-locked" element={<BillingLockedView />} />
            <Route path="accounting/summary" element={<AccountingSummary />} />
            <Route path="accounting/receivables" element={<AccountingReceivables />} />
            <Route path="accounting/payments" element={<AccountingPayments />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
