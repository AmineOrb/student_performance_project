import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    axios.post("http://127.0.0.1:5000/login", { email, password })
      .then((res) => {
        const { role, user_id, name, teacher_id, student_id } = res.data;
        if (role === "admin") {
          localStorage.setItem("adminName", name);
          localStorage.setItem("adminId", user_id);
          navigate("/admin-dashboard");
        } else if (role === "teacher") {
          localStorage.setItem("teacherName", name);
          localStorage.setItem("teacherId", teacher_id);
          localStorage.setItem("teacherUserId", user_id);
          navigate("/");
        } else if (role === "student") {
          localStorage.setItem("studentName", name);
          localStorage.setItem("studentId", student_id);
          localStorage.setItem("studentUserId", user_id);
          navigate("/student-dashboard");
        }
      })
      .catch((err) => {
        console.error("Login error:", err);
        if (err.response && err.response.data.error) {
          setError(err.response.data.error);
        } else {
          setError("Login failed. Please try again.");
        }
      });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url('/images/logIn_photo.jpg')` }}
    >
      <div className="bg-white bg-opacity-40 backdrop-blur-md px-10 py-12 rounded-3xl shadow-2xl max-w-md w-full">
        <h2 className="text-4xl font-bold text-center mb-8 text-black drop-shadow-md">
          Welcome Back
        </h2>
        {error && <div className="text-red-600 mb-4 text-center">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label className="block text-black font-semibold mb-2">Email</label>
            <input
              type="email"
              className="w-full p-3 rounded-lg bg-white bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-8">
            <label className="block text-black font-semibold mb-2">Password</label>
            <input
              type="password"
              className="w-full p-3 rounded-lg bg-white bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-300"
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
