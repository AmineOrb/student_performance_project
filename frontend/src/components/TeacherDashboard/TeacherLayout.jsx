import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function TeacherLayout({ children }) {
  const navigate = useNavigate();
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("teacherName");
    if (storedName) {
      setTeacherName(storedName);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("teacherName");
    localStorage.removeItem("teacherId");
    // Remove other keys if necessary
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Fixed Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-blue-900 text-white p-6 space-y-4 shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Teacher: {teacherName || "Loading..."}</h2>
        <nav className="flex flex-col space-y-3">
          <button
            onClick={() => navigate("/my-classes")}
            className="hover:bg-blue-700 p-2 rounded text-left"
          >
            My Classes
          </button>
          <button
            onClick={() => navigate("/add-attendance")}
            className="hover:bg-blue-700 p-2 rounded text-left"
          >
            Add Attendance
          </button>
          <button
            onClick={() => navigate("/add-participation")}
            className="hover:bg-blue-700 p-2 rounded text-left"
          >
            Add Participation
          </button>
          <button
            onClick={() => navigate("/add-homework")}
            className="hover:bg-blue-700 p-2 rounded text-left"
          >
            Add Homework
          </button>
          <button
            onClick={() => navigate("/chat")}
            className="hover:bg-blue-700 p-2 rounded text-left"
          >
            Chat
          </button>
        </nav>
        <button
          onClick={handleLogout}
          className="bg-red-500 w-full px-4 py-2 rounded hover:bg-red-600 transition-colors mt-6"
        >
          Log out
        </button>
      </aside>

      {/* Main Content Area (with left margin to accommodate fixed sidebar) */}
      <main className="ml-64 flex-1 p-6">
        {children}
      </main>
    </div>
  );
}

export default TeacherLayout;
