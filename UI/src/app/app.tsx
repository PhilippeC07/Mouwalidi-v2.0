import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout.tsx';
import { Overview } from '../pages/Overview/Overview.tsx';
import { GeneratorView } from '../pages/GeneratorView/GeneratorView.tsx';
import { GeneratorGroupView } from '../pages/GeneratorGroupView/GeneratorGroupView.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="generators/:id" element={<GeneratorView />} />
          <Route path="generator-groups/:groupId" element={<GeneratorGroupView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
