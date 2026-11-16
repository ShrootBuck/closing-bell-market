import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/anton/400.css';
import 'katex/dist/katex.min.css';
import './styles.css';
import Landing from './pages/Landing';
import Host from './pages/Host';
import Play from './pages/Play';

function App() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const f = () => setPath(location.pathname);
    window.addEventListener('popstate', f);
    return () => window.removeEventListener('popstate', f);
  }, []);
  const go = (p: string) => {
    history.pushState(null, '', p);
    setPath(p);
  };
  let m: RegExpMatchArray | null;
  if ((m = path.match(/^\/host\/(\d{5})/))) return <Host key={m[1]} code={m[1]} />;
  if ((m = path.match(/^\/watch\/(\d{5})/))) return <Host key={m[1]} code={m[1]} viewer />;
  if ((m = path.match(/^\/(?:play|j)\/(\d{5})/))) return <Play key={m[1]} code={m[1]} />;
  return <Landing go={go} />;
}

// If a lazily loaded chunk fails mid-deploy, reload once to pick up the new build.
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('cb:reloaded')) {
    sessionStorage.setItem('cb:reloaded', '1');
    location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
