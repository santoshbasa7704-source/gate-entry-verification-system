import React, {
  useEffect,
  useRef,
  useState
} from "react";

// =====================================================
// BACKEND API URL
// =====================================================

const API_BASE =
  `${window.location.protocol}//${window.location.hostname}:5000`;

// =====================================================
// WEBCAM CAPTURE COMPONENT
// =====================================================

function WebcamCapture({
  visitor,
  photos,
  setPhotos,
  setCurrentPage
}) {

  // ===================================================
  // REFERENCES
  // ===================================================

  const videoRef = useRef(null);

  const streamRef = useRef(null);


  // ===================================================
  // STATES
  // ===================================================

  const [error, setError] =
    useState("");

  const [cameraReady, setCameraReady] =
    useState(false);

  const [loading, setLoading] =
    useState(false);


  // ===================================================
  // START CAMERA WHEN PAGE OPENS
  // ===================================================

  useEffect(() => {

    startCamera();

    return () => {

      stopCamera();

    };

  }, []);


  // ===================================================
  // START CAMERA
  // ===================================================

  const startCamera = async () => {

    try {

      setError("");

      setCameraReady(false);


      // -----------------------------------------------
      // CHECK BROWSER CAMERA SUPPORT
      // -----------------------------------------------

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {

        setError(
          "Camera is not supported by this browser."
        );

        return;

      }


      // -----------------------------------------------
      // STOP OLD CAMERA FIRST
      // -----------------------------------------------

      stopCamera();


      // -----------------------------------------------
      // REQUEST CAMERA
      // -----------------------------------------------

      const stream =
        await navigator.mediaDevices.getUserMedia({

          video: {

            width: {
              ideal: 640
            },

            height: {
              ideal: 480
            },

            facingMode: "user"

          },

          audio: false

        });


      // -----------------------------------------------
      // SAVE STREAM
      // -----------------------------------------------

      streamRef.current =
        stream;


      // -----------------------------------------------
      // CONNECT CAMERA TO VIDEO
      // -----------------------------------------------

      if (videoRef.current) {

        videoRef.current.srcObject =
          stream;


        try {

          await videoRef.current.play();

        } catch (playError) {

          console.log(
            "Video play waiting:",
            playError.message
          );

        }

      }


      // -----------------------------------------------
      // CAMERA READY
      // -----------------------------------------------

      setCameraReady(true);


    } catch (err) {

      console.error(
        "Camera error:",
        err
      );


      setCameraReady(false);


      if (
        err.name ===
        "NotAllowedError"
      ) {

        setError(
          "Camera permission was denied. Please allow camera access and try again."
        );

      } else if (
        err.name ===
        "NotFoundError"
      ) {

        setError(
          "No camera was found on this device."
        );

      } else if (
        err.name ===
        "NotReadableError"
      ) {

        setError(
          "Camera is already being used by another application."
        );

      } else {

        setError(
          "Camera could not be opened. Please allow camera permission."
        );

      }

    }

  };


  // ===================================================
  // STOP CAMERA
  // ===================================================

  const stopCamera = () => {

    if (
      streamRef.current
    ) {

      streamRef.current
        .getTracks()
        .forEach(
          (track) => {

            track.stop();

          }
        );


      streamRef.current =
        null;

    }


    // -----------------------------------------------
    // REMOVE VIDEO STREAM
    // -----------------------------------------------

    if (
      videoRef.current
    ) {

      videoRef.current.srcObject =
        null;

    }


    setCameraReady(false);

  };


  // ===================================================
  // CAPTURE PHOTO
  // ===================================================

  const capturePhoto = () => {

    setError("");


    // -----------------------------------------------
    // MAXIMUM PHOTOS
    // -----------------------------------------------

    if (
      photos &&
      photos.length >= 10
    ) {

      setError(
        "You can capture a maximum of 10 photos."
      );

      return;

    }


    // -----------------------------------------------
    // CHECK VIDEO
    // -----------------------------------------------

    if (
      !videoRef.current
    ) {

      setError(
        "Camera is not available."
      );

      return;

    }


    // -----------------------------------------------
    // CHECK CAMERA
    // -----------------------------------------------

    if (
      !cameraReady
    ) {

      setError(
        "Please wait for the camera to start."
      );

      return;

    }


    // -----------------------------------------------
    // CHECK VIDEO SIZE
    // -----------------------------------------------

    const video =
      videoRef.current;


    const width =
      video.videoWidth;


    const height =
      video.videoHeight;


    if (
      !width ||
      !height
    ) {

      setError(
        "Camera is not ready yet. Please wait a moment and try again."
      );

      return;

    }


    // -----------------------------------------------
    // CREATE CANVAS
    // -----------------------------------------------

    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      width;


    canvas.height =
      height;


    // -----------------------------------------------
    // GET CANVAS CONTEXT
    // -----------------------------------------------

    const ctx =
      canvas.getContext(
        "2d"
      );


    if (!ctx) {

      setError(
        "Unable to capture photo."
      );

      return;

    }


    // -----------------------------------------------
    // DRAW CAMERA IMAGE
    // -----------------------------------------------

    ctx.drawImage(

      video,

      0,

      0,

      width,

      height

    );


    // -----------------------------------------------
    // CONVERT IMAGE TO JPEG
    // -----------------------------------------------

    const image =
      canvas.toDataURL(
        "image/jpeg",
        0.85
      );


    // -----------------------------------------------
    // ADD PHOTO TO EXISTING PHOTOS
    // -----------------------------------------------

    const updatedPhotos = [
      ...(photos || []),
      image
    ];


    // -----------------------------------------------
    // SAVE PHOTOS IN APP STATE
    // -----------------------------------------------

    setPhotos(
      updatedPhotos
    );


    // -----------------------------------------------
    // SAVE PHOTOS IN LOCAL STORAGE
    // -----------------------------------------------

    localStorage.setItem(

      "visitorPhotos",

      JSON.stringify(
        updatedPhotos
      )

    );


    localStorage.setItem(

      "photos",

      JSON.stringify(
        updatedPhotos
      )

    );


    // -----------------------------------------------
    // KEEP CAMERA OPEN
    // -----------------------------------------------

    // IMPORTANT:
    // We do NOT stop the camera here.
    //
    // This allows the user to capture:
    // Photo 1
    // Photo 2
    // Photo 3
    // etc.
    //
    // Camera will stop when Continue is clicked.

  };


  // ===================================================
  // DELETE ONE PHOTO
  // ===================================================

  const deletePhoto = (index) => {

    setError("");


    const updatedPhotos =
      (photos || []).filter(
        (_, photoIndex) =>
          photoIndex !== index
      );


    setPhotos(
      updatedPhotos
    );


    localStorage.setItem(

      "visitorPhotos",

      JSON.stringify(
        updatedPhotos
      )

    );


    localStorage.setItem(

      "photos",

      JSON.stringify(
        updatedPhotos
      )

    );

  };


  // ===================================================
  // RETAKE ALL PHOTOS
  // ===================================================

  const retakePhotos = async () => {

    setError("");

    setPhotos([]);


    // -----------------------------------------------
    // REMOVE OLD PHOTOS
    // -----------------------------------------------

    localStorage.removeItem(
      "visitorPhotos"
    );

    localStorage.removeItem(
      "photos"
    );


    // -----------------------------------------------
    // START CAMERA AGAIN
    // -----------------------------------------------

    await startCamera();

  };


  // ===================================================
  // CONTINUE TO REVIEW
  // ===================================================

  const continueNext = async () => {

    setError("");


    // -----------------------------------------------
    // CHECK VISITOR
    // -----------------------------------------------

    if (
      !visitor?.id
    ) {

      setError(
        "Visitor information is missing. Please start again."
      );

      return;

    }


    // -----------------------------------------------
    // CHECK PHOTOS
    // -----------------------------------------------

    if (
      !photos ||
      photos.length === 0
    ) {

      setError(
        "Please capture at least one visitor photo first."
      );

      return;

    }


    // -----------------------------------------------
    // PREVENT DOUBLE CLICK
    // -----------------------------------------------

    if (loading) {

      return;

    }


    try {

      setLoading(true);


      // =============================================
      // SEND ALL PHOTOS TO BACKEND
      // =============================================

      const response =
        await fetch(

          `${API_BASE}/api/visitors/${visitor.id}/photos`,

          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body: JSON.stringify({

              photos: photos

            })

          }

        );


      // =============================================
      // READ SERVER RESPONSE
      // =============================================

      let data = {};


      try {

        data =
          await response.json();

      } catch (
        jsonError
      ) {

        data = {};

      }


      // =============================================
      // CHECK RESPONSE
      // =============================================

      if (
        !response.ok
      ) {

        throw new Error(

          data.message ||
          "Photo upload failed."

        );

      }


      // =============================================
      // UPDATE VISITOR
      // =============================================

      const updatedVisitor = {

        ...visitor,

        photos: photos,

        // Keep first photo for
        // backward compatibility

        photo: photos[0]

      };


      // =============================================
      // SAVE VISITOR
      // =============================================

      localStorage.setItem(

        "currentVisitor",

        JSON.stringify(
          updatedVisitor
        )

      );


      // =============================================
      // STOP CAMERA
      // =============================================

      stopCamera();


      // =============================================
      // MOVE TO REVIEW
      // =============================================

      setCurrentPage(
        "review"
      );


    } catch (
      err
    ) {

      console.error(
        "Photo upload error:",
        err
      );


      setError(

        err.message ||
        "Unable to upload visitor photos."

      );

    } finally {

      setLoading(false);

    }

  };


  // ===================================================
  // GO BACK TO GATE ENTRY
  // ===================================================

  const goBack = () => {

    stopCamera();

    setPhotos([]);

    localStorage.removeItem(
      "visitorPhotos"
    );

    localStorage.removeItem(
      "photos"
    );

    setCurrentPage(
      "gate"
    );

  };


  // ===================================================
  // PAGE UI
  // ===================================================

  return (

    <div className="gate-page">


      {/* =============================================
          PAGE HEADER
      ============================================= */}

      <div className="page-header">

        <h1>
          Visitor Photo
        </h1>

        <p>
          Capture the visitor photos before submission.
        </p>

      </div>


      {/* =============================================
          ERROR
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
          CAMERA
      ============================================= */}

      <div className="camera-container">


        {/* =========================================
            CAMERA VIDEO
        ========================================= */}

        <video

          ref={videoRef}

          autoPlay

          playsInline

          muted

          className="camera-video"

        />


        {/* =========================================
            CAMERA STATUS
        ========================================= */}

        {!cameraReady && (

          <p>
            Opening camera...
          </p>

        )}


        {/* =========================================
            PHOTO COUNT
        ========================================= */}

        <p
          style={{
            textAlign: "center",
            marginTop: "10px",
            fontWeight: "bold"
          }}
        >

          Photos Captured:{" "}
          {photos?.length || 0} / 10

        </p>


        {/* =========================================
            CAPTURE BUTTON
        ========================================= */}

        <button

          type="button"

          className="primary-button"

          onClick={
            capturePhoto
          }

          disabled={
            !cameraReady ||
            loading ||
            (photos?.length || 0) >= 10
          }

        >

          {loading
            ? "Processing..."
            : "📷 Capture Photo"}

        </button>


        {/* =========================================
            BACK BUTTON
        ========================================= */}

        <button

          type="button"

          className="secondary-button"

          onClick={
            goBack
          }

          disabled={
            loading
          }

        >

          ← Back

        </button>


      </div>


      {/* =============================================
          CAPTURED PHOTOS
      ============================================= */}

      {photos &&
        photos.length > 0 && (

          <div
            className="photo-preview"
            style={{
              marginTop: "25px"
            }}
          >

            <h2>
              Captured Photos
            </h2>


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
                      position: "relative"
                    }}
                  >

                    <img

                      src={photo}

                      alt={`Visitor ${index + 1}`}

                      className="captured-photo"

                    />


                    {/* DELETE PHOTO */}

                    <button

                      type="button"

                      onClick={() =>
                        deletePhoto(index)
                      }

                      disabled={
                        loading
                      }

                      style={{
                        marginTop: "8px"
                      }}

                    >

                      Remove

                    </button>


                    <p
                      style={{
                        textAlign: "center"
                      }}
                    >

                      Photo {index + 1}

                    </p>

                  </div>

                )

              )}

            </div>


            {/* =====================================
                BUTTON ROW
            ===================================== */}

            <div
              className="button-row"
              style={{
                marginTop: "20px"
              }}
            >


              {/* RETAKE ALL */}

              <button

                type="button"

                onClick={
                  retakePhotos
                }

                className="secondary-button"

                disabled={
                  loading
                }

              >

                Retake All

              </button>


              {/* CONTINUE */}

              <button

                type="button"

                onClick={
                  continueNext
                }

                className="primary-button"

                disabled={
                  loading ||
                  photos.length === 0
                }

              >

                {loading
                  ? "Uploading..."
                  : "Continue →"}

              </button>


            </div>

          </div>

        )}

    </div>

  );

}


// =====================================================
// EXPORT
// =====================================================

export default WebcamCapture;