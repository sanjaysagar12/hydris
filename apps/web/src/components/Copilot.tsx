"use client";

import { useEffect, useRef, useState } from "react";
import { copilotAnswers, fallbackAnswer } from "@/lib/copilot";

interface ChatMessage {
  role: "user" | "bot";
  html: string;
}

const SUGGESTIONS: { key: string; label: string }[] = [
  { key: "off-track", label: "Which suppliers are off-track and why?" },
  { key: "upgrade", label: "Which plants are ready for a filtration upgrade?" },
  { key: "cdp", label: "What's blocking our CDP disclosure this year?" },
];

export default function Copilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      html: "Ask me about supplier performance, alerts, or upgrade candidates across your portfolio. Every answer is grounded in the data pack — I'll cite the source.",
    },
  ]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  function respond(key: string) {
    const a = copilotAnswers[key];
    if (!a) return;
    setMessages((m) => [...m, { role: "user", html: a.user }]);
    window.setTimeout(() => {
      let html = a.bot;
      a.cites.forEach((c) => (html += `<span class="cp-cite">↳ ${c}</span>`));
      setMessages((m) => [...m, { role: "bot", html }]);
    }, 350);
  }

  function sendFreeform() {
    const val = input.trim();
    if (!val) return;
    setMessages((m) => [...m, { role: "user", html: val }]);
    setInput("");
    window.setTimeout(() => {
      setMessages((m) => [...m, { role: "bot", html: fallbackAnswer }]);
    }, 350);
  }

  return (
    <>
      {!open && (
        <button type="button" className="copilot-toggle" onClick={() => setOpen(true)}>
          ◆ Ask the copilot
        </button>
      )}
      <div className={`copilot-panel${open ? " open" : ""}`}>
        <div className="cp-head">
          <div className="t">Stewardship Copilot</div>
          <button type="button" className="close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="cp-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div key={i} className={`cp-msg ${m.role}`} dangerouslySetInnerHTML={{ __html: m.html }} />
          ))}
        </div>
        <div className="cp-suggest">
          {SUGGESTIONS.map((sug) => (
            <button key={sug.key} type="button" className="cp-sug-btn" onClick={() => respond(sug.key)}>
              {sug.label}
            </button>
          ))}
        </div>
        <div className="cp-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendFreeform(); }}
            placeholder="Type a question…"
          />
          <button type="button" onClick={sendFreeform}>Ask</button>
        </div>
      </div>
    </>
  );
}
