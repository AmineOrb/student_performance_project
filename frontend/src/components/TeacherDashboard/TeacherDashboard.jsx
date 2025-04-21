import React, { useState, useEffect } from "react";

function TeacherDashboard() {
  // Optional: Retrieve the teacher’s name from localStorage (assuming you store it at login)
  const [teacherName, setTeacherName] = useState("Teacher");

  useEffect(() => {
    const storedName = localStorage.getItem("teacherName");
    if (storedName) {
      setTeacherName(storedName);
    }
  }, []);

  return (
    <div className="p-6 bg-white rounded shadow-md">
      {/* Greeting / Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
          Welcome, {teacherName}
        </h1>
        <p className="text-lg text-gray-600">
          This is your Teacher Dashboard. Use the sidebar to manage classes,
          record attendance, update grades, and more.
        </p>
      </div>

      {/* Example "At a Glance" Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Classes */}
        <div className="bg-blue-100 rounded-lg shadow p-4 flex flex-col">
          <h2 className="text-xl font-bold text-blue-800 mb-2">My Classes</h2>
          <p className="text-sm text-blue-700 flex-1">
            View and manage all of your classes. Add or update grades for each
            student quickly.
          </p>
          <button
            onClick={() => window.location.href = "/my-classes"}
            className="mt-4 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 self-start"
          >
            Go to My Classes
          </button>
        </div>

        {/* Card 2: Attendance */}
        <div className="bg-green-100 rounded-lg shadow p-4 flex flex-col">
          <h2 className="text-xl font-bold text-green-800 mb-2">Attendance</h2>
          <p className="text-sm text-green-700 flex-1">
            Quickly mark attendance for each class. Keep track of who’s present,
            absent, or late.
          </p>
          <button
            onClick={() => window.location.href = "/add-attendance"}
            className="mt-4 bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 self-start"
          >
            Record Attendance
          </button>
        </div>

        {/* Card 3: Participation */}
        <div className="bg-yellow-100 rounded-lg shadow p-4 flex flex-col">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Participation</h2>
          <p className="text-sm text-yellow-700 flex-1">
            Assign or update participation scores for your students each week.
          </p>
          <button
            onClick={() => window.location.href = "/add-participation"}
            className="mt-4 bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 self-start"
          >
            Add Participation
          </button>
        </div>
      </div>

      {/* Homework + Chat Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Card 4: Homework */}
        <div className="bg-purple-100 rounded-lg shadow p-4 flex flex-col">
          <h2 className="text-xl font-bold text-purple-800 mb-2">Homework</h2>
          <p className="text-sm text-purple-700 flex-1">
            Post new homework assignments or resources for your students.
          </p>
          <button
            onClick={() => window.location.href = "/add-homework"}
            className="mt-4 bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600 self-start"
          >
            Add Homework
          </button>
        </div>

        {/* Card 5: Chat */}
        <div className="bg-indigo-100 rounded-lg shadow p-4 flex flex-col">
          <h2 className="text-xl font-bold text-indigo-800 mb-2">Chat</h2>
          <p className="text-sm text-indigo-700 flex-1">
            Communicate with your students. Answer questions or send announcements.
          </p>
          <button
            onClick={() => window.location.href = "/chat"}
            className="mt-4 bg-indigo-500 text-white px-3 py-2 rounded hover:bg-indigo-600 self-start"
          >
            Go to Chat
          </button>
        </div>
      </div>
    </div>


    


  );
}

export default TeacherDashboard;
