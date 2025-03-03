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

  useEffect(() => {
    // Check if user is already logged in
    const storedUser =
      typeof window !== "undefined"
        ? localStorage.getItem("currentCometChatUser")
        : null;
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setCurrentUser(userData);
      setIsLoggedIn(true);
    }

    // Initialize localStorage for users if it doesn't exist
    if (
      typeof window !== "undefined" &&
      !localStorage.getItem("cometChatUsers")
    ) {
      localStorage.setItem("cometChatUsers", JSON.stringify({}));
    }
  }, []);

  // Handle CometChat script loading
  const handleScriptLoad = () => {
    setIsScriptLoaded(true);
    initializeCometChat();
  };

  // Initialize CometChat
  useEffect(() => {
    if (isScriptLoaded) {
      initializeCometChat();
    }
  }, [isScriptLoaded]); // Remove `currentUser` from the dependency array

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

      // If there's a current user, always try to log them in and launch the widget
      if (currentUser) {
        await loginAndLaunchCometChat(currentUser.username);
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

  // Create a new helper function to handle both login and widget launch
  const loginAndLaunchCometChat = async (username) => {
    try {
      if (typeof window === "undefined" || !window.CometChatWidget) {
        throw new Error("CometChat SDK not loaded");
      }

      // Check if user is already logged in to CometChat
      let user = await window.CometChatWidget.getLoggedinUser();

      // If not logged in or logged in as a different user, log in
      if (!user || user.uid !== username) {
        user = await window.CometChatWidget.login({
          uid: username,
        });
        console.log("Login successful:", user);
      } else {
        console.log("User already logged in:", user);
      }

      // Always launch the widget
      window.CometChatWidget.launch({
        widgetID: process.env.NEXT_PUBLIC_COMETCHAT_WIDGET_ID,
        target: "#cometchat",
        roundedCorners: "true",
        height: "600px",
        width: "100%",
        defaultID: "fibre-test-guid", // This can be any default group ID you've created in CometChat
        defaultType: "group",
      });

      // Update state
      setIsLoggedIn(true);
    } catch (error) {
      console.error("User login or widget launch failed with error:", error);
      showMessage(
        "login",
        "Failed to connect to chat. Please try again.",
        "error"
      );
      // Reset login state on failure
      localStorage.removeItem("currentCometChatUser");
      setCurrentUser(null);
      setIsLoggedIn(false);
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

    // Get existing users
    const users = JSON.parse(localStorage.getItem("cometChatUsers"));

    // Check if username already exists
    if (users[username]) {
      showMessage("signup", "Username already exists", "error");
      return;
    }

    // Show loading message
    showMessage("signup", "Creating your account...", "");

    try {
      // Register user in CometChat using our secure API endpoint
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: username,
          name: fullname,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create user");
      }

      // Save user to local storage
      users[username] = {
        username: username,
        fullname: fullname,
        password: password, // In a real app, NEVER store passwords in plain text
      };

      localStorage.setItem("cometChatUsers", JSON.stringify(users));
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

    // Get users from storage
    const users = JSON.parse(localStorage.getItem("cometChatUsers"));

    // Check if user exists and password matches
    if (!users[username] || users[username].password !== password) {
      showMessage("login", "Invalid username or password", "error");
      return;
    }

    // Login successful
    showMessage("login", "Logging in...", "");

    // Save current user first
    const userData = users[username];
    localStorage.setItem("currentCometChatUser", JSON.stringify(userData));
    setCurrentUser(userData);
    setLoginForm({ username: "", password: "" });

    // Then login to CometChat and launch widget
    await loginAndLaunchCometChat(username);

    // Clear login message on success
    setMessage({ ...message, login: "" });
  };

  // Helper function to login a user to CometChat
  const loginCometChatUser = async (username) => {
    if (typeof window === "undefined" || !window.CometChatWidget) {
      showMessage(
        "login",
        "Chat system not loaded yet. Please try again.",
        "error"
      );
      return;
    }

    try {
      const users = JSON.parse(localStorage.getItem("cometChatUsers"));
      const userData = users[username];

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
              Logged in as: <strong>{currentUser.fullname}</strong>
            </span>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
          <div id="cometchat" className={styles.cometchat}></div>
        </>
      ) : (
        <div className={styles.authContainer}>
          <div className={styles.authForm}>
            <h2>Sign Up</h2>
            <form onSubmit={handleSignup}>
              <div className={styles.formGroup}>
                <label htmlFor="signup-username">Username</label>
                <input
                  type="text"
                  id="signup-username"
                  name="username"
                  placeholder="Choose a username"
                  required
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
                  placeholder="Your full name"
                  required
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
                  placeholder="Choose a password"
                  required
                  value={signupForm.password}
                  onChange={handleSignupChange}
                />
              </div>
              <button type="submit">Sign Up</button>
              {message.signup && (
                <div
                  className={`${styles.message} ${
                    message.type ? styles[message.type] : ""
                  }`}
                >
                  {message.signup}
                </div>
              )}
            </form>
          </div>

          <div className={styles.authForm}>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <div className={styles.formGroup}>
                <label htmlFor="login-username">Username</label>
                <input
                  type="text"
                  id="login-username"
                  name="username"
                  placeholder="Your username"
                  required
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
                  placeholder="Your password"
                  required
                  value={loginForm.password}
                  onChange={handleLoginChange}
                />
              </div>
              <button type="submit">Login</button>
              {message.login && (
                <div
                  className={`${styles.message} ${
                    message.type ? styles[message.type] : ""
                  }`}
                >
                  {message.login}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
