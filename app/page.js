"use client";
import { useState, useRef, useEffect, useCallback } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState([]); // base64 data URLs
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const addImage = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImages((prev) => [...prev, reader.result]);
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Global paste listener so it works even without textarea focus
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) addImage(file);
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [addImage]);

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        addImage(file);
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        addImage(file);
      }
    }
    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!input.trim() && images.length === 0) return;

    const userMsg = {
      role: "user",
      text: input.trim() || (images.length > 0 ? "Where is this?" : ""),
      images: [...images],
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setImages([]);
    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();
      if (data.error) {
        setMessages([...newMessages, { role: "assistant", text: `Error: ${data.error}` }]);
      } else {
        setMessages([...newMessages, { role: "assistant", text: data.text }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setImages([]);
    setInput("");
  };

  return (
    <div
      className="flex flex-col h-screen max-w-3xl mx-auto"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <h1 className="text-xl font-bold text-white">GuessrAgent</h1>
          <p className="text-xs text-gray-500">Paste or drop images to guess locations</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-gray-700 hover:border-gray-500"
          >
            Clear
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <div className="text-5xl">&#127758;</div>
            <p className="text-lg font-medium">Drop or paste an image</p>
            <p className="text-sm">I&apos;ll analyze visual clues to guess the location</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-100"
              }`}
            >
              {/* Images */}
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.images.map((img, j) => (
                    <img
                      key={j}
                      src={img}
                      alt="uploaded"
                      className="max-h-48 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
              {/* Text */}
              {msg.text && (
                <div
                  className="message-content text-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
                      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
                      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
                      .replace(/^- (.*$)/gm, "<li>$1</li>")
                      .replace(/\n/g, "<br/>"),
                  }}
                />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img src={img} alt="preview" className="h-16 rounded-lg object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2 items-end">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm shrink-0"
            title="Upload image"
          >
            &#128247;
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste an image or type a message..."
            rows={1}
            className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading || (!input.trim() && images.length === 0)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium shrink-0 ${
              loading || (!input.trim() && images.length === 0)
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2 text-center">
          Ctrl+V to paste images from clipboard - Drag &amp; drop supported
        </p>
      </div>
    </div>
  );
}
