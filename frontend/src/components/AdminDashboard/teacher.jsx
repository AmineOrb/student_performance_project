// src/components/AdminDashboard/teacher.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

function Teacher() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    subject_id: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch teachers and subjects on component mount
  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
  }, []);

  const fetchTeachers = () => {
    axios.get("http://127.0.0.1:5000/teachers")
      .then((res) => setTeachers(res.data))
      .catch((err) => console.error("Error fetching teachers:", err));
  };

  const fetchSubjects = () => {
    axios.get("http://127.0.0.1:5000/subjects")
      .then((res) => setSubjects(res.data))
      .catch((err) => console.error("Error fetching subjects:", err));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.subject_id) {
      setError("Please select a subject for this teacher.");
      return;
    }

    axios.post("http://127.0.0.1:5000/admin/add-teacher", formData)
      .then((res) => {
        setSuccess("Teacher added successfully!");
        fetchTeachers();
        setFormData({
          name: "",
          email: "",
          password: "",
          subject_id: ""
        });
      })
      .catch((err) => {
        console.error("Error adding teacher:", err);
        setError("Failed to add teacher. Check console for details.");
      });
  };

  // Delete teacher with confirmation
  const handleDeleteTeacher = (teacherId) => {
    if (window.confirm("Are you sure you want to delete this teacher?")) {
      axios.delete(`http://127.0.0.1:5000/admin/delete-teacher/${teacherId}`)
        .then((res) => {
          fetchTeachers();
        })
        .catch((err) => {
          console.error("Error deleting teacher:", err);
        });
    }
  };

  const handleEditClick = (teacher) => {
    setEditingTeacher({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      password: "",
      subject_id: teacher.subject_id || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingTeacher(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingTeacher((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateTeacher = (e) => {
    e.preventDefault();
    if (!editingTeacher) return;

    axios.put(`http://127.0.0.1:5000/admin/update-teacher/${editingTeacher.id}`, editingTeacher)
      .then((res) => {
        console.log("Teacher updated:", res.data);
        setEditingTeacher(null);
        fetchTeachers();
      })
      .catch((err) => {
        console.error("Error updating teacher:", err);
      });
  };

  // Helper to get subject name from subjects array using subject_id
  const getSubjectName = (subject_id) => {
    const subject = subjects.find((sub) => sub.id === subject_id);
    return subject ? subject.name : "No Subject Assigned";
  };

  // --- New: Search functionality ---
  // Filter the teacher list based on the searchQuery
  const filteredTeachers = teachers.filter((teacher) => {
    const subjectName = getSubjectName(teacher.subject_id);
    const query = searchQuery.toLowerCase();
    return (
      teacher.name.toLowerCase().includes(query) ||
      teacher.email.toLowerCase().includes(query) ||
      subjectName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-4">Manage Teachers</h2>

      {/* Add Teacher Form */}
      <form onSubmit={handleSubmit} className="mb-8 border p-4 rounded bg-white shadow">
        <div className="mb-4">
          <label className="block font-semibold mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
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
            value={formData.email}
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
            value={formData.password}
            onChange={handleChange}
            className="border p-2 w-full"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1">Subject</label>
          <select
            name="subject_id"
            value={formData.subject_id}
            onChange={handleChange}
            className="border p-2 w-full"
          >
            <option value="">-- Select a Subject --</option>
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
          Add Teacher
        </button>
      </form>

      {/* Search and List of Existing Teachers */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Current Teachers</h3>
        <input
          type="text"
          placeholder="Search by name, email, or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border p-2 rounded w-full max-w-xs"
        />
      </div>

      <div className="space-y-2">
        {filteredTeachers.map((t) => {
          if (editingTeacher && editingTeacher.id === t.id) {
            return (
              <div key={t.id} className="bg-white p-4 rounded shadow">
                <form onSubmit={handleUpdateTeacher}>
                  <div className="mb-2">
                    <label className="block font-semibold mb-1">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={editingTeacher.name}
                      onChange={handleEditChange}
                      className="border p-2 w-full"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editingTeacher.email}
                      onChange={handleEditChange}
                      className="border p-2 w-full"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block font-semibold mb-1">New Password (optional)</label>
                    <input
                      type="password"
                      name="password"
                      value={editingTeacher.password}
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
              <div key={t.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p>{t.email}</p>
                  <p className="text-sm text-gray-600">
                    Subject: {getSubjectName(t.subject_id)}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleEditClick(t)}
                    className="bg-yellow-400 text-white px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTeacher(t.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}

export default Teacher;
