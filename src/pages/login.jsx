import { useState } from "react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [fpOpen, setFpOpen] = useState(false);
  const [fpUser, setFpUser] = useState("");
  const [fpNew, setFpNew] = useState("");
  const [fpConfirm, setFpConfirm] = useState("");
  const [fpError, setFpError] = useState("");

  async function login() {
    setError("");
    if (!username || !password) {
      setError("Username and password required");
      return;
    }

    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      window.location.href = "/";
    } else {
      const data = await res.json();
      setError(data.error || "Login failed");
    }
  }

  async function resetPassword() {
    setFpError("");

    if (!fpUser || !fpNew || !fpConfirm) {
      setFpError("All fields required");
      return;
    }
    if (fpNew !== fpConfirm) {
      setFpError("Passwords do not match");
      return;
    }

    const res = await fetch("/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: fpUser, newPassword: fpNew }),
    });

    const data = await res.json();
    if (res.ok && data.status === "success") {
      alert("Password updated. You may log in.");
      setFpOpen(false);
      setFpUser("");
      setFpNew("");
      setFpConfirm("");
    } else {
      setFpError(data.error || "Reset failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(1200px_700px_at_50%_30%,#ffffff_0%,#e9edf3_40%,#dfe3ea_60%,#cfd6e2_78%,#c7cedc_100%),linear-gradient(135deg,#f5f7fb_0%,#6ec522_40%,#dbe2ee_100%)]">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl px-12 py-14">
        <h2 className="text-4xl font-bold text-gray-900 text-center mb-8">
          Gateway Login
        </h2>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-sm font-extrabold text-gray-700 mb-1">
            Username
          </label>
          <input
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="block text-sm font-extrabold text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>

        {/* Login Button */}
        <button
          onClick={login}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
        >
          Log in
        </button>

        {/* Forgot */}
        <div className="text-right mt-4">
          <button
            onClick={() => setFpOpen(true)}
            className="text-blue-600 font-bold hover:underline"
          >
            Forgot your password?
          </button>
        </div>

        {/* Error */}
        <div className="text-red-600 text-sm mt-3 min-h-[1.25rem]">
          {error}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {fpOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-8 relative">
            <button
              className="absolute top-3 right-4 text-3xl text-gray-400 hover:text-red-500"
              onClick={() => setFpOpen(false)}
            >
              &times;
            </button>

            <h3 className="text-2xl font-semibold mb-4 text-gray-900">
              Reset Password
            </h3>

            <div className="space-y-3">
              <input
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="Username"
                value={fpUser}
                onChange={(e) => setFpUser(e.target.value)}
              />
              <input
                type="password"
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="New Password"
                value={fpNew}
                onChange={(e) => setFpNew(e.target.value)}
              />
              <input
                type="password"
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="Confirm Password"
                value={fpConfirm}
                onChange={(e) => setFpConfirm(e.target.value)}
              />
            </div>

            <button
              onClick={resetPassword}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
            >
              Reset Password
            </button>

            <div className="text-red-600 text-sm mt-3 min-h-[1.25rem]">
              {fpError}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
