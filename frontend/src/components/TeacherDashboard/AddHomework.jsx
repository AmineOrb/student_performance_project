import React, { useState, useEffect } from "react";
import axios from "axios";

function AddHomework() {
  const teacherId = localStorage.getItem("teacherId");

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [filePath, setFilePath] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Homework list for the selected class
  const [homeworks, setHomeworks] = useState([]);
  const [loadingHW, setLoadingHW] = useState(false);
  const [hwError, setHWError] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:5000/teachers/${teacherId}/classes`);
        setClasses(response.data);
      } catch (err) {
        console.error("Error fetching classes:", err);
        setError("Failed to load classes.");
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [teacherId]);

  // When a user selects a class, fetch the homework for that class
  const handleClassChange = async (e) => {
    const clsId = e.target.value;
    setSelectedClass(clsId);
    setError("");
    setSuccess("");

    // If no class selected, clear homework list.
    if (!clsId) {
      setHomeworks([]);
      return;
    }

    try {
      setLoadingHW(true);
      setHWError("");
      // Changed endpoint from /teacher/${teacherId}/homeworks to /homework?class_id={clsId}
      const res = await axios.get(`http://127.0.0.1:5000/homework`, {
        params: {
          class_id: clsId,
        },
      });
      setHomeworks(res.data);
    } catch (err) {
      console.error("Error fetching homeworks:", err);
      setHWError("Failed to load homework assignments.");
      setHomeworks([]);
    } finally {
      setLoadingHW(false);
    }
  };

  const handleSubmitHomework = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedClass) {
      setError("Please select a class.");
      return;
    }
    if (!title) {
      setError("Title is required.");
      return;
    }

    try {
      const payload = {
        teacher_id: teacherId,
        class_id: selectedClass,
        title,
        description,
        file_path: filePath,
      };
      await axios.post("http://127.0.0.1:5000/homework", payload);
      setSuccess("Homework posted successfully!");

      // Clear form fields
      setTitle("");
      setDescription("");
      setFilePath("");

      // Refresh the homework list for the selected class
      handleClassChange({ target: { value: selectedClass } });
    } catch (err) {
      console.error("Error posting homework:", err);
      setError("Failed to post homework. Please try again.");
    }
  };

  // Delete a homework item
  const handleDeleteHW = async (hwId) => {
    if (!window.confirm("Are you sure you want to delete this homework?")) return;
    try {
      await axios.delete(`http://127.0.0.1:5000/homework/${hwId}`);
      // Remove the deleted homework from the state
      setHomeworks((prev) => prev.filter((hw) => hw.id !== hwId));
    } catch (err) {
      console.error("Error deleting homework:", err);
      alert("Failed to delete homework. Check console for details.");
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Add Homework</h2>

      {error && (
        <div className="bg-red-200 text-red-800 p-2 mb-4 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-200 text-green-800 p-2 mb-4 rounded">
          {success}
        </div>
      )}

      {loadingClasses ? (
        <p>Loading classes...</p>
      ) : (
        <div className="mb-4">
          <label className="block font-semibold mb-2">Select Class:</label>
          <select
            value={selectedClass}
            onChange={handleClassChange}
            className="border p-2 rounded w-full max-w-md"
          >
            <option value="">-- Select a Class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.subject_name} - Class #{cls.class_number}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSubmitHomework} className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 rounded w-full"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border p-2 rounded w-full"
            rows="4"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">
            File/Resource URL (optional):
          </label>
          <div className="relative">
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className="border p-2 rounded w-full pr-10"
              placeholder="http://..."
            />
            <img
              src="/images/attachment.svg"
              alt="Attachment icon"
              className="absolute right-3 top-2 w-5 h-5 pointer-events-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Post Homework
        </button>
      </form>

      {/* Display existing homework for selected class */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-2">Existing Homework</h3>
        {loadingHW ? (
          <p>Loading existing homework...</p>
        ) : hwError ? (
          <p className="text-red-600">{hwError}</p>
        ) : homeworks.length === 0 ? (
          <p>No homework found for this class.</p>
        ) : (
          <ul className="space-y-2">
            {homeworks.map((hw) => (
              <li
                key={hw.id}
                className="bg-white p-4 rounded shadow flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">{hw.title}</p>
                  <p className="text-sm text-gray-600">{hw.description}</p>
                  {hw.file_path && (
                    <a
                      href={hw.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Resource
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteHW(hw.id)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AddHomework;
