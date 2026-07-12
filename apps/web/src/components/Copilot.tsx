"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "bot" | "clarify" | "error";
  content: string;
  sql?: string;
  data?: Record<string, unknown>[];
  options?: string[];
}

interface AskResponse {
  type: "answer" | "clarification_needed";
  content: string;
  clarificationDetails?: string;
  conversationId: string;
  sql?: string;
  data?: Record<string, unknown>[];
  options?: string[];
}

const SUGGESTIONS: { key: string; label: string }[] = [
  { key: "off-track", label: "Which suppliers are off-track and why?" },
  { key: "upgrade", label: "Which plants are ready for a filtration upgrade?" },
  { key: "cdp", label: "What's blocking our CDP disclosure this year?" },
];

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `cp-${idCounter}`;
}

function ResultMiniTable({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return null;
  const columns = Object.keys(data[0]);
  return (
    <div style={{ marginTop: 6, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} style={{ textAlign: "left", color: "var(--text-faint)", fontWeight: 500, padding: "2px 6px", borderBottom: "1px solid var(--line)" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c} style={{ padding: "2px 6px", fontFamily: "var(--mono)", color: "var(--text-dim)" }}>
                  {String(row[c] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Copilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [awaitingClarification, setAwaitingClarification] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId(),
      role: "bot",
      content:
        "Ask me about supplier performance, alerts, or upgrade candidates across your portfolio. I query the live data directly — I'll ask if a question needs narrowing down.",
    },
  ]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [openSqlFor, setOpenSqlFor] = useState<string | null>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  function applyResponse(res: AskResponse) {
    if (!conversationId) setConversationId(res.conversationId);
    if (res.type === "clarification_needed") {
      setMessages((m) => [...m, { id: nextId(), role: "clarify", content: res.content, options: res.options }]);
      setAwaitingClarification(true);
    } else {
      setMessages((m) => [...m, { id: nextId(), role: "bot", content: res.content, sql: res.sql, data: res.data }]);
      setAwaitingClarification(false);
    }
  }

  async function send(text: string) {
    const value = text.trim();
    if (!value || loading) return;

    setMessages((m) => [...m, { id: nextId(), role: "user", content: value }]);
    setLoading(true);
    try {
      const endpoint = awaitingClarification ? "/api/copilot/answer-clarification" : "/api/copilot/ask";
      const body = awaitingClarification
        ? { clarification: value, conversationId }
        : { question: value, conversationId };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { id: nextId(), role: "error", content: data.message ?? "Something went wrong." }]);
        return;
      }
      applyResponse(data as AskResponse);
    } catch {
      setMessages((m) => [...m, { id: nextId(), role: "error", content: "Couldn't reach the copilot service." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestion(label: string) {
    send(label);
  }

  function sendFreeform() {
    const val = input;
    setInput("");
    send(val);
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
          {messages.map((m) => (
            <div key={m.id} className={`cp-msg ${m.role === "clarify" ? "clarify" : m.role === "error" ? "error" : m.role}`}>
              {m.role === "clarify" && <span className="cp-clarify-label">❓ Clarification needed</span>}
              <span dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br>") }} />
              {m.options && m.options.length > 0 && (
                <div className="cp-option-row">
                  {m.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="cp-option-btn"
                      onClick={() => send(option)}
                      disabled={loading}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              {m.sql && (
                <>
                  <button type="button" className="cp-sql-toggle" onClick={() => setOpenSqlFor(openSqlFor === m.id ? null : m.id)}>
                    {openSqlFor === m.id ? "▾ hide query" : "▸ show query"}
                  </button>
                  {openSqlFor === m.id && <div className="cp-sql">{m.sql}</div>}
                </>
              )}
              {m.data && <ResultMiniTable data={m.data} />}
            </div>
          ))}
          {loading && (
            <div className="cp-loading">
              <span /><span /><span />
            </div>
          )}
        </div>
        <div className="cp-suggest">
          {SUGGESTIONS.map((sug) => (
            <button key={sug.key} type="button" className="cp-sug-btn" onClick={() => handleSuggestion(sug.label)} disabled={loading}>
              {sug.label}
            </button>
          ))}
        </div>
        <div className="cp-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendFreeform(); }}
            placeholder={awaitingClarification ? "Answer the clarifying question…" : "Type a question…"}
            disabled={loading}
          />
          <button type="button" onClick={sendFreeform} disabled={loading || !input.trim()}>Ask</button>
        </div>
      </div>
    </>
  );
}
