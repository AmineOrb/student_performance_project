import React, { useState, useEffect } from "react";
import axios from "axios";

function MyHomework() {
  const [homeworks, setHomeworks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Get the student's ID from localStorage (set during login)
  const studentId = localStorage.getItem("studentId");

  useEffect(() => {
    const fetchHomeworks = async () => {
      try {
        // Now this endpoint returns only homework for the student's enrolled classes
        const res = await axios.get(`http://127.0.0.1:5000/student/${studentId}/homeworks`);
        setHomeworks(res.data);
      } catch (err) {
        console.error("Error fetching homework assignments:", err);
        setError("Failed to load homework assignments.");
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchHomeworks();
    } else {
      setError("Student ID not found. Please log in.");
      setLoading(false);
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg">Loading homework assignments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-500 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-center mb-8">My Homework</h2>
      {homeworks.length === 0 ? (
        <p className="text-center">No homework assignments available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {homeworks.map((hw) => (
            <div key={hw.id} className="bg-white rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col">
              <div className="p-6 border-b">
                <h3 className="text-2xl font-semibold text-gray-800">{hw.title}</h3>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-full mr-2">
                    {hw.subject_name}
                  </span>
                  <span>by {hw.teacher_name || "Unknown"}</span>
                </div>
                <p className="text-xs mt-1 text-gray-400">
                  {new Date(hw.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="p-6 flex-1">
                <p className="text-gray-700">{hw.description}</p>
              </div>
              {hw.file_path && (
                <div className="p-6 border-t">
                  <a
                    href={hw.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    Download Attachment
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyHomework;
