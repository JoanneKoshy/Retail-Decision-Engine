import { useEffect, useState } from 'react'
import Home from './pages/Home.jsx'
import Price from './pages/Price.jsx'
import Promotion from './pages/Promotion.jsx'
import Markdown from './pages/Markdown.jsx'
import Bundles from './pages/Bundles.jsx'
import Assumptions from './pages/Assumptions.jsx'

export const PAGES = [
  { id: 'home', label: 'Overview', icon: '◧', Component: Home },
  { id: 'price', label: 'Regular price', icon: '◈', Component: Price, module: 'Module 2' },
  { id: 'promotion', label: 'Promotions', icon: '◉', Component: Promotion, module: 'Module 3' },
  { id: 'markdown', label: 'Markdowns', icon: '◐', Component: Markdown, module: 'Module 4' },
  { id: 'bundles', label: 'Bundles', icon: '◇', Component: Bundles, module: 'Module 5' },
  { id: 'assumptions', label: 'Assumptions', icon: '≡', Component: Assumptions },
]

const current = () => {
  const h = window.location.hash.replace('#/', '').replace('#', '')
  return PAGES.some((p) => p.id === h) ? h : 'home'
}

export function go(id) {
  window.location.hash = `#/${id}`
}

export default function App() {
  const [page, setPage] = useState(current)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const on = () => { setPage(current()); setMenuOpen(false); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const { Component } = PAGES.find((p) => p.id === page)

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <div className="brand-name">Retail Decision Engine</div>
            <div className="brand-sub">Price · Promotion · Markdown · Bundles</div>
          </div>
        </div>
        <nav>
          {PAGES.map((p) => (
            <a key={p.id} href={`#/${p.id}`} className={page === p.id ? 'active' : ''}>
              <span className="nav-icon">{p.icon}</span>
              <span className="nav-label">{p.label}</span>
              {p.module && <span className="nav-module">{p.module.replace('Module ', 'M')}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          Data: Walmart M5 (2011–2016), Retail Markdown (synthetic), Instacart. Every figure comes from the module notebooks' output tables.
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">☰</button>
          <span className="topbar-title">{PAGES.find((p) => p.id === page).label}</span>
        </div>
        <main className="content">
          <Component />
        </main>
      </div>
    </div>
  )
}
