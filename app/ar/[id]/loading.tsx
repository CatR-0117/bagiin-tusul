export default function ArLoading() {
  return (
    <div className="ar-standalone">
      <header>
        <span className="ar-standalone-brand">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          SnapAR
        </span>
        <span className="ar-standalone-format">AR</span>
      </header>
      <div className="ar-standalone-state">
        <span className="ar-standalone-spinner" aria-hidden="true" />
        <h1>AR бэлтгэж байна</h1>
        <p>Загварын мэдээллийг ачаалж байна…</p>
      </div>
    </div>
  );
}
