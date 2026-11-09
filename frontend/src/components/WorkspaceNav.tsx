import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { visibleNavigation } from "../config/navigation";

export default function WorkspaceNav({
  role,
  permissions,
}: {
  role: string;
  permissions: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const items = visibleNavigation(role, permissions);

  return (
    <div className="drishti-nav-shell drishti-nav-operational">
      <button
        className="drishti-nav-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="drishti-primary-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">☰</span> Menu
      </button>

      <nav
        id="drishti-primary-navigation"
        className={`drishti-nav ${open ? "is-open" : ""}`}
        aria-label={`${role} navigation`}
      >
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/" || item.path === "/operational"}
            className={({ isActive }) =>
              `drishti-nav-link ${
                isActive ||
                (item.path === "/live-cctv" &&
                  location.pathname.startsWith("/live/"))
                  ? "is-active"
                  : ""
              }`
            }
            onClick={() => setOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
