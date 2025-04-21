// StudentDashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Helper to choose a color for the performance card based on grade ranges
const getGradeColor = (grade) => {
  if (grade < 40) return "#FF4500";      // Danger (Fail) – Orange Red
  if (grade < 50) return "#FFA500";      // Weak (Needs Improvement) – Orange
  if (grade < 60) return "#FFD700";      // Below Average – Gold
  if (grade < 70) return "#9ACD32";      // Average – Yellow-Green
  if (grade < 80) return "#32CD32";      // Good – Lime Green
  return "#006400";                      // Excellent – Dark Green
};

function StudentDashboard() {
  const navigate = useNavigate();

  // State variables
  const [performance, setPerformance] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [performanceError, setPerformanceError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [notifError, setNotifError] = useState("");

  // Retrieve student info from localStorage
  const studentId = localStorage.getItem("studentId");
  const studentName = localStorage.getItem("studentName") || "Student";

  // ------------------- Fetch Performance Data -------------------
  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:5000/student/${studentId}/predict`);
        const grade = res.data.predicted_final_grade || 0;
        const cardColor = getGradeColor(grade);
        setPerformance({
          overall: grade,
          message: `Your predicted final grade is ${grade.toFixed(2)}%.`,
          average_grade: res.data.past_grade,
          attendance_percent: res.data.attendance_percent,
          average_participation: res.data.participation_percent,
          color: cardColor,
        });
      } catch (err) {
        console.error("Error fetching performance:", err);
        setPerformanceError("Failed to load performance data.");
      } finally {
        setLoadingPerformance(false);
      }
    };

    if (studentId) {
      fetchPerformance();
    } else {
      setPerformanceError("Student ID not found. Please log in again.");
      setLoadingPerformance(false);
    }
  }, [studentId]);

  // ------------------- Fetch Notifications -------------------
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Update the endpoint as needed
        const res = await axios.get(`http://127.0.0.1:5000/student/${studentId}/notifications`);
        setNotifications(res.data || []);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setNotifError("Failed to load notifications.");
      } finally {
        setLoadingNotifications(false);
      }
    };

    if (studentId) {
      fetchNotifications();
    } else {
      setNotifError("Student ID not found.");
      setLoadingNotifications(false);
    }
  }, [studentId]);

  // Function to clear notifications
  const clearNotifications = async () => {
    try {
      await axios.delete(`http://127.0.0.1:5000/notifications/${studentId}/clear`);
      setNotifications([]);
    } catch (err) {
      console.error("Error clearing notifications:", err);
      setNotifError("Failed to clear notifications.");
    }
  };

  // ------------------- AI Tutor Recommendation Component -------------------
  const AiTutorRecommendation = () => {
    const [recommendation, setRecommendation] = useState("");
    const [loadingRec, setLoadingRec] = useState(true);
    const [recError, setRecError] = useState("");
    const navigate = useNavigate();
    const studentId = localStorage.getItem("studentId");
  
    useEffect(() => {
      const fetchRecommendation = async () => {
        try {
          // The query instructs the AI to provide a concise study tip, maximum ~70 words.
          const query =
            "Provide a concise, personalized study tip based on my performance data. Limit your response to 70 words.";
          const res = await axios.post(
            "http://127.0.0.1:5000/student-ai-chat",
            {
              student_id: studentId,
              message: query,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          // Trim any leading/trailing whitespace
          setRecommendation(res.data.response.trim());
        } catch (error) {
          console.error("AI Tutor Recommendation error:", error);
          setRecError("Failed to load AI tutor recommendation.");
        } finally {
          setLoadingRec(false);
        }
      };
  
      if (studentId) {
        fetchRecommendation();
      }
    }, [studentId]);
  
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
        <h3 className="text-2xl font-bold text-green-700 mb-3">AI Tutor Recommendations</h3>
        {loadingRec ? (
          <p className="text-gray-500">Loading recommendation...</p>
        ) : recError ? (
          <p className="text-red-500">{recError}</p>
        ) : (
          <p className="text-gray-800 mb-4 whitespace-pre-wrap">{recommendation}</p>
        )}
        <button
          onClick={() => navigate("/student/ai-chat")}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
        >
          More Tips
        </button>
      </div>
    );
  };
  

  // ------------------- Performance Card Component -------------------
  const PerformanceCard = () => {
    if (!performance) return null;
    return (
      <div
        className="bg-white rounded-xl shadow-lg p-6"
        style={{ borderLeft: `10px solid ${performance.color}` }}
      >
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-800">
            {performance.overall.toFixed(1)}%
          </h2>
          <p className="mt-3 text-xl text-gray-600">{performance.message}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
          <div>
            <p className="font-semibold text-gray-700">Avg Grade</p>
            <p>{performance.average_grade.toFixed(1)}%</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Attendance</p>
            <p>{performance.attendance_percent.toFixed(1)}%</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Participation</p>
            <p>{performance.average_participation.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    );
  };

  // ------------------- Notifications Card Component (remains unchanged) -------------------
  const NotificationsCard = () => {
    const navigate = useNavigate();
    const [notifLoading, setNotifLoading] = useState(true);
    const [notifError, setNotifError] = useState("");
    const [notifications, setNotifications] = useState([]);
  
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:5000/student/${studentId}/notifications`);
        setNotifications(response.data);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setNotifError("Failed to load notifications.");
      } finally {
        setNotifLoading(false);
      }
    };
  
    const clearNotifications = async () => {
      try {
        await axios.delete(`http://127.0.0.1:5000/notifications/${studentId}/clear`);
        setNotifications([]);
      } catch (err) {
        console.error("Error clearing notifications:", err);
        setNotifError("Failed to clear notifications.");
      }
    };
  
    useEffect(() => {
      if (studentId) {
        fetchNotifications();
      } else {
        setNotifError("Student ID not found. Please log in.");
        setNotifLoading(false);
      }
    }, [studentId]);
  
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h3 className="text-2xl font-bold text-gray-800">Latest Notifications</h3>
          <button onClick={clearNotifications} className="text-sm text-blue-500 hover:underline">
            Clear 
          </button>
        </div>
        {notifLoading ? (
          <p className="text-center text-gray-500">Loading notifications...</p>
        ) : notifError ? (
          <p className="text-center text-red-500">{notifError}</p>
        ) : notifications.length === 0 ? (
          <p className="text-center text-gray-500">No new notifications.</p>
        ) : (
          <ul className="space-y-4">
            {notifications.map((notif) => (
              <li key={notif.id} className="flex items-center justify-between bg-gray-50 rounded p-3 shadow">
                <div>
                  <p className="text-gray-800">{notif.content}</p>
                  {notif.timestamp && (
                    <p className="text-xs text-gray-500">
                      {new Date(notif.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
                {notif.link && (
                  <button
                    onClick={() => navigate(notif.link)}
                    className="text-blue-600 hover:underline ml-4"
                  >
                    View
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow p-6 mb-8">
        <div className="container mx-auto">
          <h1 className="text-4xl font-extrabold text-gray-800">
            Hello, {studentName}
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Stay updated on your performance and get personalized study tips.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4">
        {loadingPerformance ? (
          <div className="text-center text-gray-700 text-xl">Loading performance data...</div>
        ) : performanceError ? (
          <div className="bg-red-200 text-red-700 p-4 rounded text-center">
            {performanceError}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Performance and AI Tutor Recommendation */}
            <div className="lg:col-span-2 space-y-8">
              <PerformanceCard />
              <AiTutorRecommendation />
            </div>
            {/* Right Column: Notifications */}
            <div className="lg:col-span-1">
              <NotificationsCard />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white shadow mt-10">
        <div className="container mx-auto p-4 text-center text-gray-500">
          &copy; {new Date().getFullYear()} Student Performance & Recommendations
        </div>
      </footer>
    </div>
  );
}

export default StudentDashboard;
