import React, { useState } from "react";

// =====================================================
// BACKEND API URL
// =====================================================

const API_BASE =
    `${window.location.protocol}//${window.location.hostname}:5000`;


// =====================================================
// REVIEW SUBMIT COMPONENT
// =====================================================

function ReviewSubmit({
    visitor,
    photos,
    setCurrentPage
}) {


    // =================================================
    // STATES
    // =================================================

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");

    const [submitted, setSubmitted] =
        useState(false);


    // =================================================
    // GET VISITOR VALUES
    // =================================================

    const visitorName =
        visitor?.name || "";

    const visitorEmail =
        visitor?.email || "";

    const visitorPhone =
        visitor?.phone || "";

    const personToVisit =
        visitor?.personToVisit ||
        visitor?.person_to_visit ||
        "";

    const personEmail =
        visitor?.personEmail ||
        visitor?.person_email ||
        "";

    const purpose =
        visitor?.purpose || "";


    // =================================================
    // SUBMIT VISITOR
    // =================================================

    const submitVisitor =
        async () => {

            // -----------------------------------------
            // CLEAR PREVIOUS MESSAGES
            // -----------------------------------------

            setError("");

            setMessage("");


            // -----------------------------------------
            // CHECK VISITOR
            // -----------------------------------------

            if (!visitor?.id) {

                setError(
                    "Visitor information is missing. Please start again."
                );

                return;

            }


            // -----------------------------------------
            // CHECK PHOTOS
            // -----------------------------------------

            if (
                !photos ||
                photos.length === 0
            ) {

                setError(
                    "Visitor photo is missing. Please capture at least one photo before submitting."
                );

                return;

            }


            try {

                setLoading(true);


                // =====================================
                // SUBMIT TO BACKEND
                // =====================================

                const response =
                    await fetch(
                        `${API_BASE}/api/visitors/${visitor.id}/submit`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );


                // =====================================
                // READ RESPONSE
                // =====================================

                let data = {};

                try {

                    data =
                        await response.json();

                } catch (
                    jsonError
                ) {

                    data = {};

                }


                // =====================================
                // CHECK SERVER RESPONSE
                // =====================================

                if (
                    !response.ok
                ) {

                    throw new Error(
                        data.message ||
                        "Failed to submit visitor."
                    );

                }


                // =====================================
                // SUCCESS
                // =====================================

                setSubmitted(true);

                setMessage(
                    "Visitor submitted successfully. Approval request has been sent by email."
                );


                // =====================================
                // UPDATE LOCAL STORAGE
                // =====================================

                try {

                    const updatedVisitor = {

                        ...visitor,

                        ...(data.visitor || {}),

                        photos:
                            photos,

                        // Keep first photo for
                        // backward compatibility

                        photo:
                            photos[0],

                        status:
                            data.visitor?.status ||
                            visitor.status ||
                            "PENDING"

                    };


                    localStorage.setItem(

                        "currentVisitor",

                        JSON.stringify(
                            updatedVisitor
                        )

                    );


                    localStorage.setItem(

                        "visitorPhotos",

                        JSON.stringify(
                            photos
                        )

                    );


                    localStorage.setItem(

                        "photos",

                        JSON.stringify(
                            photos
                        )

                    );

                } catch (
                    storageError
                ) {

                    console.log(
                        "Could not update local storage:",
                        storageError.message
                    );

                }


            } catch (
                err
            ) {

                console.error(
                    "Submit visitor error:",
                    err
                );


                setError(

                    err.message ||
                    "Unable to submit visitor."

                );

            } finally {

                setLoading(false);

            }

        };


    // =================================================
    // GO TO VERIFICATION
    // =================================================

    const goToVerification =
        () => {

            setCurrentPage(
                "verification"
            );

        };


    // =================================================
    // GO BACK TO PHOTO
    // =================================================

    const goBackToPhoto =
        () => {

            setCurrentPage(
                "webcam"
            );

        };


    // =================================================
    // GO BACK TO GATE ENTRY
    // =================================================

    const goBackToGate =
        () => {

            setCurrentPage(
                "gate"
            );

        };


    // =================================================
    // PAGE
    // =================================================

    return (

        <div className="gate-page">


            {/* =========================================
                PAGE HEADER
            ========================================= */}

            <div className="page-header">

                <h1>
                    Review Visitor
                </h1>

                <p>
                    Check the visitor details and photos
                    before submitting the request.
                </p>

            </div>


            {/* =========================================
                ERROR MESSAGE
            ========================================= */}

            {error && (

                <div
                    className="form-error"
                    role="alert"
                >

                    {error}

                </div>

            )}


            {/* =========================================
                SUCCESS MESSAGE
            ========================================= */}

            {message && (

                <div
                    className="success-message"
                    role="status"
                >

                    {message}

                </div>

            )}


            {/* =========================================
                REVIEW CARD
            ========================================= */}

            <div className="review-card">


                {/* =====================================
                    TITLE
                ===================================== */}

                <h2>
                    Visitor Details
                </h2>


                {/* =====================================
                    NAME
                ===================================== */}

                <p>

                    <strong>
                        Name:
                    </strong>{" "}

                    {visitorName || "—"}

                </p>


                {/* =====================================
                    EMAIL
                ===================================== */}

                <p>

                    <strong>
                        Email:
                    </strong>{" "}

                    {visitorEmail || "—"}

                </p>


                {/* =====================================
                    PHONE
                ===================================== */}

                <p>

                    <strong>
                        Phone:
                    </strong>{" "}

                    {visitorPhone || "—"}

                </p>


                {/* =====================================
                    PERSON TO VISIT
                ===================================== */}

                <p>

                    <strong>
                        Person to Visit:
                    </strong>{" "}

                    {personToVisit || "—"}

                </p>


                {/* =====================================
                    PERSON EMAIL
                ===================================== */}

                <p>

                    <strong>
                        Person's Email:
                    </strong>{" "}

                    {personEmail || "—"}

                </p>


                {/* =====================================
                    PURPOSE
                ===================================== */}

                <p>

                    <strong>
                        Purpose:
                    </strong>{" "}

                    {purpose || "—"}

                </p>


                {/* =====================================
                    STATUS
                ===================================== */}

                <p>

                    <strong>
                        Status:
                    </strong>{" "}

                    <span>

                        {submitted
                            ? "PENDING"
                            : (
                                visitor?.status ||
                                "PENDING"
                            )}

                    </span>

                </p>


                {/* =====================================
                    ALL VISITOR PHOTOS
                ===================================== */}

                {photos &&
                photos.length > 0 ? (

                    <div
                        className="photo-preview"
                    >

                        <h3>
                            Visitor Photos
                        </h3>


                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(180px, 1fr))",
                                gap: "15px",
                                marginTop: "15px"
                            }}
                        >

                            {photos.map(
                                (photo, index) => (

                                    <div
                                        key={index}
                                        style={{
                                            textAlign:
                                                "center"
                                        }}
                                    >

                                        <img
                                            src={photo}
                                            alt={`Visitor ${index + 1}`}
                                            className="captured-photo"
                                        />

                                        <p>

                                            <strong>
                                                Photo {index + 1}
                                            </strong>

                                        </p>

                                    </div>

                                )
                            )}

                        </div>

                    </div>

                ) : (

                    <div
                        className="form-error"
                    >

                        No visitor photo captured.

                    </div>

                )}


                {/* =====================================
                    BUTTON AREA
                ===================================== */}

                <div
                    className="review-actions"
                >


                    {/* ---------------------------------
                        BACK TO PHOTO
                    --------------------------------- */}

                    {!submitted && (

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={
                                goBackToPhoto
                            }
                            disabled={
                                loading
                            }
                        >

                            ← Back to Photo

                        </button>

                    )}


                    {/* ---------------------------------
                        SUBMIT
                    --------------------------------- */}

                    {!submitted && (

                        <button
                            type="button"
                            className="primary-button"
                            onClick={
                                submitVisitor
                            }
                            disabled={
                                loading ||
                                !photos?.length
                            }
                        >

                            {loading
                                ? "Submitting..."
                                : "Submit Visitor →"}

                        </button>

                    )}


                    {/* ---------------------------------
                        AFTER SUBMISSION
                    --------------------------------- */}

                    {submitted && (

                        <button
                            type="button"
                            className="primary-button"
                            onClick={
                                goToVerification
                            }
                        >

                            Continue to Verification →

                        </button>

                    )}

                </div>


                {/* =====================================
                    AFTER SUBMISSION INFORMATION
                ===================================== */}

                {submitted && (

                    <div
                        className="review-status"
                    >

                        <h3>
                            Waiting for Approval
                        </h3>

                        <p>

                            The visitor request has been
                            sent to the person's email.

                        </p>

                        <p>

                            The visitor will remain

                            <strong>
                                {" "}PENDING
                            </strong>

                            until the person accepts
                            the request.

                        </p>

                        <p>

                            The E-Pass should only become
                            available after approval.

                        </p>

                    </div>

                )}


            </div>


            {/* =========================================
                START OVER
            ========================================= */}

            {!loading && !submitted && (

                <div
                    className="start-over-section"
                >

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={
                            goBackToGate
                        }
                    >

                        Start Over

                    </button>

                </div>

            )}


        </div>

    );

}


// =====================================================
// EXPORT
// =====================================================

export default ReviewSubmit;