import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function StudentAiChat() {
  // Get the student ID from localStorage (assumed to be set during login)
  const studentId = localStorage.getItem("studentId");

  // Create a storage key for this specific student's conversation
  const conversationKey = `conversation_${studentId}`;

  // Load conversation from localStorage using the student-specific key
  const initialConversation = JSON.parse(localStorage.getItem(conversationKey)) || [];
  const [conversation, setConversation] = useState(initialConversation);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Ref for the messages div so we can scroll down automatically
  const messagesEndRef = useRef(null);

  // Whenever conversation changes, update localStorage using the student-specific key.
  useEffect(() => {
    localStorage.setItem(conversationKey, JSON.stringify(conversation));
    scrollToBottom();
  }, [conversation, conversationKey]);

  // Function to scroll chat to bottom whenever new message is added
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Helper to add new message into the conversation
  const addMessage = (sender, text) => {
    const messageObj = { sender, text, timestamp: new Date().toISOString() };
    setConversation((prev) => [...prev, messageObj]);
  };

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    addMessage("student", newMessage);
    const messageToSend = newMessage;
    setNewMessage("");
    setLoading(true);
    setError("");

    try {
      // Call your Flask AI-chat endpoint
      const res = await axios.post("http://127.0.0.1:5000/student-ai-chat", {
        student_id: studentId,
        message: messageToSend,
      });
      const aiReply = res.data.response.trim();
      addMessage("ai", aiReply);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to get a response from AI.");
    } finally {
      setLoading(false);
    }
  };

  // Clear conversation for the current student
  const handleClearConversation = () => {
    setConversation([]);
    localStorage.removeItem(conversationKey);
  };

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      {/* Header */}
      <header className="sticky top-0 bg-blue-600 text-white p-4 rounded shadow mb-4">
        <h2 className="text-3xl font-bold">My Chat (AI)</h2>
        <p className="text-sm">
          Interact with our AI tutor for personalized recommendations.
        </p>
      </header>

      <div className="bg-white rounded shadow p-4 flex flex-col h-[70vh]">
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 border-b">
          {conversation.length === 0 ? (
            <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
          ) : (
            conversation.map((msg, index) => (
              <div key={index} className={`mb-4 ${msg.sender === "student" ? "text-right" : "text-left"}`}>
                <div
                  className={`px-4 py-2 rounded-lg max-w-[80%] inline-block break-words ${
                    msg.sender === "student" ? "bg-blue-600 text-white" : "bg-green-500 text-white"
                  }`}
                >
                  {msg.text}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {msg.sender === "student" ? "You" : "AI Tutor"} • {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))
          )}
          {/* Dummy element to scroll into view */}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input + Actions */}
        <div className="mt-4 flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 border rounded-lg"
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send"}
          </button>
          <button
            onClick={handleClearConversation}
            className="bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition-colors"
          >
            Clear
          </button>
        </div>
        {error && <p className="mt-2 text-red-500 text-center">{error}</p>}
      </div>
    </div>
  );
}

export default StudentAiChat;
