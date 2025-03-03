"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import "../styles/Home.module.css";

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
  const [isSignupActive, setIsSignupActive] = useState(false);

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

  // Toggle between login and signup
  const toggleForm = () => {
    setIsSignupActive(!isSignupActive);
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

      // Switch to login
      setIsSignupActive(false);
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
    loginCometChatUser(username);
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
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.5.0/js/bootstrap.min.js"
        strategy="lazyOnload"
      />

      {isLoggedIn && currentUser ? (
        <>
          <div className="chat-user-info">
            <span>
              Logged in as: <strong>{currentUser.fullname}</strong>
            </span>
            <button className="chat-logout-btn btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <div id="cometchat" className="chat-cometchat"></div>
        </>
      ) : (
        <div className="chat-section">
          <div className="chat-container">
            <div className="row full-height justify-content-center">
              <div className="col-12 text-center align-self-center py-5">
                <div className="chat-section pb-5 pt-5 pt-sm-2 text-center">
                  <h6 className="mb-0 pb-3">
                    <span>Log In </span>
                    <span>Sign Up</span>
                  </h6>
                  <input
                    className="checkbox"
                    type="checkbox"
                    id="reg-log"
                    name="reg-log"
                    checked={isSignupActive}
                    onChange={toggleForm}
                  />
                  <label htmlFor="reg-log"></label>
                  <div className="card-3d-wrap mx-auto">
                    <div className="card-3d-wrapper">
                      <div className="card-front">
                        <div className="center-wrap">
                          <div className="chat-section text-center">
                            <h4 className="mb-4 pb-3">Log In</h4>
                            <form onSubmit={handleLogin}>
                              <div className="form-group">
                                <input
                                  type="text"
                                  name="username"
                                  className="form-style"
                                  placeholder="Your Username"
                                  id="login-username"
                                  value={loginForm.username}
                                  onChange={handleLoginChange}
                                  autoComplete="off"
                                />
                                <i className="input-icon uil uil-at"></i>
                              </div>
                              <div className="form-group mt-2">
                                <input
                                  type="password"
                                  name="password"
                                  className="form-style"
                                  placeholder="Your Password"
                                  id="login-password"
                                  value={loginForm.password}
                                  onChange={handleLoginChange}
                                  autoComplete="off"
                                />
                                <i className="input-icon uil uil-lock-alt"></i>
                              </div>
                              <button type="submit" className="btn mt-4">
                                Submit
                              </button>
                              {message.login && (
                                <div
                                  className={`chat-message mt-3 ${message.type}`}
                                >
                                  {message.login}
                                </div>
                              )}
                            </form>
                          </div>
                        </div>
                      </div>
                      <div className="card-back">
                        <div className="center-wrap">
                          <div className="chat-section text-center">
                            <h4 className="mb-4 pb-3">Sign Up</h4>
                            <form onSubmit={handleSignup}>
                              <div className="form-group">
                                <input
                                  type="text"
                                  name="username"
                                  className="form-style"
                                  placeholder="Your Username"
                                  id="signup-username"
                                  value={signupForm.username}
                                  onChange={handleSignupChange}
                                  autoComplete="off"
                                />
                                <i className="input-icon uil uil-at"></i>
                              </div>
                              <div className="form-group mt-2">
                                <input
                                  type="text"
                                  name="fullname"
                                  className="form-style"
                                  placeholder="Your Full Name"
                                  id="signup-fullname"
                                  value={signupForm.fullname}
                                  onChange={handleSignupChange}
                                  autoComplete="off"
                                />
                                <i className="input-icon uil uil-user"></i>
                              </div>
                              <div className="form-group mt-2">
                                <input
                                  type="password"
                                  name="password"
                                  className="form-style"
                                  placeholder="Your Password"
                                  id="signup-password"
                                  value={signupForm.password}
                                  onChange={handleSignupChange}
                                  autoComplete="off"
                                />
                                <i className="input-icon uil uil-lock-alt"></i>
                              </div>
                              <button type="submit" className="btn mt-4">
                                Submit
                              </button>
                              {message.signup && (
                                <div
                                  className={`chat-message mt-3 ${message.type}`}
                                >
                                  {message.signup}
                                </div>
                              )}
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
