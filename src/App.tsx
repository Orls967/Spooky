import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { Layout } from '@/ui/Layout';
import { ThemeController } from '@/ui/ThemeController';

const Home = lazy(() => import('@/pages/Home'));
const BlochStudio = lazy(() => import('@/pages/BlochStudio'));
const SpookyAction = lazy(() => import('@/pages/SpookyAction'));
const Composer = lazy(() => import('@/pages/Composer'));
const Algorithms = lazy(() => import('@/pages/Algorithms'));
const AlgorithmDetail = lazy(() => import('@/pages/AlgorithmDetail'));
const Puzzles = lazy(() => import('@/pages/Puzzles'));
const PuzzleBoard = lazy(() => import('@/pages/PuzzleBoard'));
const Glossary = lazy(() => import('@/pages/Glossary'));
const About = lazy(() => import('@/pages/About'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export function App() {
  return (
    <HashRouter>
      <ThemeController />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="bloch" element={<BlochStudio />} />
          <Route path="spooky" element={<SpookyAction />} />
          <Route path="composer" element={<Composer />} />
          <Route path="algorithms" element={<Algorithms />} />
          <Route path="algorithms/:id" element={<AlgorithmDetail />} />
          <Route path="puzzles" element={<Puzzles />} />
          <Route path="puzzles/:id" element={<PuzzleBoard />} />
          <Route path="glossary" element={<Glossary />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
