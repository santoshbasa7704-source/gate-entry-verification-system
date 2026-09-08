import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000";

function History({ setCurrentPage }) {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exitLoading, setExitLoading] = useState(null);

  // ============================================================
  // LOAD HISTORY
  // ============================================================

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/visitors`
      );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}`
        );
      }

      const data = await response.json();

      let list = [];

      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data.visitors)) {
        list = data.visitors;
      } else if (Array.isArray(data.data)) {
        list = data.data;
      }

      setVisitors(list);
    } catch (err) {
      console.error("HISTORY LOAD ERROR:", err);

      setError(
        "Unable to load visitor history. Make sure server.js is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // ============================================================
  // NORMALIZE STATUS
  // ============================================================

  const getStatus = (visitor) => {
    return String(
      visitor?.status ??
        visitor?.visitor_status ??
        visitor?.Status ??
        ""
    )
      .trim()
      .toUpperCase();
  };

  // ============================================================
  // NORMALIZE PHOTOS
  // ============================================================

  const getPhoto = (visitor) => {
    let photo = visitor?.photos ?? visitor?.photo;

    if (!photo) {
      return null;
    }

    if (Array.isArray(photo)) {
      return photo[0] || null;
    }

    if (typeof photo === "string") {
      try {
        const parsed = JSON.parse(photo);

        if (Array.isArray(parsed)) {
          return parsed[0] || null;
        }

        return parsed;
      } catch {
        return photo;
      }
    }

    return null;
  };

  const getPhotoUrl = (visitor) => {
    const photo = getPhoto(visitor);

    if (!photo) {
      return null;
    }

    if (
      typeof photo === "string" &&
      photo.startsWith("data:image")
    ) {
      return photo;
    }

    if (
      typeof photo === "string" &&
      photo.startsWith("http")
    ) {
      return photo;
    }

    if (
      typeof photo === "object" &&
      photo.url
    ) {
      return photo.url;
    }

    if (
      typeof photo === "object" &&
      photo.path
    ) {
      return `${API_BASE}/${String(
        photo.path
      ).replace(/^\/+/, "")}`;
    }

    return `${API_BASE}/uploads/${String(
      photo
    ).replace(/^\/+/, "")}`;
  };

  // ============================================================
  // DATE FORMAT
  // ============================================================

  const formatDateTime = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // ============================================================
  // MARK EXIT
  // ============================================================

  const handleExit = async (visitor) => {
    const visitorId = visitor?.id;

    if (!visitorId) {
      alert("Visitor ID is missing.");
      return;
    }

    const status = getStatus(visitor);

    if (status !== "APPROVED") {
      alert(
        `Visitor status is ${status || "UNKNOWN"}. Only APPROVED visitors can exit.`
      );
      return;
    }

    if (!visitor.entry_time) {
      alert(
        "Entry time is missing. Visitor cannot be marked as exited."
      );
      return;
    }

    if (visitor.exit_time) {
      alert("This visitor has already exited.");
      return;
    }

    const confirmed = window.confirm(
      `Mark visitor ${visitorId} as EXITED?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setExitLoading(visitorId);
      setError("");

      console.log(
        "MARK EXIT:",
        visitorId,
        "STATUS:",
        status,
        "ENTRY:",
        visitor.entry_time
      );

      const response = await fetch(
        `${API_BASE}/api/visitors/${visitorId}/exit`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error(
          "EXIT API returned non-JSON:",
          text
        );

        throw new Error(
          "Server returned an invalid response. Check server.js."
        );
      }

      console.log("EXIT RESPONSE:", data);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to record visitor exit."
        );
      }

      // --------------------------------------------------------
      // UPDATE THE ROW IMMEDIATELY
      // --------------------------------------------------------

      setVisitors((currentVisitors) =>
        currentVisitors.map((item) => {
          if (String(item.id) !== String(visitorId)) {
            return item;
          }

          return {
            ...item,
            ...(data.visitor || {}),
            status: "EXITED",
            exit_time:
              data.visitor?.exit_time ||
              new Date().toISOString(),
          };
        })
      );

      alert(
        "Visitor exit recorded successfully."
      );

      // Reload from database to make sure it is permanently saved
      await loadHistory();
    } catch (err) {
      console.error(
        "MARK EXIT ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to record visitor exit."
      );
    } finally {
      setExitLoading(null);
    }
  };

  // ============================================================
  // STATUS STYLE
  // ============================================================

  const getStatusStyle = (status) => {
    if (status === "APPROVED") {
      return {
        background: "#e8f7ee",
        color: "#16803c",
      };
    }

    if (status === "EXITED") {
      return {
        background: "#e9ecef",
        color: "#495057",
      };
    }

    if (status === "REJECTED") {
      return {
        background: "#fdecec",
        color: "#c62828",
      };
    }

    if (status === "PENDING") {
      return {
        background: "#fff4d6",
        color: "#9a6700",
      };
    }

    return {
      background: "#f1f3f5",
      color: "#495057",
    };
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "#17365d",
        }}
      >
        <h2>Visitor History</h2>
        <p>Loading visitor records...</p>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div
      style={{
        width: "100%",
        padding: "32px",
        color: "#17365d",
      }}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
          gap: "20px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              fontWeight: 700,
            }}
          >
            Visitor History
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "#6c757d",
              fontSize: "15px",
            }}
          >
            View previously registered visitors
            and their current status.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            onClick={loadHistory}
            style={{
              padding: "12px 20px",
              border: "1px solid #d4dce5",
              background: "#fff",
              borderRadius: "8px",
              fontWeight: 600,
              color: "#172b4d",
              cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>

          <button
            onClick={() => {
              if (setCurrentPage) {
                setCurrentPage("gate");
              }
            }}
            style={{
              padding: "12px 20px",
              border: "none",
              background: "#1769e0",
              color: "#fff",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + New Visitor
          </button>
        </div>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div
          style={{
            background: "#fff0f0",
            border: "1px solid #f3b5b5",
            color: "#c62828",
            padding: "14px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {/* ======================================================
          EMPTY HISTORY
      ====================================================== */}

      {visitors.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e0e6ed",
            borderRadius: "12px",
            padding: "70px 30px",
            textAlign: "center",
            boxShadow:
              "0 4px 18px rgba(20, 40, 70, 0.05)",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "15px",
            }}
          >
            📋
          </div>

          <h2
            style={{
              marginBottom: "8px",
            }}
          >
            No Visitor Records
          </h2>

          <p
            style={{
              color: "#6c757d",
              marginBottom: "25px",
            }}
          >
            There are no visitor records in the
            system yet.
          </p>

          <button
            onClick={() => {
              if (setCurrentPage) {
                setCurrentPage("gate");
              }
            }}
            style={{
              padding: "12px 22px",
              border: "none",
              borderRadius: "8px",
              background: "#1769e0",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Register New Visitor
          </button>
        </div>
      ) : (
        <>
          {/* ==================================================
              TABLE
          ================================================== */}

          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #e0e6ed",
              boxShadow:
                "0 4px 18px rgba(20, 40, 70, 0.05)",
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "1250px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f7f9fc",
                  }}
                >
                  {[
                    "Photo",
                    "Visitor ID",
                    "Name",
                    "Email",
                    "Phone",
                    "Person to Visit",
                    "Purpose",
                    "Status",
                    "Entry Time",
                    "Exit Time",
                    "Action",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "16px 14px",
                        textAlign: "left",
                        borderBottom:
                          "1px solid #e0e6ed",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#17365d",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visitors.map((visitor) => {
                  const status =
                    getStatus(visitor);

                  const photoUrl =
                    getPhotoUrl(visitor);

                  const isApproved =
                    status === "APPROVED";

                  const isExited =
                    status === "EXITED";

                  const isLoading =
                    exitLoading === visitor.id;

                  return (
                    <tr
                      key={visitor.id}
                      style={{
                        borderBottom:
                          "1px solid #e9edf2",
                      }}
                    >
                      {/* PHOTO */}
                      <td
                        style={{
                          padding: "14px",
                        }}
                      >
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt="Visitor"
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                            style={{
                              width: "100px",
                              height: "100px",
                              objectFit: "cover",
                              borderRadius: "6px",
                              border:
                                "1px solid #d8dee6",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100px",
                              height: "100px",
                              background: "#f0f2f5",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent:
                                "center",
                              color: "#777",
                              fontSize: "13px",
                            }}
                          >
                            No Photo
                          </div>
                        )}
                      </td>

                      {/* ID */}
                      <td
                        style={{
                          padding: "14px",
                          fontWeight: 700,
                        }}
                      >
                        {visitor.id}
                      </td>

                      {/* NAME */}
                      <td
                        style={{
                          padding: "14px",
                        }}
                      >
                        {visitor.name || "—"}
                      </td>

                      {/* EMAIL */}
                      <td
                        style={{
                          padding: "14px",
                        }}
                      >
                        {visitor.email || "—"}
                      </td>

                      {/* PHONE */}
                      <td
                        style={{
                          padding: "14px",
                        }}
                      >
                        {visitor.phone || "—"}
                      </td>

                      {/* PERSON */}
                      <td
                        style={{
                          padding: "14px",
                        }}
                      >
                        {visitor.person_to_visit ||
                          visitor.personToVisit ||
                          "—"}
                      </td>

                      {/* PURPOSE */}
                      <td
                        style={{
                          padding: "14px",
                        }}
                      >
                        {visitor.purpose || "—"}
                      </td>

                      {/* STATUS */}
                      <td
                        style={{
                          padding: "14px",
                        }}
                      >
                        <span
                          style={{
                            ...getStatusStyle(
                              status
                            ),
                            display:
                              "inline-block",
                            padding:
                              "8px 14px",
                            borderRadius:
                              "20px",
                            fontSize:
                              "13px",
                            fontWeight: 700,
                          }}
                        >
                          {status ||
                            "UNKNOWN"}
                        </span>
                      </td>

                      {/* ENTRY TIME */}
                      <td
                        style={{
                          padding: "14px",
                          whiteSpace: "nowrap",
                          fontSize: "13px",
                        }}
                      >
                        {formatDateTime(
                          visitor.entry_time
                        )}
                      </td>

                      {/* EXIT TIME */}
                      <td
                        style={{
                          padding: "14px",
                          whiteSpace: "nowrap",
                          fontSize: "13px",
                        }}
                      >
                        {visitor.exit_time ? (
                          formatDateTime(
                            visitor.exit_time
                          )
                        ) : (
                          <span
                            style={{
                              color: "#888",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* ACTION */}
                      <td
                        style={{
                          padding: "14px",
                        }}
                      >
                        {isExited ? (
                          <span
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "9px 14px",
                              background:
                                "#e9ecef",
                              color:
                                "#495057",
                              borderRadius:
                                "6px",
                              fontWeight: 700,
                              fontSize:
                                "13px",
                            }}
                          >
                            ✓ Exited
                          </span>
                        ) : isApproved ? (
                          <button
                            onClick={() =>
                              handleExit(
                                visitor
                              )
                            }
                            disabled={
                              isLoading
                            }
                            style={{
                              padding:
                                "9px 18px",
                              border: "none",
                              borderRadius:
                                "6px",
                              background:
                                isLoading
                                  ? "#9aa4b2"
                                  : "#dc2f2f",
                              color:
                                "#fff",
                              fontWeight: 700,
                              cursor:
                                isLoading
                                  ? "wait"
                                  : "pointer",
                              minWidth:
                                "80px",
                            }}
                          >
                            {isLoading
                              ? "Saving..."
                              : "Exit"}
                          </button>
                        ) : (
                          <span
                            style={{
                              color: "#999",
                              fontSize:
                                "13px",
                            }}
                          >
                            Not available
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ==================================================
              RECORD COUNT
          ================================================== */}

          <div
            style={{
              marginTop: "18px",
              color: "#52606d",
              fontSize: "14px",
            }}
          >
            Showing{" "}
            <strong>
              {visitors.length}
            </strong>{" "}
            visitor{" "}
            {visitors.length === 1
              ? "record"
              : "records"}
          </div>
        </>
      )}
    </div>
  );
}

export default History;