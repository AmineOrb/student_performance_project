import React, { useState, useEffect } from "react";
import axios from "axios";

function AddParticipation() {
  // States for classes, week, students, and participation scores.
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [weekNumber, setWeekNumber] = useState(""); // teacher types the week number
  const [students, setStudents] = useState([]);
  const [participationRecords, setParticipationRecords] = useState({});

  // Feedback messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Loading and saving flags
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Confirmation modal for duplicates
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [duplicateRecords, setDuplicateRecords] = useState([]);

  // Teacher ID from localStorage
  const teacherId = localStorage.getItem("teacherId");

  // ------------------ 1) Fetch Teacher's Classes on Mount ------------------
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:5000/teachers/${teacherId}/classes`);
        setClasses(res.data);
      } catch (err) {
        console.error("Error fetching classes:", err);
        setError("Failed to load classes. Please try again later.");
      } finally {
        setLoadingClasses(false);
      }
    };
    if (teacherId) {
      fetchClasses();
    }
  }, [teacherId]);

  // ------------------ 2) Fetch Students When a Class is Selected ------------------
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) return;
      setLoadingStudents(true);
      setError("");
      setSuccess("");
      try {
        const res = await axios.get(`http://127.0.0.1:5000/classes/${selectedClass}/students`);
        setStudents(res.data);
        // Initialize participationRecords: set empty string for each student
        const initialRecords = {};
        res.data.forEach((stud) => {
          initialRecords[stud.student_id] = "";
        });
        setParticipationRecords(initialRecords);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to load students. Please try again.");
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  // ------------------ 3) Handler for Changing Participation Score ------------------
  const handleParticipationChange = (studentId, score) => {
    setParticipationRecords((prev) => ({
      ...prev,
      [studentId]: score,
    }));
  };

  // ------------------ 4) Save Participation to Backend ------------------
  const saveParticipation = async (forceUpdate = false) => {
    setError("");
    setSuccess("");

    // Validate class and week number
    if (!selectedClass) {
      setError("Please select a class.");
      return;
    }
    if (!weekNumber) {
      setError("Please enter the week number.");
      return;
    }
    const week = parseInt(weekNumber);
    if (isNaN(week) || week < 1) {
      setError("Week number must be an integer greater than or equal to 1.");
      return;
    }

    // Build participation records array (only include entries with a score)
    const records = Object.entries(participationRecords)
      .map(([studentId, score]) => {
        const numScore = parseFloat(score);
        return {
          student_id: parseInt(studentId),
          participation_score: numScore,
        };
      })
      .filter((rec) => rec.participation_score !== "" && !isNaN(rec.participation_score));

    // Validate each score is between 0 and 10
    for (let rec of records) {
      if (rec.participation_score < 0 || rec.participation_score > 10) {
        setError("Each participation score must be between 0 and 10.");
        return;
      }
    }

    if (records.length === 0) {
      setError("No participation scores entered. Please enter scores for at least one student.");
      return;
    }

    setSaving(true);
    try {
      const res = await axios.post("http://127.0.0.1:5000/participation", {
        class_id: selectedClass,
        teacher_id: teacherId,
        week_number: week,
        records: records,
        force_update: forceUpdate, // false by default; true when teacher confirms update
      });
      setSuccess(res.data.message);
      // Reset participation records after a successful save
      const resetRecords = {};
      students.forEach((stud) => {
        resetRecords[stud.student_id] = "";
      });
      setParticipationRecords(resetRecords);
    } catch (err) {
      // If duplicates are found, the backend should return a 400 with a duplicates field.
      if (err.response && err.response.status === 400 && err.response.data.duplicates) {
        setDuplicateRecords(err.response.data.duplicates);
        setShowConfirmModal(true);
      } else {
        const msg = err.response?.data?.error || "Failed to save participation. Please try again.";
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Handler for confirming update of duplicate participation records
  const handleConfirmUpdate = () => {
    setShowConfirmModal(false);
    saveParticipation(true);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Add Participation</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Class Selector */}
      <div className="mb-6">
        <label className="block font-semibold mb-2">Select a Class:</label>
        <select
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            setError("");
            setSuccess("");
          }}
          className="border p-2 rounded w-full max-w-md"
          disabled={loadingStudents}
        >
          <option value="">-- Select a Class --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.subject_name} - Class #{cls.class_number}
            </option>
          ))}
        </select>
      </div>

      {/* Week Number Input */}
      <div className="mb-6">
        <label className="block font-semibold mb-2">Enter Week Number:</label>
        <input
          type="number"
          min="1"
          placeholder="Week number (e.g., 1)"
          value={weekNumber}
          onChange={(e) => setWeekNumber(e.target.value)}
          className="border p-2 rounded w-full max-w-md"
        />
      </div>

      {/* Student List with Participation Score Input */}
      {loadingStudents ? (
        <div className="flex justify-center items-center h-32">
          <p>Loading students...</p>
        </div>
      ) : selectedClass && (
        <div>
          <h3 className="text-xl font-bold mb-4">Students in Selected Class (Week {weekNumber})</h3>
          {students.length === 0 ? (
            <p>No students found in this class.</p>
          ) : (
            <ul className="space-y-3 mb-6">
              {students.map((stu) => (
                <li key={stu.student_id} className="flex justify-between items-center p-3 border rounded bg-white shadow-sm">
                  <div>
                    <p className="font-semibold">{stu.student_name}</p>
                    <p className="text-sm text-gray-600">{stu.student_email}</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      placeholder="Score (0-10)"
                      value={participationRecords[stu.student_id] || ""}
                      onChange={(e) => handleParticipationChange(stu.student_id, e.target.value)}
                      className="border p-2 rounded w-32"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => saveParticipation(false)}
            disabled={saving || Object.values(participationRecords).filter((v) => v !== "").length === 0 || !weekNumber}
            className={`mt-4 px-4 py-2 rounded text-white ${saving ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"} transition-colors`}
          >
            {saving ? "Saving..." : "Save Participation"}
          </button>
        </div>
      )}

      {/* Confirmation Modal for Duplicate Participation Records */}
      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-md w-80">
            <h3 className="text-xl font-bold mb-4">Duplicate Participation Found</h3>
            <p className="mb-2">
              Participation for week {weekNumber} already exists for the following students:
            </p>
            <ul className="mb-4">
              {duplicateRecords.map((dup, idx) => (
                <li key={idx} className="text-sm">
                  {dup.student_name} — Existing Score: {dup.existing_score}
                </li>
              ))}
            </ul>
            <p className="mb-4">
              Do you want to update these existing records with your new values?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpdate}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddParticipation;
