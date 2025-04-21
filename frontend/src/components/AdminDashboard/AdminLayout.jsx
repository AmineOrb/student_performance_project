// src/components/AdminDashboard/AdminLayout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function AdminLayout({ children }) {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("adminName");
    if (storedName) {
      setAdminName(storedName);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminId");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-64 bg-slate-900 text-white p-6 space-y-4">
        <h2 className="text-2xl font-bold mb-6">
          Admin: {adminName || "Loading..."}
        </h2>
        <nav className="flex flex-col space-y-2">
          <button
            onClick={() => navigate("/admin-dashboard/teacher")}
            className="hover:bg-slate-700 p-2 rounded text-left"
          >
            Manage Teachers
          </button>
          <button
            onClick={() => navigate("/admin-dashboard/student")}
            className="hover:bg-slate-700 p-2 rounded text-left"
          >
            Manage Students
          </button>
        </nav>
        <button 
          onClick={handleLogout}
          className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition-colors mt-6 w-full"
        >
          Log out
        </button>
      </aside>

      {/* Main Content with left margin to avoid being hidden behind sidebar */}
      <main className="ml-64 p-6">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
