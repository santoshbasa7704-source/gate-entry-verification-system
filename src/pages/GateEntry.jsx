import React, { useState } from "react";

const API_BASE =
  `${window.location.protocol}//${window.location.hostname}:5000`;

function GateEntry({ setVisitor, setCurrentPage }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    personToVisit: "",
    personEmail: "",
    purpose: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const people = [
    "Admin Officer",
    "HR Manager",
    "Project Manager",
    "Managing Director",
    "Team Lead",
    "Security Manager",
    "General Manager",
    "Operations Manager",
    "Finance Manager",
    "IT Manager",
    "Department Head",
    "Assistant Manager",
    "Senior Manager",
    "Director",
    "CEO",
    "Reception Manager",
    "Facility Manager",
    "Office Administrator",
    "Accounts Manager",
    "Technical Manager",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;

    if (name === "phone") {
      newValue = value.replace(/\D/g, "").slice(0, 10);
    }

    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      name,
      email,
      phone,
      personToVisit,
      personEmail,
      purpose,
    } = form;

    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !personToVisit.trim() ||
      !personEmail.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (phone.length !== 10) {
      setError("Phone number must contain exactly 10 digits.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError("Please enter a valid visitor email address.");
      return;
    }

    if (!emailRegex.test(personEmail)) {
      setError("Please enter a valid person's email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/api/visitors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to register visitor."
        );
      }

      const visitorData = {
        ...form,
        id: data.visitorId,
        visitorId: data.visitorId,
      };

      setVisitor(visitorData);

      localStorage.setItem(
        "currentVisitor",
        JSON.stringify(visitorData)
      );

      setCurrentPage("capture");
    } catch (err) {
      console.error("Visitor registration error:", err);
      setError(
        err.message || "Unable to register visitor."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gate-entry-page">

      <div className="gate-entry-heading">
        <h1>Gate Entry</h1>
        <p>
          Register visitor information before continuing
        </p>
      </div>

      <form
        className="gate-entry-form"
        onSubmit={handleSubmit}
      >

        {/* VISITOR INFORMATION */}
        <section className="gate-form-card">
          <div className="gate-section-header">
            <h2>Visitor Information</h2>
            <p>Enter the visitor's basic information</p>
          </div>

          <div className="gate-form-grid">

            <div className="gate-form-group">
              <label>
                Visitor Name
                <span>*</span>
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter visitor name"
              />
            </div>

            <div className="gate-form-group">
              <label>
                Visitor Email
                <span>*</span>
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter visitor email"
              />
            </div>

            <div className="gate-form-group">
              <label>
                Phone Number
                <span>*</span>
              </label>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter 10-digit phone number"
                maxLength="10"
              />
            </div>

          </div>
        </section>

        {/* HOST INFORMATION */}
        <section className="gate-form-card">
          <div className="gate-section-header">
            <h2>Host Information</h2>
            <p>Enter the person the visitor wants to meet</p>
          </div>

          <div className="gate-form-grid">

            <div className="gate-form-group gate-full-width">
              <label>
                Person to Visit
                <span>*</span>
              </label>

              <select
                name="personToVisit"
                value={form.personToVisit}
                onChange={handleChange}
              >
                <option value="">
                  Select person
                </option>

                {people.map((person) => (
                  <option
                    key={person}
                    value={person}
                  >
                    {person}
                  </option>
                ))}
              </select>
            </div>

            <div className="gate-form-group gate-full-width">
              <label>
                Person's Email
                <span>*</span>
              </label>

              <input
                type="email"
                name="personEmail"
                value={form.personEmail}
                onChange={handleChange}
                placeholder="Enter person's email"
              />
            </div>

          </div>
        </section>

        {/* VISIT DETAILS */}
        <section className="gate-form-card">
          <div className="gate-section-header">
            <h2>Visit Details</h2>
            <p>Provide the reason for the visit</p>
          </div>

          <div className="gate-form-group gate-full-width">
            <label>
              Purpose
            </label>

            <textarea
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              placeholder="Enter purpose of visit"
              rows="4"
            />
          </div>

          {error && (
            <div className="gate-error">
              {error}
            </div>
          )}

          <div className="gate-submit-area">
            <button
              type="submit"
              className="gate-continue-button"
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : "Continue →"}
            </button>
          </div>
        </section>

      </form>
    </div>
  );
}

export default GateEntry;