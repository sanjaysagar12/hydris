"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "bot" | "error";
  content: string;
}

interface AskResponse {
  content: string;
  conversationId: string;
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `pa-${idCounter}`;
}

const SUGGESTIONS = [
  "What's the single fastest way to raise this supplier's PWI?",
  "Which open alerts are hurting the score most?",
  "Walk me through the full score breakdown.",
];

export default function PwiAdvisorChat({ supplierId, supplierName }: { supplierId: string; supplierName: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || loading) return;

    setMessages((m) => [...m, { id: nextId(), role: "user", content: value }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/advisor/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value, conversationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { id: nextId(), role: "error", content: data.message ?? "Something went wrong." }]);
        return;
      }
      const parsed = data as AskResponse;
      if (!conversationId) setConversationId(parsed.conversationId);
      setMessages((m) => [...m, { id: nextId(), role: "bot", content: parsed.content }]);
    } catch {
      setMessages((m) => [...m, { id: nextId(), role: "error", content: "Couldn't reach the PWI advisor." }]);
    } finally {
      setLoading(false);
    }
  }

  function sendFreeform() {
    const val = input;
    setInput("");
    send(val);
  }

  return (
    <div className="pa-wrap">
      <button type="button" className="audit-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "▾ hide PWI advisor" : `▸ ask AI how to improve ${supplierName}'s PWI`}
      </button>
      {open && (
        <div className="pa-panel">
          <div className="cp-body pa-body" ref={bodyRef}>
            {messages.length === 0 && (
              <div className="cp-msg bot">
                Ask me anything about how to improve {supplierName}&apos;s PWI score — I have their live PWI
                breakdown and open alerts in context.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`cp-msg ${m.role === "error" ? "error" : m.role}`}>
                <span dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br>") }} />
              </div>
            ))}
            {loading && (
              <div className="cp-loading">
                <span /><span /><span />
              </div>
            )}
          </div>
          {messages.length === 0 && (
            <div className="cp-suggest pa-suggest">
              {SUGGESTIONS.map((sug) => (
                <button key={sug} type="button" className="cp-sug-btn" onClick={() => send(sug)} disabled={loading}>
                  {sug}
                </button>
              ))}
            </div>
          )}
          <div className="cp-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendFreeform(); }}
              placeholder="Ask about this supplier's PWI…"
              disabled={loading}
            />
            <button type="button" onClick={sendFreeform} disabled={loading || !input.trim()}>Ask</button>
          </div>
        </div>
      )}
    </div>
  );
}
