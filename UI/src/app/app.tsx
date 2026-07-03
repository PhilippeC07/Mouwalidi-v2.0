import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout.tsx';
import { Overview } from '../pages/Overview/Overview.tsx';
import { GeneratorView } from '../pages/GeneratorView/GeneratorView.tsx';
import { GeneratorGroupView } from '../pages/GeneratorGroupView/GeneratorGroupView.tsx';
import { GroupManagementView } from '../pages/GroupManagementView/GroupManagementView.tsx';
import { SettingsView } from '../pages/SettingsView/SettingsView.tsx';
import { CustomerDetailView } from '../pages/CustomerDetailView/CustomerDetailView.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="generators/:id" element={<GeneratorView />} />
          <Route path="generator-groups/:groupId" element={<GeneratorGroupView />} />
          <Route path="generator-groups/:groupId/manage" element={<GroupManagementView />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="customers/:customerId" element={<CustomerDetailView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
