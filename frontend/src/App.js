import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Teacher Components & Layout
import TeacherLayout from "./components/TeacherDashboard/TeacherLayout";
import TeacherDashboard from "./components/TeacherDashboard/TeacherDashboard";
import MyClasses from "./components/TeacherDashboard/MyClasses";
import AddAttendance from "./components/TeacherDashboard/AddAttendance";
import AddHomework from "./components/TeacherDashboard/AddHomework";
import AddParticipation from "./components/TeacherDashboard/AddParticipation";
import Chat from "./components/TeacherDashboard/Chat";

// Student Components
import StudentLayout from "./components/StudentDashboard/StudentLayout";
import StudentDashboard from "./components/StudentDashboard/StudentDashboard";
import MyGrades from "./components/StudentDashboard/MyGrades";

import StudentAiChat from "./components/StudentDashboard/StudentAiChat";
import MyHomework from "./components/StudentDashboard/MyHomework";
import StudentChat from "./components/StudentDashboard/StudentChat";

// Login Component
import Login from "./components/Login";

// Admin Components & Layout
import AdminLayout from "./components/AdminDashboard/AdminLayout";
import Teacher from "./components/AdminDashboard/teacher";
import Student from "./components/AdminDashboard/student";

function App() {
  return (
    <Routes>
      {/* Login Route */}
      <Route path="/login" element={<Login />} />

      {/* ---------------- Student Routes ---------------- */}
      <Route
        path="/student"
        element={
          <StudentLayout>
            <StudentDashboard />
          </StudentLayout>
        }
      />
      <Route
        path="/student/grades"
        element={
          <StudentLayout>
            <MyGrades />
          </StudentLayout>
        }
      />
      
      <Route
        path="/student/ai-chat"
        element={
          <StudentLayout>
            <StudentAiChat />
          </StudentLayout>
        }
      />
      <Route
        path="/student/homework"
        element={
          <StudentLayout>
            <MyHomework />
          </StudentLayout>
        }
      />
      <Route
        path="/student/chat"
        element={
          <StudentLayout>
            <StudentChat />
          </StudentLayout>
        }
      />
      <Route path="/student-dashboard" element={<Navigate to="/student" replace />} />

      {/* ---------------- Teacher Routes ---------------- */}
      {/* Teacher Dashboard Home */}
      <Route
        path="/"
        element={
          <TeacherLayout>
            <TeacherDashboard />
          </TeacherLayout>
        }
      />
      {/* My Classes */}
      <Route
        path="/my-classes"
        element={
          <TeacherLayout>
            <MyClasses />
          </TeacherLayout>
        }
      />
      {/* Add Attendance */}
      <Route
        path="/add-attendance"
        element={
          <TeacherLayout>
            <AddAttendance />
          </TeacherLayout>
        }
      />
      {/* Add Homework */}
      <Route
        path="/add-homework"
        element={
          <TeacherLayout>
            <AddHomework />
          </TeacherLayout>
        }
      />
      {/* Add Participation */}
      <Route
        path="/add-participation"
        element={
          <TeacherLayout>
            <AddParticipation />
          </TeacherLayout>
        }
      />
      {/* Chat */}
      <Route
        path="/chat"
        element={
          <TeacherLayout>
            <Chat />
          </TeacherLayout>
        }
      />

      {/* ---------------- Admin Routes ---------------- */}
      {/* Redirect the base admin dashboard URL to the teacher management view */}
      <Route
        path="/admin-dashboard"
        element={<Navigate to="/admin-dashboard/teacher" replace />}
      />
      {/* Admin Teacher Management */}
      <Route
        path="/admin-dashboard/teacher"
        element={
          <AdminLayout>
            <Teacher />
          </AdminLayout>
        }
      />
      {/* Admin Student Management */}
      <Route
        path="/admin-dashboard/student"
        element={
          <AdminLayout>
            <Student />
          </AdminLayout>
        }
      />
    </Routes>
  );
}

export default App;