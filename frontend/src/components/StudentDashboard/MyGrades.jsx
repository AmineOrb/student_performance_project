import React, { useState, useEffect } from "react";
import axios from "axios";

function MyGrades() {
  // State variables
  const [overview, setOverview] = useState(null); // Will hold avgAttendance, avgParticipation
  const [subjects, setSubjects] = useState([]);     // List of subjects with examRecords arrays
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);

  // Get the student ID from localStorage (set during login)
  const studentId = localStorage.getItem("studentId");

  // Fetch the grades overview from the backend
  useEffect(() => {
    async function fetchOverview() {
      try {
        // Replace this URL with the one you have configured in your Flask app.
        const res = await axios.get(`http://127.0.0.1:5000/student/${studentId}/grades-overview`);
        
        // Expect the response to have keys: avgAttendance, avgParticipation, subjects
        setOverview({
          avgAttendance: res.data.avgAttendance,
          avgParticipation: res.data.avgParticipation
        });
        setSubjects(res.data.subjects || []);
      } catch (err) {
        console.error("Error fetching grade overview:", err);
        setError("Failed to load subjects and grades.");
      } finally {
        setLoading(false);
      }
    }
    if (studentId) {
      fetchOverview();
    } else {
      setError("Student ID not found in localStorage.");
      setLoading(false);
    }
  }, [studentId]);

  // Function to toggle the subject's exam records view
  const toggleSubject = (subjectId) => {
    setExpandedSubjectId((prevId) => (prevId === subjectId ? null : subjectId));
  };

  // Helper function: Return a color class based on a percentage value
  const getColorForPercentage = (value) => {
    if (value < 40) return "text-red-600";
    if (value < 60) return "text-orange-500";
    if (value < 80) return "text-yellow-500";
    return "text-green-600";
  };

  // Render the exam records for a subject
  const renderExamRecords = (examRecords) => {
    if (!examRecords || examRecords.length === 0) {
      return <p className="text-sm text-gray-600">No exam records found for this subject.</p>;
    }
    return (
      <ul className="space-y-2 mt-2">
        {examRecords.map((record, idx) => (
          <li key={idx} className="border-b pb-2">
            <span className="font-semibold">Type:</span> {record.exam_type} <br />
            <span className="font-semibold">Score:</span> {record.score !== null ? record.score : "/"}
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">
        Loading grade overview...
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">My Grades</h2>
      
      {error && (
        <div className="mb-6 p-4 bg-red-200 text-red-800 rounded text-center">
          {error}
        </div>
      )}

      {/* Average Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <h3 className="font-bold text-xl text-gray-700 mb-2">Average Attendance</h3>
            <p className={`${getColorForPercentage(overview.avgAttendance)} text-3xl font-bold`}>
              {overview.avgAttendance.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <h3 className="font-bold text-xl text-gray-700 mb-2">Average Participation</h3>
            <p className={`${getColorForPercentage(overview.avgParticipation)} text-3xl font-bold`}>
              {overview.avgParticipation.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Subject List with Exam Records */}
      {subjects.length === 0 ? (
        <p className="text-center text-gray-600">No subjects found.</p>
      ) : (
        <ul className="space-y-6">
          {subjects.map((subj) => (
            <li key={subj.subject_id} className="bg-white shadow-md rounded-lg p-6">
              <div className="flex justify-between items-center">
                <p className="text-2xl font-bold text-gray-800">{subj.subject_name}</p>
                <button
                  onClick={() => toggleSubject(subj.subject_id)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded"
                >
                  {expandedSubjectId === subj.subject_id ? "Hide Grades" : "View Grades"}
                </button>
              </div>
              {expandedSubjectId === subj.subject_id && (
                <div className="mt-4 bg-gray-50 rounded p-4">
                  {renderExamRecords(subj.examRecords)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyGrades;
