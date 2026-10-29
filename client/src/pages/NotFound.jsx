import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <main className="center-state">
      <p className="eyebrow">404 · DEAD END</p>
      <h1>No case file here.</h1>
      <p>This page is not part of the investigation.</p>
      <Link className="button button-primary" to="/">
        Back to home
      </Link>
    </main>
  );
}
