// src/components/TeacherDashboard/MyClasses.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

function MyClasses() {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Expanded class + students
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [studentsInClass, setStudentsInClass] = useState([]);

  // ---------- ADD GRADE Modal State ----------
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [gradeFormData, setGradeFormData] = useState({
    student_id: "",
    subject_id: "",
    exam_type: "Assignment 1",
    score: ""
  });
  const [gradeError, setGradeError] = useState("");
  const [gradeSuccess, setGradeSuccess] = useState("");
  // For disabling the "Save" button if exam type already exists
  const [canAddGrade, setCanAddGrade] = useState(true);

  // ---------- UPDATE GRADE Modal State ----------
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    student_id: "",
    subject_id: "",
    exam_type: "Assignment 1",
    currentScore: "/",
    newScore: ""
  });
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");

  // --------------------------------------------------
  // 1) Fetch classes for the logged-in teacher
  // --------------------------------------------------
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const teacherId = localStorage.getItem("teacherId");
        if (!teacherId) {
          setError("Teacher ID not found. Please log in again.");
          return;
        }
        const res = await axios.get(`http://127.0.0.1:5000/teachers/${teacherId}/classes`);
        setClasses(res.data);
      } catch (err) {
        console.error("Error fetching classes:", err);
        setError("Failed to load classes. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  // --------------------------------------------------
  // Auto-create a new class if the current class is full (>= 20 students)
  // --------------------------------------------------
  const autoCreateClass = async (subjectId) => {
    const teacherId = localStorage.getItem("teacherId");
    try {
      const res = await axios.post("http://127.0.0.1:5000/teachers/create-new-class", {
        teacher_id: teacherId,
        subject_id: subjectId
      });
      console.log("New class created automatically:", res.data);
      // Refresh the classes list to include the new class
      // (you may need to add additional handling on the server side to avoid duplicate creation)
      await refreshClasses();
    } catch (err) {
      console.error("Error auto creating class:", err);
    }
  };

  // Refetch classes – used after auto-creation
  const refreshClasses = async () => {
    try {
      const teacherId = localStorage.getItem("teacherId");
      const res = await axios.get(`http://127.0.0.1:5000/teachers/${teacherId}/classes`);
      setClasses(res.data);
    } catch (err) {
      console.error("Error refreshing classes:", err);
    }
  };

  // --------------------------------------------------
  // 2) Expand/Collapse student list for a class and auto-create new class if full
  // --------------------------------------------------
  const handleViewStudents = async (classId) => {
    try {
      if (expandedClassId === classId) {
        // collapse
        setExpandedClassId(null);
        setStudentsInClass([]);
        return;
      }
      const res = await axios.get(`http://127.0.0.1:5000/classes/${classId}/students`);
      setStudentsInClass(res.data);
      setExpandedClassId(classId);

      // Check if this class is full and is the latest for the subject
      const currentClass = classes.find((c) => c.id === classId);
      if (currentClass) {
        const subjectClasses = classes.filter(
          (c) => c.subject_id === currentClass.subject_id
        );
        const maxClassNumber = Math.max(
          ...subjectClasses.map((c) => c.class_number)
        );
        // Only auto-create if this is the latest class for the subject and it has 20 or more students
        if (currentClass.class_number === maxClassNumber && res.data.length >= 20) {
          autoCreateClass(currentClass.subject_id);
        }
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to load students. Please try again.");
    }
  };

  // --------------------------------------------------
  // 3) "Add Grade" Button and related handling
  // --------------------------------------------------
  const handleAddGradeClick = (subjectId, studentId) => {
    // Reset form & errors
    setGradeFormData({
      student_id: String(studentId),
      subject_id: String(subjectId),
      exam_type: "Assignment 1",
      score: ""
    });
    setGradeError("");
    setGradeSuccess("");
    setCanAddGrade(true);

    // Show modal
    setShowGradeForm(true);
  };

  // (A) On exam type or score change in Add Grade
  const handleGradeChange = async (e) => {
    const { name, value } = e.target;
    const newData = { ...gradeFormData, [name]: value };
    setGradeFormData(newData);

    // If user changed the exam_type or we are re-checking:
    if (name === "exam_type" || name === "student_id" || name === "subject_id") {
      // Quick check if this exam type already exists for this student
      try {
        const res = await axios.get("http://127.0.0.1:5000/grades/existing", {
          params: {
            student_id: newData.student_id,
            subject_id: newData.subject_id,
            exam_type: newData.exam_type
          }
        });
        // If we got 200, that means a grade was found => block add
        setGradeError("This exam type already has a grade. Please use Update Grade.");
        setCanAddGrade(false);
      } catch (err) {
        // If 404 => no grade => we can add
        if (err.response && err.response.status === 404) {
          setGradeError("");
          setCanAddGrade(true);
        } else {
          console.error("Error checking existing grade:", err);
          setGradeError("Failed to check existing grade. Please try again.");
          setCanAddGrade(false);
        }
      }
    }
  };

  // (B) Submit "Add Grade"
  const submitGrade = async (e) => {
    e.preventDefault();
    if (!canAddGrade) {
      return;
    }
    const numScore = parseFloat(gradeFormData.score);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      setGradeError("Score must be a number between 0 and 100.");
      return;
    }
    try {
      await axios.post("http://127.0.0.1:5000/grades", {
        student_id: gradeFormData.student_id,
        subject_id: gradeFormData.subject_id,
        exam_type: gradeFormData.exam_type,
        score: numScore
      });
      setGradeSuccess("Grade added successfully!");
      setShowGradeForm(false);
    } catch (err) {
      console.error("Error adding grade:", err);
      setGradeError("This grade already exists. Please use the grade update option to modify it.");
    }
  };

  // --------------------------------------------------
  // 4) "Update Grade" Button and related handling
  // --------------------------------------------------
  const handleUpdateGradeClick = async (subjectId, studentId) => {
    setUpdateError("");
    setUpdateSuccess("");

    // We'll default exam_type to "Assignment 1" initially
    const defaultExamType = "Assignment 1";

    // Try fetching the existing grade
    try {
      const res = await axios.get("http://127.0.0.1:5000/grades/existing", {
        params: {
          student_id: studentId,
          subject_id: subjectId,
          exam_type: defaultExamType
        }
      });
      // If found:
      setUpdateFormData({
        student_id: String(res.data.student_id),
        subject_id: String(res.data.subject_id),
        exam_type: res.data.exam_type,
        currentScore: String(res.data.score),
        newScore: ""
      });
    } catch (err) {
      // If 404 => no grade => show "/"
      if (err.response && err.response.status === 404) {
        setUpdateError("No existing grade for that exam type. You can set a new one here.");
        setUpdateFormData({
          student_id: String(studentId),
          subject_id: String(subjectId),
          exam_type: defaultExamType,
          currentScore: "/",
          newScore: ""
        });
      } else {
        console.error("Error fetching existing grade:", err);
        setUpdateError("Failed to fetch existing grade. Try again or pick a different exam type.");
        setUpdateFormData({
          student_id: String(studentId),
          subject_id: String(subjectId),
          exam_type: defaultExamType,
          currentScore: "/",
          newScore: ""
        });
      }
    }

    setShowUpdateForm(true);
  };

  // (A) On exam type change in "Update Grade" modal
  const handleUpdateExamTypeChange = async (e) => {
    const newExamType = e.target.value;
    setUpdateError("");
    setUpdateSuccess("");

    // We'll fetch existing grade for the new exam type
    try {
      const res = await axios.get("http://127.0.0.1:5000/grades/existing", {
        params: {
          student_id: updateFormData.student_id,
          subject_id: updateFormData.subject_id,
          exam_type: newExamType
        }
      });
      // If found
      setUpdateFormData((prev) => ({
        ...prev,
        exam_type: newExamType,
        currentScore: String(res.data.score),
        newScore: ""
      }));
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Not found
        setUpdateFormData((prev) => ({
          ...prev,
          exam_type: newExamType,
          currentScore: "/",
          newScore: ""
        }));
        setUpdateError("No existing grade for this exam type. (You can set a new one here.)");
      } else {
        console.error("Error fetching existing grade:", err);
        setUpdateError("Failed to fetch existing grade for that exam type.");
      }
    }
  };

  // (B) On newScore change in "Update Grade"
  const handleUpdateNewScoreChange = (e) => {
    setUpdateFormData((prev) => ({ ...prev, newScore: e.target.value }));
  };

  // (C) Submit "Update Grade"
  const submitUpdateGrade = async (e) => {
    e.preventDefault();
    const numScore = parseFloat(updateFormData.newScore);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      setUpdateError("Score must be between 0 and 100.");
      return;
    }
    try {
      await axios.put("http://127.0.0.1:5000/grades", {
        student_id: updateFormData.student_id,
        subject_id: updateFormData.subject_id,
        exam_type: updateFormData.exam_type,
        score: numScore
      });
      setUpdateSuccess("Grade updated successfully!");
      setShowUpdateForm(false);
    } catch (err) {
      console.error("Error updating grade:", err);
      setUpdateError("Failed to update grade. Please try again.");
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  if (loading) {
    return <p>Loading classes...</p>;
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">My Classes</h2>

      {error && (
        <div className="bg-red-200 text-red-800 p-2 mb-4 rounded">
          {error}
        </div>
      )}

      {classes.length === 0 ? (
        <p>No classes found.</p>
      ) : (
        <ul className="space-y-4">
          {classes.map((cls) => (
            <li key={cls.id} className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{cls.subject_name}</p>
                  <p className="text-sm text-gray-600">
                    Class #{cls.class_number} | Created on {cls.created_at}
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => handleViewStudents(cls.id)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    {expandedClassId === cls.id ? "Hide Students" : "View Students"}
                  </button>
                </div>
              </div>

              {expandedClassId === cls.id && (
                <div className="mt-4 bg-gray-50 p-4 rounded">
                  {studentsInClass.length === 0 ? (
                    <p>No students found in this class.</p>
                  ) : (
                    studentsInClass.map((student) => (
                      <div
                        key={student.student_id}
                        className="flex justify-between items-center border-b py-2"
                      >
                        <div>
                          <p className="font-semibold">{student.student_name}</p>
                          <p className="text-sm text-gray-600">
                            {student.student_email}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <button
                            onClick={() =>
                              handleAddGradeClick(cls.subject_id, student.student_id)
                            }
                            className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                          >
                            Add Grade
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateGradeClick(cls.subject_id, student.student_id)
                            }
                            className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                          >
                            Update Grade
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* =============== ADD GRADE MODAL =============== */}
      {showGradeForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-md w-80">
            <h3 className="text-xl font-bold mb-4">Add Grade</h3>
            {gradeError && (
              <div className="bg-red-200 text-red-800 p-2 mb-2 rounded">
                {gradeError}
              </div>
            )}
            {gradeSuccess && (
              <div className="bg-green-200 text-green-800 p-2 mb-2 rounded">
                {gradeSuccess}
              </div>
            )}
            <form onSubmit={submitGrade}>
              <div className="mb-4">
                <label className="block font-semibold">Exam Type</label>
                <select
                  name="exam_type"
                  value={gradeFormData.exam_type}
                  onChange={handleGradeChange}
                  className="border p-2 w-full"
                >
                  <option value="Assignment 1">Assignment 1</option>
                  <option value="Assignment 2">Assignment 2</option>
                  <option value="Quiz 1">Quiz 1</option>
                  <option value="Quiz 2">Quiz 2</option>
                  <option value="Exam 1">Exam 1</option>
                  <option value="Exam 2">Exam 2</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block font-semibold">Score</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  name="score"
                  value={gradeFormData.score}
                  onChange={handleGradeChange}
                  className="border p-2 w-full"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowGradeForm(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ${
                    !canAddGrade ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={!canAddGrade}
                >
                  Save Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============== UPDATE GRADE MODAL =============== */}
      {showUpdateForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-md w-80">
            <h3 className="text-xl font-bold mb-4">Update Grade</h3>
            {updateError && (
              <div className="bg-red-200 text-red-800 p-2 mb-2 rounded">
                {updateError}
              </div>
            )}
            {updateSuccess && (
              <div className="bg-green-200 text-green-800 p-2 mb-2 rounded">
                {updateSuccess}
              </div>
            )}
            <form onSubmit={submitUpdateGrade}>
              <div className="mb-4">
                <label className="block font-semibold">Exam Type</label>
                <select
                  name="exam_type"
                  value={updateFormData.exam_type}
                  onChange={handleUpdateExamTypeChange}
                  className="border p-2 w-full"
                >
                  <option value="Assignment 1">Assignment 1</option>
                  <option value="Assignment 2">Assignment 2</option>
                  <option value="Quiz 1">Quiz 1</option>
                  <option value="Quiz 2">Quiz 2</option>
                  <option value="Exam 1">Exam 1</option>
                  <option value="Exam 2">Exam 2</option>
                </select>
              </div>

              {/* Current Score read-only */}
              <div className="mb-4">
                <label className="block font-semibold">Current Score</label>
                <input
                  type="text"
                  className="border p-2 w-full bg-gray-100"
                  value={updateFormData.currentScore}
                  readOnly
                />
              </div>

              {/* New Score to be updated */}
              <div className="mb-4">
                <label className="block font-semibold">New Score</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  name="newScore"
                  value={updateFormData.newScore}
                  onChange={handleUpdateNewScoreChange}
                  className="border p-2 w-full"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUpdateForm(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyClasses;
