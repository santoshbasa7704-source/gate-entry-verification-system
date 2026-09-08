import React, { useEffect, useState } from "react";

const API_BASE =
  `${window.location.protocol}//${window.location.hostname}:5000`;

function EPass({
  visitor,
  setCurrentPage
}) {
  const [currentVisitor, setCurrentVisitor] =
    useState(visitor);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const storedVisitor = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("currentVisitor") || "null"
      );
    } catch (err) {
      return null;
    }
  })();

  const visitorId =
    visitor?.id ||
    storedVisitor?.id;

  useEffect(() => {
    if (visitorId) {
      loadVisitor();
    } else {
      setLoading(false);
      setError("Visitor information is missing.");
    }
  }, [visitorId]);

  const loadVisitor = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/visitors/${visitorId}`
      );

      let data = {};

      try {
        data = await response.json();
      } catch (jsonError) {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load visitor."
        );
      }

      if (!data.visitor) {
        throw new Error(
          "Visitor was not found."
        );
      }

      setCurrentVisitor(data.visitor);

      localStorage.setItem(
        "currentVisitor",
        JSON.stringify(data.visitor)
      );

    } catch (err) {
      console.error(
        "E-Pass loading error:",
        err
      );

      setError(
        err.message ||
        "Unable to load visitor."
      );

    } finally {
      setLoading(false);
    }
  };

  /* ==========================================
     PHOTO URL
     ========================================== */

  const getPhotoUrl = (photo) => {
    if (!photo) {
      return null;
    }

    const photoString =
      String(photo).trim();

    if (!photoString) {
      return null;
    }

    if (
      photoString.startsWith("http://") ||
      photoString.startsWith("https://") ||
      photoString.startsWith("data:image/")
    ) {
      return photoString;
    }

    if (
      photoString.startsWith("/uploads/")
    ) {
      return `${API_BASE}${photoString}`;
    }

    if (
      photoString.startsWith("uploads/")
    ) {
      return `${API_BASE}/${photoString}`;
    }

    return `${API_BASE}/uploads/${photoString}`;
  };

  const visitorPhoto =
    getPhotoUrl(
      currentVisitor?.photo
    );

  /* ==========================================
     PRINT
     ========================================== */

  const handlePrint = () => {
    window.print();
  };

  /* ==========================================
     LOADING
     ========================================== */

  if (loading) {
    return (
      <div className="gate-page">

        <div className="page-header">
          <h1>
            Visitor E-Pass
          </h1>

          <p>
            Loading visitor information...
          </p>
        </div>

      </div>
    );
  }

  /* ==========================================
     NO VISITOR
     ========================================== */

  if (!currentVisitor) {
    return (
      <div className="gate-page">

        <div className="page-header">
          <h1>
            Visitor E-Pass
          </h1>

          <p>
            Visitor information could not
            be found.
          </p>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            setCurrentPage("gate")
          }
        >
          ← Back to Gate Entry
        </button>

      </div>
    );
  }

  /* ==========================================
     STATUS
     ========================================== */

  const status =
    currentVisitor.status ||
    "PENDING";

  /* ==========================================
     ONLY APPROVED CAN GET E-PASS
     ========================================== */

  if (status !== "APPROVED") {
    return (
      <div className="gate-page">

        <div className="page-header">
          <h1>
            Visitor E-Pass
          </h1>

          <p>
            The E-Pass cannot be used until
            the visitor is approved.
          </p>
        </div>

        <div className="form-error">
          Current status:
          {" "}
          <strong>
            {status}
          </strong>
        </div>

        {status === "PENDING" && (
          <div className="success-message">
            Visitor approval is still pending.
            <br />
            The E-Pass will become available
            after approval.
          </div>
        )}

        {status === "REJECTED" && (
          <div className="form-error">
            This visitor request has been rejected.
            <br />
            An E-Pass cannot be generated.
          </div>
        )}

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            setCurrentPage("verification")
          }
        >
          Go to Verification
        </button>

      </div>
    );
  }

  /* ==========================================
     APPROVED E-PASS
     ========================================== */

  return (
    <div className="epass-page">

      {/* E-PASS */}

      <div className="epass-card">

        {/* HEADER */}

        <div className="epass-header">

          <div>
            <h1>
              Gate Entry & Verification System
            </h1>

            <h2>
              VISITOR E-PASS
            </h2>
          </div>

          <span className="status-badge approved">
            APPROVED
          </span>

        </div>

        {/* BODY */}

        <div className="epass-body">

          {/* DETAILS */}

          <div className="epass-details">

            <h2>
              Visitor Details
            </h2>

            <p>
              <strong>Name:</strong>
              {" "}
              {currentVisitor.name || "—"}
            </p>

            <p>
              <strong>Email:</strong>
              {" "}
              {currentVisitor.email || "—"}
            </p>

            <p>
              <strong>Phone:</strong>
              {" "}
              {currentVisitor.phone || "—"}
            </p>

            <p>
              <strong>Person to Visit:</strong>
              {" "}
              {
                currentVisitor.personToVisit ||
                currentVisitor.person_to_visit ||
                "—"
              }
            </p>

            <p>
              <strong>Purpose:</strong>
              {" "}
              {currentVisitor.purpose || "—"}
            </p>

            <p>
              <strong>Visitor ID:</strong>
              {" "}
              {currentVisitor.id}
            </p>

            <p>
              <strong>Status:</strong>
              {" "}
              APPROVED
            </p>

          </div>

          {/* PHOTO */}

          <div className="epass-photo">

            {visitorPhoto ? (

              <img
                src={visitorPhoto}
                alt="Visitor"
                onError={(e) => {
                  console.error(
                    "Visitor photo failed to load:",
                    visitorPhoto
                  );

                  e.currentTarget.style.display =
                    "none";
                }}
              />

            ) : (

              <div className="no-photo">
                <strong>
                  No Photo
                </strong>

                <span>
                  Visitor photo not available
                </span>
              </div>

            )}

          </div>

        </div>

        {/* FOOTER */}

        <div className="epass-footer">

          <strong>
            ✓ This E-Pass is valid for entry.
          </strong>

        </div>

      </div>

      {/* BUTTONS */}

      <div className="epass-actions">

        <button
          type="button"
          className="epass-print-button"
          onClick={handlePrint}
        >
          🖨 Print E-Pass
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            setCurrentPage("history")
          }
        >
          View History
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            setCurrentPage("gate")
          }
        >
          New Visitor
        </button>

      </div>

    </div>
  );
}

export default EPass;