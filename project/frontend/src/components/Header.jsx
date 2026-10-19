function Header({ title = 'National Document Verification System' }) {
  return (
    <header className="top-header">
      <div className="header-title-group">
        <svg className="header-shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <h1 className="header-title">{title}</h1>
      </div>
      <div className="header-checkpoint">
        Checkpoint: Terminal 3 | Station #04
      </div>
    </header>
  );
}

export default Header;
