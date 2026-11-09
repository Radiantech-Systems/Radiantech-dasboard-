import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import BrandLockup from "./BrandLockup";

export default function WorkspaceHeader({
  username,
  role,
  onLogout,
}: {
  username?: string;
  role: string;
  onLogout: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <header className="drishti-workspace-header">
      <Link
        className="drishti-header-home"
        to={role === "User" ? "/operational" : "/"}
      >
        <BrandLockup />
      </Link>

      <div className="drishti-user-menu" ref={menuRef}>
        <button
          type="button"
          className="drishti-user-trigger"
          aria-label={`Account menu for ${username || role}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="drishti-user-avatar">
            {(username || role || "U").slice(0, 1).toUpperCase()}
          </span>

          <span>{username || role || "Account"}</span>
          <span aria-hidden="true">⌄</span>
        </button>

        {open && (
          <div className="drishti-menu-list" role="menu">
            {role === "User" && (
              <Link
                role="menuitem"
                to="/operational/profile"
                onClick={() => setOpen(false)}
              >
                Profile
              </Link>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void onLogout();
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
