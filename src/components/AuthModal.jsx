import React, {
  useState,
} from "react";

import "./AuthModal.css";

const API_URL =
  "http://localhost:5000";

export default function AuthModal({
  onClose,
  onLogin,
}) {
  const [step, setStep] =
    useState("email");

  const [email, setEmail] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [resending, setResending] =
    useState(false);

  // =====================================================
  // SEND OTP
  // =====================================================

  const sendOtp = async () => {
    setError("");
    setMessage("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        "Please enter your email address."
      );

      return;
    }

    if (
      !cleanEmail.includes("@")
    ) {
      setError(
        "Please enter a valid email address."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_URL}/api/auth/send-otp`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email: cleanEmail,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "OTP send failed."
        );
      }

      setEmail(
        cleanEmail
      );

      setStep("otp");

      setMessage(
        "6-digit OTP aapke email par bhej diya gaya hai."
      );
    } catch (err) {
      console.error(
        "Send OTP error:",
        err
      );

      setError(
        err.message ||
          "OTP send failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // VERIFY OTP
  // =====================================================

  const verifyOtp = async () => {
    setError("");
    setMessage("");

    const cleanOtp =
      otp.trim();

    if (
      !/^\d{6}$/.test(
        cleanOtp
      )
    ) {
      setError(
        "Please enter the 6-digit OTP."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_URL}/api/auth/verify-otp`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                email
                  .trim()
                  .toLowerCase(),

              otp: cleanOtp,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "OTP verification failed."
        );
      }

      if (
        !data?.token ||
        !data?.user
      ) {
        throw new Error(
          "Login response mein token/user nahi mila."
        );
      }

      /*
        IMPORTANT:

        SafeFile aur AuthModal
        dono SAME token key use karenge.
      */

      localStorage.setItem(
        "safe_file_auth_token",
        data.token
      );

      localStorage.setItem(
        "safe_file_user",
        JSON.stringify(
          data.user
        )
      );

      /*
        IMPORTANT:

        Yahan sirf user nahi bhejna.

        Full object bhejna hai:

        {
          user,
          token
        }

        Isse SafeFile ko immediately
        new token mil jayega.
      */

      if (
        typeof onLogin ===
        "function"
      ) {
        await onLogin({
          user: data.user,
          token: data.token,
        });
      }

    } catch (err) {
      console.error(
        "Verify OTP error:",
        err
      );

      setError(
        err.message ||
          "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RESEND OTP
  // =====================================================

  const resendOtp = async () => {
    setError("");
    setMessage("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setStep("email");
      return;
    }

    setResending(true);

    try {
      const response =
        await fetch(
          `${API_URL}/api/auth/send-otp`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email: cleanEmail,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "OTP resend failed."
        );
      }

      setMessage(
        "Naya OTP email par bhej diya gaya hai."
      );
    } catch (err) {
      console.error(
        "Resend OTP error:",
        err
      );

      setError(
        err.message ||
          "OTP resend failed."
      );
    } finally {
      setResending(false);
    }
  };

  // =====================================================
  // CHANGE EMAIL
  // =====================================================

  const changeEmail = () => {
    setOtp("");
    setError("");
    setMessage("");
    setStep("email");
  };

  // =====================================================
  // ENTER KEY
  // =====================================================

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key !==
      "Enter"
    ) {
      return;
    }

    if (
      step === "email"
    ) {
      sendOtp();
    }

    if (
      step === "otp"
    ) {
      verifyOtp();
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="auth-modal-overlay"
      onMouseDown={(event) => {
        /*
          Outside click se modal
          accidentally close na ho.
        */
        if (
          event.target ===
          event.currentTarget
        ) {
          return;
        }
      }}
    >

      <div
        className="auth-modal"
        onKeyDown={
          handleKeyDown
        }
      >

        {/* CLOSE */}

        <button
          className="auth-modal-close"
          onClick={
            onClose
          }
          type="button"
        >
          ×
        </button>

        {/* HEADER */}

        <div className="auth-modal-header">

          <div className="auth-modal-icon">
            🔐
          </div>

          <h2>
            {step ===
            "email"
              ? "Login to Safe File"
              : "Verify your email"}
          </h2>

          <p>
            {step ===
            "email"
              ? "Enter your email to continue"
              : `OTP sent to ${email}`}
          </p>

        </div>

        {/* ERROR */}

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* MESSAGE */}

        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}

        {/* EMAIL */}

        {step ===
          "email" && (
          <div className="auth-form">

            <label>
              Email Address
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target
                    .value
                )
              }
              autoFocus
              disabled={
                loading
              }
            />

            <button
              type="button"
              className="auth-primary-button"
              onClick={
                sendOtp
              }
              disabled={
                loading
              }
            >
              {loading
                ? "Sending OTP..."
                : "Send OTP"}
            </button>

          </div>
        )}

        {/* OTP */}

        {step ===
          "otp" && (
          <div className="auth-form">

            <label>
              Enter 6-digit OTP
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(event) =>
                setOtp(
                  event.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              autoFocus
              disabled={
                loading
              }
            />

            <button
              type="button"
              className="auth-primary-button"
              onClick={
                verifyOtp
              }
              disabled={
                loading ||
                otp.length !==
                  6
              }
            >
              {loading
                ? "Verifying..."
                : "Verify OTP & Login"}
            </button>

            <div className="auth-secondary-actions">

              <button
                type="button"
                onClick={
                  resendOtp
                }
                disabled={
                  resending ||
                  loading
                }
              >
                {resending
                  ? "Sending..."
                  : "Resend OTP"}
              </button>

              <button
                type="button"
                onClick={
                  changeEmail
                }
                disabled={
                  loading
                }
              >
                Change Email
              </button>

            </div>

          </div>
        )}

        {/* FOOTER */}

        <div className="auth-modal-footer">
          🔒 Your files remain
          private and are
          accessible only after
          authentication.
        </div>

      </div>

    </div>
  );
}