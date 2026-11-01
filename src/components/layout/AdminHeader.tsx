import { useState } from "react";
import logo from "@/assets/logo-hri.png";
import { COMPANY_NAME } from "@/config/text";
import { useAuth } from "@/context/AuthContext";
import { Button, Modal } from "@/components/ui";
import { ErrorNotice } from "@/components/ui/DataFeedback";
import { formatDayLong } from "@/utils/date";

export function AdminHeader() {
  const { logout, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const leave = async () => {
    setBusy(true);
    setError("");
    try {
      await logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout gagal.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <header className="admin-header">
        <div className="admin-header__brand">
          <img src={logo} alt="Logo HRI" className="admin-header__logo" />
          <strong>{COMPANY_NAME}</strong>
          <span className="admin-header__sub">Admin · Absensi</span>
        </div>
        <div className="admin-header__meta">
          <span>{formatDayLong()}</span>
          <span>{user?.fullname}</span>
          <button
            type="button"
            className="admin-header__logout"
            disabled={busy}
            onClick={() => {
              setError("");
              setConfirmOpen(true);
            }}
          >
            {busy ? "Keluar…" : "Keluar"}
          </button>
        </div>
      </header>
      {confirmOpen && (
        <Modal
          title="Keluar dari akun?"
          footer={
            <>
              <Button disabled={busy} onClick={() => setConfirmOpen(false)}>
                Batal
              </Button>
              <Button
                variant="primary"
                loading={busy}
                onClick={() => void leave()}
              >
                Ya, keluar
              </Button>
            </>
          }
        >
          <div className="logout-confirm">
            <div className="logout-confirm__icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </div>
            <p>
              Sesi admin Anda akan diakhiri. Anda dapat masuk kembali untuk
              melanjutkan pengelolaan absensi.
            </p>
          </div>
          <ErrorNotice message={error || null} />
        </Modal>
      )}
    </>
  );
}
