import React, {
  useEffect,
  useState
} from "react";

// =====================================================
// BACKEND API URL
// =====================================================

const API_BASE =
  `${window.location.protocol}//${window.location.hostname}:5000`;


// =====================================================
// VERIFICATION COMPONENT
// =====================================================

function Verification({
  visitor,
  setVisitor,
  setCurrentPage,
}) {

  // ===================================================
  // CURRENT VISITOR
  // ===================================================

  const [currentVisitor, setCurrentVisitor] =
    useState(visitor);


  // ===================================================
  // STATES
  // ===================================================

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);


  // ===================================================
  // GET VISITOR FROM LOCAL STORAGE
  // ===================================================

  const storedVisitor = (() => {

    try {

      return JSON.parse(
        localStorage.getItem(
          "currentVisitor"
        ) || "null"
      );

    } catch (err) {

      return null;

    }

  })();


  // ===================================================
  // GET VISITOR ID
  // ===================================================

  const visitorId =
    visitor?.id ||
    storedVisitor?.id;


  // ===================================================
  // LOAD VISITOR
  // ===================================================

  useEffect(() => {

    if (visitorId) {

      loadVisitor();

    }

  }, [visitorId]);


  // ===================================================
  // NORMALIZE VISITOR PHOTOS
  // ===================================================

  const getVisitorPhotos = (visitorData) => {

    if (!visitorData) {
      return [];
    }

    // -----------------------------------------------
    // NEW BACKEND: photos
    // -----------------------------------------------

    if (Array.isArray(visitorData.photos)) {

      return visitorData.photos
        .filter(Boolean)
        .map((photo) =>
          normalizePhotoUrl(photo)
        );

    }


    // -----------------------------------------------
    // JSON STRING FROM DATABASE
    // -----------------------------------------------

    if (
      typeof visitorData.photos === "string" &&
      visitorData.photos.trim()
    ) {

      try {

        const parsed =
          JSON.parse(visitorData.photos);

        if (Array.isArray(parsed)) {

          return parsed
            .filter(Boolean)
            .map((photo) =>
              normalizePhotoUrl(photo)
            );

        }

      } catch (err) {

        // Continue with old photo field

      }

    }


    // -----------------------------------------------
    // OLD SINGLE PHOTO FIELD
    // -----------------------------------------------

    if (visitorData.photo) {

      return [
        normalizePhotoUrl(
          visitorData.photo
        )
      ];

    }

    return [];

  };


  // ===================================================
  // NORMALIZE PHOTO URL
  // ===================================================

  const normalizePhotoUrl = (photo) => {

    if (!photo) {
      return "";
    }

    // Already a data URL
    if (
      typeof photo === "string" &&
      photo.startsWith("data:image")
    ) {

      return photo;

    }


    // Already a full URL
    if (
      typeof photo === "string" &&
      (
        photo.startsWith("http://") ||
        photo.startsWith("https://")
      )
    ) {

      return photo;

    }


    // Backend filename/path
    if (
      typeof photo === "string" &&
      photo.startsWith("/")
    ) {

      return `${API_BASE}${photo}`;

    }


    // Just filename
    return `${API_BASE}/uploads/${photo}`;

  };


  // ===================================================
  // LOAD VISITOR FROM BACKEND
  // ===================================================

  const loadVisitor = async () => {

    try {

      setError("");

      setRefreshing(true);


      const response =
        await fetch(
          `${API_BASE}/api/visitors/${visitorId}`
        );


      let data = {};

      try {

        data =
          await response.json();

      } catch (jsonError) {

        data = {};

      }


      if (!response.ok) {

        throw new Error(

          data.message ||
          "Unable to load visitor."

        );

      }


      if (!data.visitor) {

        throw new Error(
          "Visitor information was not returned by the server."
        );

      }


      // -----------------------------------------------
      // UPDATE STATE
      // -----------------------------------------------

      setCurrentVisitor(
        data.visitor
      );

      setVisitor(
        data.visitor
      );


      // -----------------------------------------------
      // UPDATE LOCAL STORAGE
      // -----------------------------------------------

      localStorage.setItem(

        "currentVisitor",

        JSON.stringify(
          data.visitor
        )

      );


    } catch (err) {

      console.error(
        "Load visitor error:",
        err
      );


      setError(

        err.message ||
        "Unable to load visitor."

      );

    } finally {

      setRefreshing(false);

    }

  };


  // ===================================================
  // MANUAL REFRESH
  // ===================================================

  const refreshVisitor = async () => {

    if (!visitorId) {

      setError(
        "Visitor ID is missing."
      );

      return;

    }


    await loadVisitor();

  };


  // ===================================================
  // UPDATE STATUS
  // ===================================================

  const updateStatus =
    async (status) => {

      if (!visitorId) {

        setError(
          "Visitor ID is missing."
        );

        return;

      }


      if (loading) {

        return;

      }


      try {

        setLoading(true);

        setError("");


        // =============================================
        // SEND STATUS TO BACKEND
        // =============================================

        const response =
          await fetch(

            `${API_BASE}/api/visitors/${visitorId}/status`,

            {

              method: "PUT",

              headers: {

                "Content-Type":
                  "application/json"

              },

              body: JSON.stringify({

                status

              })

            }

          );


        // =============================================
        // READ RESPONSE
        // =============================================

        let data = {};

        try {

          data =
            await response.json();

        } catch (jsonError) {

          data = {};

        }


        // =============================================
        // CHECK RESPONSE
        // =============================================

        if (!response.ok) {

          throw new Error(

            data.message ||
            "Status update failed."

          );

        }


        if (!data.visitor) {

          throw new Error(
            "Updated visitor information was not returned."
          );

        }


        // =============================================
        // UPDATE VISITOR
        // =============================================

        const updatedVisitor =
          data.visitor;


        setCurrentVisitor(
          updatedVisitor
        );


        setVisitor(
          updatedVisitor
        );


        // =============================================
        // SAVE LOCALLY
        // =============================================

        localStorage.setItem(

          "currentVisitor",

          JSON.stringify(
            updatedVisitor
          )

        );


        // =============================================
        // APPROVED
        // =============================================

        if (
          updatedVisitor.status ===
          "APPROVED"
        ) {

          setCurrentPage(
            "epass"
          );

          return;

        }


      } catch (err) {

        console.error(
          "Status update error:",
          err
        );


        setError(

          err.message ||
          "Unable to update visitor status."

        );

      } finally {

        setLoading(false);

      }

    };


  // ===================================================
  // NO VISITOR
  // ===================================================

  if (!currentVisitor) {

    return (

      <div className="gate-page">

        <div className="page-header">

          <h1>
            Visitor Verification
          </h1>

          <p>
            No visitor selected.
          </p>

        </div>


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


  // ===================================================
  // SUPPORT DIFFERENT BACKEND FIELD NAMES
  // ===================================================

  const personToVisit =
    currentVisitor.personToVisit ||
    currentVisitor.person_to_visit ||
    "—";


  const personEmail =
    currentVisitor.personEmail ||
    currentVisitor.person_email ||
    "—";


  const entryTime =
    currentVisitor.entry_time ||
    currentVisitor.entryTime ||
    "Not available";


  const status =
    currentVisitor.status ||
    "PENDING";


  // ===================================================
  // GET ALL PHOTOS
  // ===================================================

  const visitorPhotos =
    getVisitorPhotos(
      currentVisitor
    );


  // ===================================================
  // STATUS FLAGS
  // ===================================================

  const isApproved =
    status === "APPROVED";


  const isRejected =
    status === "REJECTED";


  const isPending =
    status === "PENDING";


  // ===================================================
  // PAGE
  // ===================================================

  return (

    <div className="verification-page">


      {/* =============================================
          HEADER
      ============================================= */}

      <div className="verification-header">

        <div>

          <h1>
            Visitor Verification
          </h1>

          <p>
            Verify visitor information before
            granting entry.
          </p>

        </div>


        {/* ===========================================
            STATUS BADGE
        =========================================== */}

        <span
          className={
            `status-badge ${
              isApproved
                ? "approved"
                : isRejected
                ? "rejected"
                : "pending"
            }`
          }
        >

          {status}

        </span>

      </div>


      {/* =============================================
          ERROR MESSAGE
      ============================================= */}

      {error && (

        <div
          className="form-error"
          role="alert"
        >

          {error}

        </div>

      )}


      {/* =============================================
          VISITOR INFORMATION
      ============================================= */}

      <div className="verification-grid">


        {/* ===========================================
            DETAILS CARD
        =========================================== */}

        <div className="visitor-details-card">

          <h2>
            Visitor Details
          </h2>


          <div className="detail-row">

            <strong>
              Name
            </strong>

            <span>
              {currentVisitor.name || "—"}
            </span>

          </div>


          <div className="detail-row">

            <strong>
              Email
            </strong>

            <span>
              {currentVisitor.email || "—"}
            </span>

          </div>


          <div className="detail-row">

            <strong>
              Phone
            </strong>

            <span>
              {currentVisitor.phone || "—"}
            </span>

          </div>


          <div className="detail-row">

            <strong>
              Person to Visit
            </strong>

            <span>
              {personToVisit}
            </span>

          </div>


          <div className="detail-row">

            <strong>
              Person's Email
            </strong>

            <span>
              {personEmail}
            </span>

          </div>


          <div className="detail-row">

            <strong>
              Purpose
            </strong>

            <span>
              {currentVisitor.purpose || "—"}
            </span>

          </div>


          <div className="detail-row">

            <strong>
              Visitor ID
            </strong>

            <span>
              {currentVisitor.id}
            </span>

          </div>

        </div>


        {/* ===========================================
            PHOTO CARD
        =========================================== */}

        <div className="visitor-photo-card">

          <h2>
            Visitor Photos
          </h2>


          {visitorPhotos.length > 0 ? (

            <div
              className="verification-photo-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  visitorPhotos.length === 1
                    ? "1fr"
                    : "repeat(2, 1fr)",
                gap: "15px",
              }}
            >

              {visitorPhotos.map(
                (photo, index) => (

                  <div
                    key={`${photo}-${index}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >

                    <img
                      src={photo}
                      alt={`Visitor ${index + 1}`}
                      style={{
                        width: "100%",
                        maxHeight: "300px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        display: "block",
                      }}
                    />

                    <span
                      style={{
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >

                      Photo {index + 1}

                    </span>

                  </div>

                )
              )}

            </div>

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


      {/* =============================================
          ENTRY INFORMATION
      ============================================= */}

      <div className="entry-information">

        <h2>
          Entry Information
        </h2>


        <div className="entry-info-grid">


          <div>

            <strong>
              Status
            </strong>

            <p>
              {status}
            </p>

          </div>


          <div>

            <strong>
              Entry Time
            </strong>

            <p>
              {entryTime}
            </p>

          </div>


        </div>

      </div>


      {/* =============================================
          REFRESH BUTTON
      ============================================= */}

      <div className="verification-refresh">

        <button
          type="button"
          className="secondary-button"
          onClick={
            refreshVisitor
          }
          disabled={
            refreshing ||
            loading
          }
        >

          {refreshing
            ? "Refreshing..."
            : "↻ Refresh Status"}

        </button>

      </div>


      {/* =============================================
          PENDING ACTIONS
      ============================================= */}



      {/* =============================================
          APPROVED MESSAGE
      ============================================= */}
      {isPending && (
  <div className="verification-actions">
    <div className="pending-message">
      <strong>Waiting for Person's Approval</strong>
      <p>
        An approval email has been sent to the person responsible
        for this visitor. The E-Pass will be available only after
        the person approves the request from the email.
      </p>
    </div>
  </div>
)}

      {isApproved && (

        <div className="success-message">

          <strong>
            Visitor Approved
          </strong>

          <br />

          E-Pass is now available.

          <br />

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              setCurrentPage("epass")
            }
            style={{
              marginTop: "12px",
            }}
          >

            View E-Pass

          </button>

        </div>

      )}


      {/* =============================================
          REJECTED MESSAGE
      ============================================= */}

      {isRejected && (

        <div className="form-error">

          <strong>
            Visitor Rejected
          </strong>

          <br />

          This visitor request has been rejected.

          <br />

          E-Pass is not available for rejected visitors.

        </div>

      )}


      {/* =============================================
          BACK TO HISTORY
      ============================================= */}

      <div className="verification-bottom-actions">

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            setCurrentPage(
              "history"
            )
          }
          disabled={
            loading
          }
        >

          View History

        </button>

      </div>


    </div>

  );

}


// =====================================================
// EXPORT
// =====================================================

export default Verification;