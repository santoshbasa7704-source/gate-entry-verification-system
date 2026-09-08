import React from "react";

function Sidebar({
  currentPage,
  setCurrentPage,
  startNewVisitor,
}) {
  return (
    <aside className="sidebar">

      <h2 className="sidebar-title">
        Menu
      </h2>

      {/* =========================
          GATE ENTRY
      ========================= */}
      <button
        className={`sidebar-item ${
          currentPage === "gate" ? "active" : ""
        }`}
        onClick={startNewVisitor}
      >
        Gate Entry
      </button>


      {/* =========================
          VERIFICATION
      ========================= */}
      <button
        className={`sidebar-item ${
          currentPage === "verification"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setCurrentPage("verification")
        }
      >
        Verification
      </button>


      {/* =========================
          HISTORY
      ========================= */}
      <button
        className={`sidebar-item ${
          currentPage === "history"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setCurrentPage("history")
        }
      >
        History
      </button>

    </aside>
  );
}

export default Sidebar;