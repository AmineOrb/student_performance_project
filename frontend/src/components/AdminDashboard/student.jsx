// src/components/AdminDashboard/student.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

function Student() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [searchText, setSearchText] = useState("");

  // For adding a new student
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    password: "",
    subject1: "",
    subject2: "",
    subject3: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // For editing an existing student
  const [editingStudent, setEditingStudent] = useState(null);

  // Fetch global subjects and students on mount
  useEffect(() => {
    fetchSubjects();
    fetchStudents();
  }, []);

  const fetchSubjects = () => {
    axios
      .get("http://127.0.0.1:5000/subjects")
      .then((res) => setSubjects(res.data))
      .catch((err) => console.error("Error fetching subjects:", err));
  };

  // UPDATED fetchStudents: For each student, fetch his/her subjects and append subject names
  const fetchStudents = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/students");
      const studentList = res.data;
      const studentsWithSubjects = await Promise.all(
        studentList.map(async (student) => {
          try {
            const subRes = await axios.get(`http://127.0.0.1:5000/student/${student.id}/subjects`);
            student.subjects = subRes.data.map((subj) => subj.name);
          } catch (err) {
            console.error(`Error fetching subjects for student ${student.id}:`, err);
            student.subjects = [];
          }
          return student;
        })
      );
      setStudents(studentsWithSubjects);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewStudent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const chosenSubjects = [
      newStudent.subject1,
      newStudent.subject2,
      newStudent.subject3,
    ].filter(Boolean);

    if (chosenSubjects.length !== 3) {
      setError("Please select exactly 3 subjects.");
      return;
    }

    const payload = {
      name: newStudent.name,
      email: newStudent.email,
      password: newStudent.password,
      subjects: chosenSubjects,
    };

    axios
      .post("http://127.0.0.1:5000/admin/add-student", payload)
      .then((res) => {
        setSuccess("Student added successfully!");
        fetchStudents();
        setNewStudent({
          name: "",
          email: "",
          password: "",
          subject1: "",
          subject2: "",
          subject3: ""
        });
      })
      .catch((err) => {
        console.error("Error adding student:", err);
        setError("Failed to add student.");
      });
  };

  const handleDeleteStudent = (studentId) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      axios
        .delete(`http://127.0.0.1:5000/admin/delete-student/${studentId}`)
        .then(() => {
          fetchStudents();
        })
        .catch((err) => {
          console.error("Error deleting student:", err);
        });
    }
  };

  const handleEditClick = (student) => {
    // Edit only name, email, and password
    setEditingStudent({
      id: student.id,
      name: student.name,
      email: student.email,
      password: "",
    });
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingStudent((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateStudent = (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    const payload = {
      name: editingStudent.name,
      email: editingStudent.email,
      password: editingStudent.password,
      subjects: []  // Do not update subjects during edit
    };

    axios
      .put(`http://127.0.0.1:5000/admin/update-student/${editingStudent.id}`, payload)
      .then(() => {
        setEditingStudent(null);
        fetchStudents();
      })
      .catch((err) => {
        console.error("Error updating student:", err);
      });
  };

  // Filter students based on search criteria (by name, email, or subject)
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchText.toLowerCase()) ||
      s.email.toLowerCase().includes(searchText.toLowerCase()) ||
      (s.subjects &&
        s.subjects.some((subject) =>
          subject.toLowerCase().includes(searchText.toLowerCase())
        ))
  );

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-4">Manage Students</h2>

      {/* ADD STUDENT FORM */}
      <form onSubmit={handleSubmit} className="mb-8 border p-4 rounded bg-white shadow">
        <div className="mb-4">
          <label className="block font-semibold mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={newStudent.name}
            onChange={handleChange}
            className="border p-2 w-full"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={newStudent.email}
            onChange={handleChange}
            className="border p-2 w-full"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={newStudent.password}
            onChange={handleChange}
            className="border p-2 w-full"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1">Subject 1</label>
          <select
            name="subject1"
            value={newStudent.subject1}
            onChange={handleChange}
            className="border p-2 w-full"
          >
            <option value="">-- Select Subject --</option>
            {subjects.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1">Subject 2</label>
          <select
            name="subject2"
            value={newStudent.subject2}
            onChange={handleChange}
            className="border p-2 w-full"
          >
            <option value="">-- Select Subject --</option>
            {subjects.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1">Subject 3</label>
          <select
            name="subject3"
            value={newStudent.subject3}
            onChange={handleChange}
            className="border p-2 w-full"
          >
            <option value="">-- Select Subject --</option>
            {subjects.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        {success && <p className="text-green-500 mb-2">{success}</p>}
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Add Student
        </button>
      </form>

      {/* HEADER ROW FOR CURRENT STUDENTS AND SEARCH */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">Current Students</h3>
        <input
          type="text"
          placeholder="Search by name, email or subject..."
          className="border p-3 rounded w-1/3"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* DISPLAY EXISTING STUDENTS */}
      <div className="space-y-2">
        {filteredStudents.length === 0 ? (
          <p className="text-gray-500">No matching students found.</p>
        ) : (
          filteredStudents.map((s) => {
            if (editingStudent && editingStudent.id === s.id) {
              return (
                <div key={s.id} className="bg-white p-4 rounded shadow">
                  <form onSubmit={handleUpdateStudent}>
                    <div className="mb-2">
                      <label className="block font-semibold mb-1">Name</label>
                      <input
                        type="text"
                        name="name"
                        value={editingStudent.name}
                        onChange={handleEditChange}
                        className="border p-2 w-full"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="block font-semibold mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={editingStudent.email}
                        onChange={handleEditChange}
                        className="border p-2 w-full"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="block font-semibold mb-1">New Password (optional)</label>
                      <input
                        type="password"
                        name="password"
                        value={editingStudent.password}
                        onChange={handleEditChange}
                        className="border p-2 w-full"
                      />
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <button type="submit" className="bg-green-500 text-white px-3 py-1 rounded">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="bg-gray-400 text-white px-3 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              );
            } else {
              return (
                <div key={s.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p>{s.email}</p>
                    <p className="text-sm text-gray-600">
                      Subjects:{" "}
                      {s.subjects && s.subjects.length > 0 ? s.subjects.join(", ") : "None"}
                    </p>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleEditClick(s)}
                      className="bg-yellow-400 text-white px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(s.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>
    </div>
  );
}

export default Student;
