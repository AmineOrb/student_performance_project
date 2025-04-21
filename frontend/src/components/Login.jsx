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
        // Destructure the response
        // Note: We now expect 'student_id' to be returned from the backend for student users.
        const { role, user_id, name, teacher_id, student_id } = res.data;
        if (role === "admin") {
          localStorage.setItem("adminName", name);
          localStorage.setItem("adminId", user_id);
          navigate("/admin-dashboard");
        } else if (role === "teacher") {
          // Store teacher info
          localStorage.setItem("teacherName", name);
          localStorage.setItem("teacherId", teacher_id); // Must match the "teacher_id" from backend
          localStorage.setItem("teacherUserId", user_id);
          navigate("/");
        } else if (role === "student") {
          localStorage.setItem("studentName", name);
          // IMPORTANT: Store the student table ID (student_id), not the user_id
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
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <form onSubmit={handleLogin}>
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Email</label>
          <input
            type="email"
            className="border p-2 w-full rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Password</label>
          <input
            type="password"
            className="border p-2 w-full rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded w-full hover:bg-blue-600 transition-colors"
        >
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
