import React, { useState } from "react";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

import GateEntry from "./pages/GateEntry";
import WebcamCapture from "./components/WebcamCapture";
import ReviewSubmit from "./pages/ReviewSubmit";
import Verification from "./pages/verification";
import EPass from "./pages/EPass";
import History from "./pages/History";

import Login from "./pages/Login";

function App() {
  // ============================================================
  // LOGIN STATE
  // ============================================================

  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  );

  // ============================================================
  // APPLICATION STATE
  // ============================================================

  const [currentPage, setCurrentPage] = useState("gate");

  const [visitor, setVisitor] = useState(null);

  const [photos, setPhotos] = useState([]);

  // ============================================================
  // LOGIN
  // ============================================================

  if (!loggedIn) {
    return (
      <Login
        onLogin={() => {
          localStorage.setItem("isLoggedIn", "true");
          setLoggedIn(true);
        }}
      />
    );
  }

  // ============================================================
  // START NEW VISITOR
  // ============================================================

  const startNewVisitor = () => {
    setVisitor(null);
    setPhotos([]);

    localStorage.removeItem("currentVisitor");
    localStorage.removeItem("visitorPhotos");
    localStorage.removeItem("photos");

    setCurrentPage("gate");
  };

  // ============================================================
  // PAGE NAVIGATION
  // ============================================================

  const renderPage = () => {
    switch (currentPage) {
      // --------------------------------------------------------
      // GATE ENTRY
      // --------------------------------------------------------

      case "gate":
        return (
          <GateEntry
            setVisitor={setVisitor}
            setCurrentPage={setCurrentPage}
          />
        );

      // --------------------------------------------------------
      // WEBCAM / PHOTOS
      // --------------------------------------------------------

      case "capture":
      case "webcam":
        return (
          <WebcamCapture
            visitor={visitor}
            photos={photos}
            setPhotos={setPhotos}
            setCurrentPage={setCurrentPage}
          />
        );

      // --------------------------------------------------------
      // REVIEW & SUBMIT
      // --------------------------------------------------------

      case "review":
        return (
          <ReviewSubmit
            visitor={visitor}
            photos={photos}
            setCurrentPage={setCurrentPage}
          />
        );

      // --------------------------------------------------------
      // VERIFICATION
      // --------------------------------------------------------

      case "verification":
        return (
          <Verification
            visitor={visitor}
            photos={photos}
            setVisitor={setVisitor}
            setCurrentPage={setCurrentPage}
          />
        );

      // --------------------------------------------------------
      // E-PASS
      // --------------------------------------------------------

      case "epass":
        return (
          <EPass
            visitor={visitor}
            photos={photos}
            setCurrentPage={setCurrentPage}
          />
        );

      // --------------------------------------------------------
      // HISTORY
      // --------------------------------------------------------

      case "history":
        return (
          <History
            visitor={visitor}
            photos={photos}
            setCurrentPage={setCurrentPage}
          />
        );

      // --------------------------------------------------------
      // DEFAULT
      // --------------------------------------------------------

      default:
        return (
          <GateEntry
            setVisitor={setVisitor}
            setCurrentPage={setCurrentPage}
          />
        );
    }
  };

  // ============================================================
  // MAIN APPLICATION
  // ============================================================

  return (
    <div className="app">

      <Header />

      <div className="app-body">

        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          startNewVisitor={startNewVisitor}
        />

        <main className="main-content">
          {renderPage()}
        </main>

      </div>

    </div>
  );
}

export default App;