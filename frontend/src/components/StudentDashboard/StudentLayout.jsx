import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function StudentLayout({ children }) {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("studentName");
    if (storedName) {
      setStudentName(storedName);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("studentName");
    localStorage.removeItem("studentId");
    // Remove any other keys if needed
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Fixed Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-green-800 text-white p-6 space-y-4 shadow-lg">
        <h2 className="text-2xl font-bold mb-6">
          Student: {studentName || "Loading..."}
        </h2>
        {/* Navigation Links */}
        <nav className="flex flex-col space-y-3">
          <button
            onClick={() => navigate("/student")}
            className="hover:bg-green-700 p-2 rounded text-left"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/student/grades")}
            className="hover:bg-green-700 p-2 rounded text-left"
          >
            My Grades
          </button>
          <button
            onClick={() => navigate("/student/homework")}
            className="hover:bg-green-700 p-2 rounded text-left"
          >
            My Homework
          </button>
          <button
            onClick={() => navigate("/student/chat")}
            className="hover:bg-green-700 p-2 rounded text-left"
          >
            Teacher Chat
          </button>
          <button
            onClick={() => navigate("/student/ai-chat")}
            className="hover:bg-green-700 p-2 rounded text-left"
          >
            My Chat (AI)
          </button>
        </nav>
        <button
          onClick={handleLogout}
          className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition-colors mt-6 w-full"
        >
          Log out
        </button>
      </aside>

      {/* Main Content Area with left margin to accommodate the fixed sidebar */}
      <main className="ml-64 flex-1 p-6">
        {children}
      </main>
    </div>
  );
}

export default StudentLayout;
