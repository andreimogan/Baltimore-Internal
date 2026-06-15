import NavLeft from './NavLeft'
import NavCenter from './NavCenter'
import NavRight from './NavRight'

export default function TopNav() {
  return (
    <nav
      className="fixed top-4 left-4 right-4 z-50 p-2 flex items-center gap-4 border"
      style={{
        borderRadius: '8px',
        background: 'var(--ui-nav-bg)',
        color: 'var(--ui-nav-fg)',
        backdropFilter: 'blur(8px)',
        borderColor: 'var(--ui-nav-border)',
        boxShadow: 'var(--ui-shadow)',
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <NavLeft />
      <NavRight />
    </nav>
  )
}
