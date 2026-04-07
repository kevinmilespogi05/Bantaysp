import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Search, Hash, Users, MessageSquare, Pin, Smile } from "lucide-react";

const channels = [
  { id: 1, name: "general", desc: "General community discussion", members: 847, unread: 3 },
  { id: 2, name: "san-pablo", desc: "Brgy. San Pablo residents", members: 234, unread: 0 },
  { id: 3, name: "del-pilar", desc: "Brgy. Del Pilar residents", members: 189, unread: 1 },
  { id: 4, name: "emergency-alerts", desc: "Emergency notifications", members: 1203, unread: 2 },
  { id: 5, name: "report-updates", desc: "Report status updates", members: 512, unread: 0 },
];

const initialMessages = [
  { id: 1, user: "Maria Santos", avatar: "MS", message: "Guys, the streetlight on Rizal Ave is still broken. Report already filed!", time: "9:12 AM", color: "#800000" },
  { id: 2, user: "Tanod Leader Cruz", avatar: "TC", message: "Thanks for the report Maria! We'll have someone check it today.", time: "9:15 AM", color: "#2563eb" },
  { id: 3, user: "Ana Gonzales", avatar: "AG", message: "I saw some suspicious activity near the market earlier. Should I file a report?", time: "9:22 AM", color: "#16a34a" },
  { id: 4, user: "Juan dela Cruz", avatar: "JD", message: "Yes Ana, definitely file a report on Bantay SP. Include as many details as possible.", time: "9:25 AM", color: "#800000", isMe: true },
  { id: 5, user: "Pedro Villanueva", avatar: "PV", message: "There's also flooding on Maharlika Highway near km 3. Someone should coordinate with MDRRMO.", time: "9:30 AM", color: "#d97706" },
  { id: 6, user: "Maria Santos", avatar: "MS", message: "I already contacted MDRRMO. They said they'll deploy a team within the hour! 🙌", time: "9:35 AM", color: "#800000" },
];

export function ChatPage() {
  const [activeChannel, setActiveChannel] = useState(channels[0]);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg = {
      id: messages.length + 1,
      user: "Juan dela Cruz",
      avatar: "JD",
      message: input,
      time: new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
      color: "#800000",
      isMe: true,
    };
    setMessages([...messages, newMsg]);
    setInput("");
  };

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-gray-100 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Community Chat</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-700 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <div className="px-2 py-1.5 text-gray-400 uppercase flex items-center gap-1.5 mb-1" style={{ fontSize: "10px" }}>
            <Hash className="w-3 h-3" />
            Channels
          </div>
          {filteredChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-all ${
                activeChannel.id === channel.id
                  ? "bg-white shadow-sm"
                  : "hover:bg-white/60"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Hash className={`w-3.5 h-3.5 shrink-0 ${activeChannel.id === channel.id ? "" : "text-gray-400"}`}
                  style={{ color: activeChannel.id === channel.id ? "#800000" : undefined }} />
                <span className={`text-sm truncate ${activeChannel.id === channel.id ? "font-medium text-gray-900" : "text-gray-500"}`}>
                  {channel.name}
                </span>
              </div>
              {channel.unread > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-white font-medium shrink-0" style={{ fontSize: "10px", backgroundColor: "#800000" }}>
                  {channel.unread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* My info */}
        <div className="p-3 border-t border-gray-100 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#800000" }}>JD</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">Juan dela Cruz</div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-green-600" style={{ fontSize: "10px" }}>Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">{activeChannel.name}</h3>
            <span className="hidden md:block text-gray-400 text-sm">— {activeChannel.desc}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <Users className="w-3.5 h-3.5" />
              {activeChannel.members.toLocaleString()} members
            </div>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <Pin className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.isMe ? "flex-row-reverse" : ""}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: msg.color }}
                >
                  {msg.avatar}
                </div>
                <div className={`max-w-[70%] ${msg.isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`flex items-center gap-2 ${msg.isMe ? "flex-row-reverse" : ""}`}>
                    <span className="font-medium text-gray-900 text-xs">{msg.user}</span>
                    <span className="text-gray-400" style={{ fontSize: "10px" }}>{msg.time}</span>
                  </div>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.isMe
                        ? "text-white rounded-tr-sm"
                        : "bg-gray-100 text-gray-800 rounded-tl-sm"
                    }`}
                    style={msg.isMe ? { backgroundColor: "#800000" } : {}}
                  >
                    {msg.message}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder={`Message #${activeChannel.name}...`}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                <Smile className="w-4 h-4" />
              </button>
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 hover:scale-105"
                style={{ backgroundColor: "#800000" }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
