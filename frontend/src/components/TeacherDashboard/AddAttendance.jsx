import React, { useState, useEffect } from "react";
import axios from "axios";

function AddAttendance() {
  // State for teacher's classes
  const [classes, setClasses] = useState([]);
  // Which class is selected
  const [selectedClass, setSelectedClass] = useState("");
  // Students in the selected class
  const [students, setStudents] = useState([]);
  // Attendance status per student: { [student_id]: "Present"/"Absent"/"Late" }
  const [attendanceRecords, setAttendanceRecords] = useState({});

  // Feedback messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Loading flags
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Logged-in teacher ID (from localStorage)
  const teacherId = localStorage.getItem("teacherId");

  // ------------------ 1) Fetch Classes on Mount ------------------
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
    } else {
      setError("Teacher ID not found. Please log in again.");
      setLoadingClasses(false);
    }
  }, [teacherId]);

  // ------------------ 2) Fetch Students When a Class is Selected ------------------
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) return; // no class chosen yet
      
      setLoadingStudents(true);
      setError("");
      setSuccess("");
      
      try {
        const res = await axios.get(`http://127.0.0.1:5000/classes/${selectedClass}/students`);
        setStudents(res.data);

        // Initialize an empty attendance status for each student
        const initialRecords = {};
        res.data.forEach((stud) => {
          initialRecords[stud.student_id] = ""; // no status yet
        });
        setAttendanceRecords(initialRecords);

      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to load students. Please try again.");
      } finally {
        setLoadingStudents(false);
      }
    };
    
    fetchStudents();
  }, [selectedClass]);

  // ------------------ 3) Handler for Clicking "Present", "Absent", "Late" ------------------
  const handleAttendanceSelect = (studentId, status) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // ------------------ 4) Save Attendance to Backend ------------------
  const saveAttendance = async () => {
    // Reset messages
    setError("");
    setSuccess("");

    if (!selectedClass) {
      setError("Please select a class first.");
      return;
    }

    // Build array of only the students who have a chosen status
    const records = Object.entries(attendanceRecords)
      .map(([studentId, status]) => ({
        student_id: parseInt(studentId),
        status: status,
      }))
      .filter((rec) => rec.status !== "");

    if (records.length === 0) {
      setError("No attendance status selected. Please mark at least one student.");
      return;
    }

    setSaving(true);
    
    try {
      const response = await axios.post("http://127.0.0.1:5000/attendance", {
        class_id: selectedClass,
        teacher_id: teacherId,
        records: records,
      });

      if (response.status === 201) {
        setSuccess("Attendance saved successfully!");
        // Clear selections after successful save
        const resetRecords = {};
        students.forEach((stud) => {
          resetRecords[stud.student_id] = "";
        });
        setAttendanceRecords(resetRecords);
      }
    } catch (err) {
      console.error("Error saving attendance:", err);
      
      let errorMessage = "Failed to save attendance. Please try again.";
      if (err.response) {
        // Server responded with an error status code
        errorMessage = err.response.data?.error || errorMessage;
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = "Network error. Please check your connection.";
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // ------------------ Render ------------------
  if (loadingClasses) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Add Attendance</h2>
        <div className="flex justify-center items-center h-32">
          <p>Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Add Attendance</h2>

      {/* Error/Success Messages */}
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

      {/* Student List + Attendance Buttons */}
      {loadingStudents ? (
        <div className="flex justify-center items-center h-32">
          <p>Loading students...</p>
        </div>
      ) : selectedClass && (
        <div>
          <h3 className="text-xl font-bold mb-4">Students in Selected Class</h3>
          
          {students.length === 0 ? (
            <p>No students found in this class.</p>
          ) : (
            <>
              <ul className="space-y-3 mb-6">
                {students.map((stu) => (
                  <li
                    key={stu.student_id}
                    className="flex justify-between items-center p-3 border rounded bg-white shadow-sm"
                  >
                    <div>
                      <p className="font-semibold">{stu.student_name}</p>
                      <p className="text-sm text-gray-600">{stu.student_email}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAttendanceSelect(stu.student_id, "Present")}
                        className={`px-3 py-1 rounded transition-colors ${
                          attendanceRecords[stu.student_id] === "Present"
                            ? "bg-green-500 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                        disabled={saving}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleAttendanceSelect(stu.student_id, "Absent")}
                        className={`px-3 py-1 rounded transition-colors ${
                          attendanceRecords[stu.student_id] === "Absent"
                            ? "bg-red-500 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                        disabled={saving}
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => handleAttendanceSelect(stu.student_id, "Late")}
                        className={`px-3 py-1 rounded transition-colors ${
                          attendanceRecords[stu.student_id] === "Late"
                            ? "bg-yellow-500 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                        disabled={saving}
                      >
                        Late
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Save Button */}
              <button
                onClick={saveAttendance}
                disabled={saving || Object.values(attendanceRecords).filter(v => v !== "").length === 0}
                className={`mt-4 px-4 py-2 rounded text-white ${
                  saving ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'
                } transition-colors`}
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AddAttendance;