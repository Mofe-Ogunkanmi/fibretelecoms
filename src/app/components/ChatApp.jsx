"use client";

import { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";
import Script from "next/script";

export default function ChatApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [signupForm, setSignupForm] = useState({
    username: "",
    fullname: "",
    password: "",
  });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState({ signup: "", login: "", type: "" });
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const handleTabSwitch = (tab) => setActiveTab(tab);

  // Check if user is already logged in on component mount
  useEffect(() => {
    const storedUser =
      typeof window !== "undefined"
        ? localStorage.getItem("currentCometChatUser")
        : null;
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setCurrentUser(userData);
      setIsLoggedIn(true);
    }
  }, []);

  // Handle CometChat script loading
  const handleScriptLoad = () => {
    setIsScriptLoaded(true);
  };

  // Initialize CometChat when the script is loaded
  useEffect(() => {
    if (isScriptLoaded) {
      initializeCometChat();
    }
  }, [isScriptLoaded]);

  // Initialize CometChat and re-launch widget for logged-in users
  const initializeCometChat = async () => {
    try {
      if (typeof window === "undefined" || !window.CometChatWidget) return;

      // Get the auth key from our secure API endpoint
      const response = await fetch("/api/auths", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "getAuthKey" }),
      });

      if (!response.ok) {
        throw new Error("Failed to get auth key");
      }

      const data = await response.json();
      const authKey = data.authKey;

      // Initialize CometChat with the securely obtained auth key
      await window.CometChatWidget.init({
        appID: process.env.NEXT_PUBLIC_COMETCHAT_APP_ID,
        appRegion: process.env.NEXT_PUBLIC_COMETCHAT_REGION,
        authKey: authKey,
      });

      console.log("CometChat initialization completed successfully");

      // Check if a user is already logged in and re-launch the widget
      const storedUser = localStorage.getItem("currentCometChatUser");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
        setIsLoggedIn(true);

        // Re-launch the widget for the logged-in user
        window.CometChatWidget.launch({
          widgetID: process.env.NEXT_PUBLIC_COMETCHAT_WIDGET_ID,
          target: "#cometchat",
          roundedCorners: "true",
          height: "600px",
          width: "100%",
          defaultID: "fibre-test-guid", // This can be any default group ID you've created in CometChat
          defaultType: "group",
        });
      }
    } catch (error) {
      console.log("CometChat initialization failed with error:", error);
      showMessage(
        "login",
        "Failed to initialize chat. Please try again later.",
        "error"
      );
    }
  };

  // Handle form changes
  const handleSignupChange = (e) => {
    setSignupForm({ ...signupForm, [e.target.name]: e.target.value });
  };

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  // Sign up function
  const handleSignup = async (e) => {
    e.preventDefault();
    const { username, fullname, password } = signupForm;

    if (!username || !fullname || !password) {
      showMessage("signup", "All fields are required", "error");
      return;
    }

    // Show loading message
    showMessage("signup", "Creating your account...", "");

    try {
      // Register user in CometChat and MongoDB using our API
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: username,
          name: fullname,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create user");
      }

      showMessage(
        "signup",
        "Sign up successful! You can now login.",
        "success"
      );

      // Clear form
      setSignupForm({ username: "", fullname: "", password: "" });
    } catch (error) {
      showMessage("signup", "Failed to create user: " + error.message, "error");
    }
  };

  // Login function
  const handleLogin = async (e) => {
    e.preventDefault();
    const { username, password } = loginForm;

    if (!username || !password) {
      showMessage("login", "Username and password are required", "error");
      return;
    }

    // Show loading message
    showMessage("login", "Logging in...", "");

    try {
      // Authenticate user via our API
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();

      // Login successful
      loginCometChatUser(username, data.user);
    } catch (error) {
      showMessage("login", error.message || "Failed to login", "error");
    }
  };

  // Helper function to login a user to CometChat
  const loginCometChatUser = async (username, userData) => {
    if (typeof window === "undefined" || !window.CometChatWidget) {
      showMessage(
        "login",
        "Chat system not loaded yet. Please try again.",
        "error"
      );
      return;
    }

    try {
      // Login without an auth token
      const user = await window.CometChatWidget.login({
        uid: username,
      });

      console.log("Login successful:", user);

      // Save current user
      localStorage.setItem("currentCometChatUser", JSON.stringify(userData));
      setCurrentUser(userData);
      setIsLoggedIn(true);
      setLoginForm({ username: "", password: "" });

      // Clear any login messages
      setMessage({ ...message, login: "" });

      // Launch CometChat widget
      window.CometChatWidget.launch({
        widgetID: process.env.NEXT_PUBLIC_COMETCHAT_WIDGET_ID,
        target: "#cometchat",
        roundedCorners: "true",
        height: "600px",
        width: "100%",
        defaultID: "fibre-test-guid", // This can be any default group ID you've created in CometChat
        defaultType: "group",
      });
    } catch (error) {
      console.error("User login failed with error:", error);
      showMessage(
        "login",
        "Failed to login to chat. Please try again.",
        "error"
      );
    }
  };

  // Logout function
  const handleLogout = () => {
    if (typeof window !== "undefined" && window.CometChatWidget) {
      window.CometChatWidget.logout().then(
        () => {
          localStorage.removeItem("currentCometChatUser");
          setCurrentUser(null);
          setIsLoggedIn(false);
          console.log("Logout completed successfully");
        },
        (error) => {
          console.log("Logout failed with error:", error);
        }
      );
    } else {
      localStorage.removeItem("currentCometChatUser");
      setCurrentUser(null);
      setIsLoggedIn(false);
    }
  };

  // Helper function to show messages
  const showMessage = (type, text, messageType) => {
    setMessage({ ...message, [type]: text, type: messageType });

    // Only clear success or error messages after a delay
    if (messageType === "success" || messageType === "error") {
      setTimeout(() => {
        setMessage({ ...message, [type]: "" });
      }, 5000);
    }
  };

  return (
    <>
      <Script
        src="https://widget-js.cometchat.io/v3/cometchatwidget.js"
        onLoad={handleScriptLoad}
        strategy="lazyOnload"
      />

      {isLoggedIn && currentUser ? (
        <>
          <div className={styles.userInfo}>
            <span>
              Logged in as: <strong>{currentUser.username}</strong>
            </span>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
          <div id="cometchat" className={styles.cometchat}></div>
        </>
      ) : (
        <div className={styles.authContainer}>
          <div className={styles.authBox}>
            <div className={styles.tabContainer}>
              <button
                className={`${styles.tabButton} ${
                  activeTab === "login" ? styles.active : ""
                }`}
                onClick={() => handleTabSwitch("login")}
              >
                Login
              </button>
              <button
                className={`${styles.tabButton} ${
                  activeTab === "signup" ? styles.active : ""
                }`}
                onClick={() => handleTabSwitch("signup")}
              >
                Sign Up
              </button>
            </div>

            {activeTab === "login" ? (
              <form onSubmit={handleLogin} className={styles.authForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="login-username">Username</label>
                  <input
                    type="text"
                    id="login-username"
                    name="username"
                    required
                    placeholder="Your username"
                    value={loginForm.username}
                    onChange={handleLoginChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="login-password">Password</label>
                  <input
                    type="password"
                    id="login-password"
                    name="password"
                    required
                    placeholder="Your password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                  />
                </div>
                <button type="submit" className={styles.buttonGroup}>
                  Login
                </button>
                {message.login && (
                  <div className={`${styles.message} ${styles[message.type]}`}>
                    {message.login}
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleSignup} className={styles.authForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="signup-username">Username</label>
                  <input
                    type="text"
                    id="signup-username"
                    name="username"
                    required
                    placeholder="Choose a username"
                    value={signupForm.username}
                    onChange={handleSignupChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="signup-fullname">Full Name</label>
                  <input
                    type="text"
                    id="signup-fullname"
                    name="fullname"
                    required
                    placeholder="Your Full Name"
                    value={signupForm.fullname}
                    onChange={handleSignupChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="signup-password">Password</label>
                  <input
                    type="password"
                    id="signup-password"
                    name="password"
                    required
                    placeholder="Choose a password"
                    value={signupForm.password}
                    onChange={handleSignupChange}
                  />
                </div>
                <button type="submit" className={styles.buttonGroup}>
                  Sign Up
                </button>
                {message.signup && (
                  <div className={`${styles.message} ${styles[message.type]}`}>
                    {message.signup}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
