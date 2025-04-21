import React, { useState, useEffect } from "react";
import axios from "axios";

function Chat() {
  // Retrieve teacher's user ID (from Users table) and teacher's table ID from localStorage.
  const teacherUserId = localStorage.getItem("teacherUserId");
  const teacherId = localStorage.getItem("teacherId");

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({}); // maps student user_id to unread count

  // 1. Fetch the list of students for this teacher.
  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      setError("");
      try {
        // Ensure teacherId is valid.
        const res = await axios.get(`http://127.0.0.1:5000/teacher/${teacherId}/students`);
        setStudents(res.data);
        if (res.data.length > 0) {
          setSelectedStudent(res.data[0]);
        }
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to load students.");
      } finally {
        setLoadingStudents(false);
      }
    };

    if (teacherId) {
      fetchStudents();
    }
  }, [teacherId]);

  // 2. Helper: Fetch unread count for a given student using the dedicated teacher endpoint.
  const fetchUnreadCount = async (studentUserId) => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/messages/unread_count/teacher", {
        params: {
          teacher_id: teacherUserId,    // teacher’s user_id
          student_id: studentUserId,      // student’s user_id
        },
      });
      return res.data.unread_count;
    } catch (err) {
      console.error("Error fetching unread count:", err);
      return 0;
    }
  };

  // 3. Fetch unread counts for all students.
  useEffect(() => {
    const fetchAllUnreadCounts = async () => {
      const counts = {};
      for (const student of students) {
        const count = await fetchUnreadCount(student.user_id);
        counts[student.user_id] = count;
      }
      setUnreadCounts(counts);
    };

    if (students.length) {
      fetchAllUnreadCounts();
    }
  }, [students, teacherUserId]);

  // 4. Define a function to mark messages as read using the teacher endpoint.
  const markMessagesAsRead = async () => {
    try {
      if (selectedStudent) {
        await axios.patch("http://127.0.0.1:5000/messages/mark_read/teacher", {
          teacher_id: teacherUserId,
          student_id: selectedStudent.user_id,
        });
        // Reset unread count for the selected student.
        setUnreadCounts((prev) => ({
          ...prev,
          [selectedStudent.user_id]: 0,
        }));
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  // 5. Fetch messages for the selected conversation.
  const fetchMessages = async () => {
    setError("");
    try {
      const res = await axios.get("http://127.0.0.1:5000/messages", {
        params: {
          teacher_id: teacherUserId,
          student_id: selectedStudent.user_id,
        },
      });
      setMessages(res.data);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages.");
    }
  };

  // 6. When a teacher selects a student, fetch messages and mark incoming messages (from student) as read.
  useEffect(() => {
    if (selectedStudent) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedStudent, teacherUserId]);

  // 7. Set up polling to periodically refresh messages and mark as read.
  useEffect(() => {
    let interval;
    if (selectedStudent) {
      interval = setInterval(() => {
        fetchMessages();
        markMessagesAsRead();
      }, 5000); // poll every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedStudent, teacherUserId]);

  // 8. Handle sending a new message.
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await axios.post("http://127.0.0.1:5000/messages", {
        sender_id: parseInt(teacherUserId),
        receiver_id: selectedStudent.user_id,
        message: newMessage,
      });
      setNewMessage("");
      fetchMessages();
      // Optionally, call markMessagesAsRead after sending.
      markMessagesAsRead();
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message.");
    }
  };

  return (
    <div className="h-full p-4">
      <h2 className="text-3xl font-bold mb-4">Student Chat</h2>
      {error && <p className="text-red-500">{error}</p>}
      <div className="flex h-full border rounded-lg overflow-hidden">
        {/* Sidebar: Student List */}
        <div className="w-1/4 bg-gray-100 border-r p-4">
          <h3 className="text-2xl font-semibold mb-4">My Students</h3>
          {loadingStudents ? (
            <p>Loading students...</p>
          ) : (
            <ul>
              {students.map((student) => (
                <li key={student.user_id} className="mb-2 relative">
                  <button
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full text-left px-4 py-2 rounded transition-colors ${
                      selectedStudent && selectedStudent.user_id === student.user_id
                        ? "bg-blue-600 text-white"
                        : "bg-white hover:bg-blue-100 text-gray-800"
                    }`}
                  >
                    {student.name}
                  </button>
                  {unreadCounts[student.user_id] > 0 && (
                    <span className="absolute right-2 top-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                      {unreadCounts[student.user_id]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col p-4">
          {/* Chat Header */}
          <div className="border-b pb-2 mb-4">
            <h3 className="text-2xl font-semibold">
              Chat with {selectedStudent ? selectedStudent.name : ""}
            </h3>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 border rounded">
            {messages.length === 0 ? (
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="mb-4">
                  <div
                    className={`flex ${
                      msg.sender_id === parseInt(teacherUserId)
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 rounded-lg max-w-xs break-words ${
                        msg.sender_id === parseInt(teacherUserId)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-300 text-gray-800"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-right">
                    {new Date(msg.sent_at).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 border p-3 rounded-lg"
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Send
            </button>
          </div>
          {error && <p className="mt-2 text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default Chat;
