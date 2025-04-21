import React, { useState, useEffect } from "react";
import axios from "axios";

function StudentChat() {
  // Assume these IDs are stored during login
  const studentUserId = localStorage.getItem("studentUserId");  // student's user_id from Users table
  const studentTableId = localStorage.getItem("studentId");       // student's table ID

  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // Fetch teacher list for the student
  useEffect(() => {
    const fetchTeachers = async () => {
      setLoadingTeachers(true);
      setError("");
      try {
        const res = await axios.get(`http://127.0.0.1:5000/student/${studentTableId}/teachers`);
        setTeachers(res.data);
        if (res.data.length > 0) {
          setSelectedTeacher(res.data[0]);
        }
      } catch (err) {
        console.error("Error fetching teachers:", err);
        setError("Failed to load teachers.");
      } finally {
        setLoadingTeachers(false);
      }
    };
    if (studentTableId) {
      fetchTeachers();
    } else {
      setError("Student ID not found. Please log in.");
    }
  }, [studentTableId]);

  // Helper to fetch unread count for a teacher (messages from teacher to student)
  const fetchUnreadCount = async (teacherUserId) => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/messages/unread_count", {
        params: {
          teacher_id: teacherUserId,
          student_id: studentUserId,
        },
      });
      return res.data.unread_count;
    } catch (err) {
      console.error("Error fetching unread count:", err);
      return 0;
    }
  };

  // Fetch unread counts for all teachers
  useEffect(() => {
    const fetchAllUnread = async () => {
      const counts = {};
      for (const teacher of teachers) {
        const count = await fetchUnreadCount(teacher.user_id);
        counts[teacher.user_id] = count;
      }
      setUnreadCounts(counts);
    };
    if (teachers.length) {
      fetchAllUnread();
    }
  }, [teachers, studentUserId]);

  // When a teacher is selected, fetch messages and mark teacher messages as read
  useEffect(() => {
    if (selectedTeacher) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedTeacher, studentUserId]);

  // Function to fetch messages for the selected conversation
  const fetchMessages = async () => {
    setError("");
    try {
      const res = await axios.get("http://127.0.0.1:5000/student_messages", {
        params: {
          teacher_id: selectedTeacher.user_id,
          student_id: studentUserId,
        },
      });
      setMessages(res.data);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages.");
    }
  };

  // Function to mark messages as read (for student marking teacher's messages as read)
  const markMessagesAsRead = async () => {
    try {
      await axios.patch("http://127.0.0.1:5000/messages/mark_read/student", {
        teacher_id: selectedTeacher.user_id,
        student_id: studentUserId,
      });
      // Update unread count for the selected teacher to 0
      setUnreadCounts((prev) => ({
        ...prev,
        [selectedTeacher.user_id]: 0,
      }));
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  // Optionally, you can set up polling (if desired) to mark messages as read periodically
  // For simplicity, here we call markMessagesAsRead when conversation is loaded.

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await axios.post("http://127.0.0.1:5000/student_messages", {
        sender_id: parseInt(studentUserId),
        receiver_id: selectedTeacher.user_id,
        message: newMessage,
      });
      setNewMessage("");
      fetchMessages();
      markMessagesAsRead(); // Immediately mark incoming teacher messages as read
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message.");
    }
  };

  return (
    <div className="h-full p-4">
      <h2 className="text-3xl font-bold mb-4">Chat with Teachers</h2>
      {error && <p className="text-red-500">{error}</p>}
      <div className="flex h-full border rounded-lg overflow-hidden">
        {/* Sidebar: Teacher List */}
        <div className="w-1/4 bg-gray-100 border-r p-4">
          <h3 className="text-2xl font-semibold mb-4">My Teachers</h3>
          {loadingTeachers ? (
            <p>Loading teachers...</p>
          ) : (
            <ul>
              {teachers.map((teacher) => (
                <li key={teacher.id} className="mb-2 relative">
                  <button
                    onClick={() => setSelectedTeacher(teacher)}
                    className={`w-full text-left px-4 py-2 rounded transition-colors ${
                      selectedTeacher && selectedTeacher.id === teacher.id
                        ? "bg-blue-600 text-white"
                        : "bg-white hover:bg-blue-100 text-gray-800"
                    }`}
                  >
                    {teacher.name}
                  </button>
                  {unreadCounts[teacher.user_id] > 0 && (
                    <span className="absolute right-2 top-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                      {unreadCounts[teacher.user_id]}
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
              Chat with {selectedTeacher ? selectedTeacher.name : ""}
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
                      msg.sender_id === parseInt(studentUserId)
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 rounded-lg max-w-xs break-words ${
                        msg.sender_id === parseInt(studentUserId)
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

export default StudentChat;
