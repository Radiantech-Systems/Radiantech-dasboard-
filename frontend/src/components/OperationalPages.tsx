import { displayRole } from "../auth/displayRole";
import { Link } from "react-router-dom";
import type { AuthResponse } from "../api/client";

export function OperationalHome({ identity }: { identity: AuthResponse }) {
  const can = (permission: string) =>
    identity.role === "IT" ||
    (identity.permissions ?? []).includes(permission);

  return (
    <div className="drishti-home">
      <div className="drishti-home-heading">
        <div>
          <p className="drishti-eyebrow">Authenticated session</p>
          <h1>Welcome, {identity.username}</h1>
          <p>Access your operational workspace.</p>
        </div>
        <span className="drishti-status">Active session</span>
      </div>

      <div className="drishti-home-options">
        {can("live_cctv") && (
          <Link to="/live-cctv">
            <section className="drishti-card">
              <strong>Camera</strong>
              <small>Browse cameras and live views</small>
            </section>
          </Link>
        )}

        {can("violations") && (
          <Link to="/ai-snapshots">
            <section className="drishti-card">
              <strong>Events</strong>
              <small>Review violations and snapshots</small>
            </section>
          </Link>
        )}

        {can("sliced_footage") && (
          <Link to="/sliced-footage">
            <section className="drishti-card">
              <strong>Footage</strong>
              <small>View available recordings</small>
            </section>
          </Link>
        )}
      </div>
    </div>
  );
}

export function OperationalProfile({ identity }: { identity: AuthResponse }) {
  return (
    <section className="drishti-card drishti-profile">
      <p className="drishti-eyebrow">User details</p>
      <h1>Profile</h1>
      <dl>
        <div>
          <dt>Username</dt>
          <dd>{identity.username}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{displayRole(identity)}</dd>
        </div>
      </dl>
    </section>
  );
}
