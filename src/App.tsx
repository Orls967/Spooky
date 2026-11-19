import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { Layout } from '@/ui/Layout';
import { ThemeController } from '@/ui/ThemeController';

const Home = lazy(() => import('@/pages/Home'));
const ModuleStub = lazy(() => import('@/pages/ModuleStub'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export function App() {
  return (
    <HashRouter>
      <ThemeController />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="bloch" element={<ModuleStub module="bloch" />} />
          <Route path="spooky" element={<ModuleStub module="spooky" />} />
          <Route path="composer" element={<ModuleStub module="composer" />} />
          <Route path="algorithms/*" element={<ModuleStub module="algorithms" />} />
          <Route path="puzzles/*" element={<ModuleStub module="puzzles" />} />
          <Route path="glossary" element={<ModuleStub module="glossary" />} />
          <Route path="about" element={<ModuleStub module="about" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
