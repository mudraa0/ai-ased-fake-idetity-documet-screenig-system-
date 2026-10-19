import { NavLink } from 'react-router-dom';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <svg className="sidebar-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <div>
          <div className="sidebar-agency">NATIONAL BORDER</div>
          <div className="sidebar-sub">SCREENING SYSTEM</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span>🔍</span> Scan Document
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span>📊</span> Dashboard
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span>📋</span> Scan History
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span>📈</span> Analytics
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div>STATUS: OPERATIONAL</div>
        <div>TERMINAL: TERMINAL-3</div>
        <div>NODE: SEC-HQ-04</div>
      </div>
    </aside>
  );
}

export default Sidebar;
