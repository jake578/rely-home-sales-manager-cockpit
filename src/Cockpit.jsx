import { useState, useRef, useEffect, useCallback } from "react";
import { REP, TABS, ALL_LEADS, CHAT_RESPONSES, WEEKLY_DATA, PIPELINE_DATA, CHAT_SUGGESTIONS, FUNNEL_DATA, TOP_TEMPLATES, ROLE_LABEL, COMPANY_LOGO_LETTER, COMPANY_NAME } from "./data.js";

const sig = (label, type) => {
  const m = { intent: { bg: "#FAEEDA", color: "#854F0B" }, content: { bg: "#E6F1FB", color: "#185FA5" }, growth: { bg: "#E1F5EE", color: "#0F6E56" }, tech: { bg: "#EEEDFE", color: "#534AB7" }, risk: { bg: "#FCEBEB", color: "#A32D2D" }, momentum: { bg: "#E1F5EE", color: "#0F6E56" }, stakeholder: { bg: "#E6F1FB", color: "#185FA5" }, timing: { bg: "#FAEEDA", color: "#854F0B" }, competitive: { bg: "#EEEDFE", color: "#534AB7" }, coaching: { bg: "#FFF0E6", color: "#9C4D1A" } };
  return { label, ...(m[type] || m.intent) };
};

function MiniBar({ data, maxH = 60 }) {
  const mx = Math.max(...data.map(d => d.emails + d.calls + d.li));
  return (
    <div style={{ display: "flex", alignItems: "end", gap: 6, height: maxH, marginTop: 8 }}>
      {data.map((d, i) => {
        const total = d.emails + d.calls + d.li;
        const h = (total / mx) * maxH;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ width: "100%", borderRadius: 3, overflow: "hidden", height: h, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ height: (d.emails / total) * h, background: "#85B7EB" }} />
              <div style={{ height: (d.calls / total) * h, background: "#AFA9EC" }} />
              <div style={{ height: (d.li / total) * h, background: "#5DCAA5" }} />
            </div>
            <span style={{ fontSize: 9, color: "#888" }}>{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

function MiniLine({ data, maxH = 55 }) {
  const mx = Math.max(...data.map(d => d.value));
  const pts = data.map((d, i) => ({ x: (i / (data.length - 1)) * 100, y: maxH - (d.value / mx) * (maxH - 8) }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = path + ` L100,${maxH} L0,${maxH} Z`;
  return (
    <svg viewBox={`0 0 100 ${maxH}`} style={{ width: "100%", height: maxH, marginTop: 8 }} preserveAspectRatio="none">
      <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1D9E75" stopOpacity="0.2" /><stop offset="100%" stopColor="#1D9E75" stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill="url(#pg)" />
      <path d={path} fill="none" stroke="#1D9E75" strokeWidth="1.5" />
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="2.5" fill="#1D9E75" />
    </svg>
  );
}

function ScoreBadge({ score }) {
  const c = score >= 85 ? { bg: "#FCEBEB", color: "#A32D2D" } : score >= 70 ? { bg: "#FAEEDA", color: "#854F0B" } : score >= 50 ? { bg: "#E6F1FB", color: "#185FA5" } : { bg: "#F1EFE8", color: "#5F5E5A" };
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: c.bg, color: c.color, fontWeight: 600, whiteSpace: "nowrap" }}>{score}</span>;
}

function PriorityDot({ priority }) {
  const c = { critical: "#E24B4A", high: "#EF9F27", medium: "#85B7EB", low: "#B4B2A9" };
  return <span style={{ width: 6, height: 6, borderRadius: "50%", background: c[priority] || c.low, display: "inline-block", flexShrink: 0 }} />;
}

export default function Cockpit() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [editingId, setEditingId] = useState(null);
  const [editedMessages, setEditedMessages] = useState({});
  const [sentIds, setSentIds] = useState(new Set());
  const [skippedIds, setSkippedIds] = useState(new Set());
  const [chatInput, setChatInput] = useState("");
  const [chatMsgs, setChatMsgs] = useState([
    { from: "claude", text: `Good morning, ${REP.name.split(" ")[0]}. You're **${Math.round((REP.pipeline / REP.quota) * 1000) / 10}% to quota** with ${REP.week}.` },
    { from: "claude", text: `You have actions queued across ${TABS.length} categories. Let me know what you'd like to focus on.` },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showSent, setShowSent] = useState(false);
  const [view, setView] = useState("queue");
  const chatEndRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs, chatLoading]);

  const pctQuota = Math.round((REP.pipeline / REP.quota) * 1000) / 10;
  const remaining = REP.quota - REP.pipeline;

  const allLeads = Object.values(ALL_LEADS).flat();
  const leads = (ALL_LEADS[activeTab] || []).filter(l => showSent || (!sentIds.has(l.id) && !skippedIds.has(l.id)));
  const tabCounts = {};
  TABS.forEach(t => { tabCounts[t] = (ALL_LEADS[t] || []).filter(l => !sentIds.has(l.id) && !skippedIds.has(l.id)).length; });
  const totalActions = Object.values(tabCounts).reduce((a, b) => a + b, 0);
  const completedToday = sentIds.size + skippedIds.size;

  const handleSend = (id) => { setSentIds(prev => new Set([...prev, id])); setEditingId(null); setSelectedLead(null); };
  const handleSkip = (id) => { setSkippedIds(prev => new Set([...prev, id])); setSelectedLead(null); };

  const handleChat = useCallback((text) => {
    const q = text || chatInput;
    if (!q.trim()) return;
    setChatMsgs(prev => [...prev, { from: "user", text: q }]);
    setChatInput("");
    setChatLoading(true);
    setTimeout(() => {
      const ql = q.toLowerCase();
      let reply = CHAT_RESPONSES.fallback;
      const keys = Object.keys(CHAT_RESPONSES).filter(k => k !== "fallback");
      for (const key of keys) {
        const triggers = key.split("_");
        if (triggers.some(t => ql.includes(t))) { reply = CHAT_RESPONSES[key]; break; }
      }
      if (reply === CHAT_RESPONSES.fallback) {
        const mentionedLead = allLeads.find(l => l.name && (ql.includes(l.name.split(" ")[0].toLowerCase()) || ql.includes(l.company.toLowerCase())));
        if (mentionedLead) reply = `**${mentionedLead.name} — ${mentionedLead.company}**\n\nRole: ${mentionedLead.role}\nStage: ${mentionedLead.stage} · ${mentionedLead.size}\nIntent Score: ${mentionedLead.score}\nSignals: ${mentionedLead.signals.map(s => s.label).join(", ")}\n\nRecommended next step: ${mentionedLead.score >= 80 ? "High-priority outreach — send the suggested message today and follow up within 48 hours." : mentionedLead.score >= 60 ? "Warm outreach — send the message and monitor engagement." : "Nurture sequence — add to a 3-touch cadence and monitor for intent signals."}`;
      }
      setChatMsgs(prev => [...prev, { from: "claude", text: reply }]);
      setChatLoading(false);
    }, 800 + Math.random() * 600);
  }, [chatInput, allLeads]);

  const renderText = (text) => text.split("\n").map((line, i) => (
    <span key={i}>{i > 0 && <br />}{line.split("**").map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}</span>
  ));

  const sl = selectedLead ? allLeads.find(l => l.id === selectedLead) : null;
  const slMsg = sl ? (editedMessages[sl.id] || sl.message) : "";

  const fmtK = (n) => "$" + (n / 1000).toFixed(0) + "K";

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: "#FAFAF8", minHeight: "100vh" }}>
      {/* Top nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", display: "flex", alignItems: "center", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 32 }}>
          <svg width="20" height="20" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#1D9E75"/><text x="4" y="17" fontSize="13" fontWeight="700" fill="#fff">{COMPANY_LOGO_LETTER}</text></svg>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: -0.3 }}>{COMPANY_NAME}</span>
          <span style={{ fontSize: 12, color: "#888", marginLeft: 4 }}>{ROLE_LABEL} Cockpit</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {["queue", "analytics"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ fontSize: 13, padding: "6px 16px", borderRadius: 6, background: view === v ? "#f0efe9" : "transparent", color: view === v ? "#1a1a1a" : "#888", border: "none", cursor: "pointer", fontWeight: view === v ? 500 : 400 }}>
              {v === "queue" ? "Action queue" : "Analytics"}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#E1F5EE", color: "#0F6E56", fontWeight: 500 }}>{totalActions} actions</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 11, color: "#185FA5" }}>{REP.initials}</div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{REP.name}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px", display: "flex", gap: 16 }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Metrics strip */}
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr 1.2fr", gap: 10, marginBottom: 14 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #eee" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <p style={{ fontSize: 11, color: "#888", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Pipeline</p>
                  <p style={{ fontSize: 26, fontWeight: 600, margin: "4px 0 0", letterSpacing: -0.5 }}>{fmtK(REP.pipeline)}</p>
                </div>
                <span style={{ fontSize: 11, color: "#BA7517", fontWeight: 500 }}>{fmtK(remaining)} left</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "#f0efe9", marginTop: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: "#1D9E75", width: `${Math.min(pctQuota, 100)}%` }} />
              </div>
              <p style={{ fontSize: 10, color: "#888", margin: "4px 0 0", textAlign: "right" }}>{pctQuota}% of {fmtK(REP.quota)}</p>
            </div>
            <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #eee" }}>
              <p style={{ fontSize: 11, color: "#888", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Meetings</p>
              <p style={{ fontSize: 26, fontWeight: 600, margin: "4px 0 0", letterSpacing: -0.5 }}>{REP.meetingsBooked}<span style={{ fontSize: 14, fontWeight: 400, color: "#888" }}>/{REP.meetingsTarget}</span></p>
              <p style={{ fontSize: 11, color: "#BA7517", margin: "6px 0 0" }}>{REP.meetingsTarget - REP.meetingsBooked} more needed</p>
            </div>
            <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #eee" }}>
              <p style={{ fontSize: 11, color: "#888", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Reply rate</p>
              <p style={{ fontSize: 26, fontWeight: 600, margin: "4px 0 0", letterSpacing: -0.5 }}>{REP.emailReplyRate}%</p>
              <p style={{ fontSize: 11, color: "#0F6E56", margin: "6px 0 0" }}>+{(REP.emailReplyRate - REP.teamAvgReply).toFixed(1)}pp vs team</p>
            </div>
            <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #eee" }}>
              <p style={{ fontSize: 11, color: "#888", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Reply to mtg</p>
              <p style={{ fontSize: 26, fontWeight: 600, margin: "4px 0 0", letterSpacing: -0.5 }}>{REP.replyToMeeting}%</p>
              <p style={{ fontSize: 11, color: "#888", margin: "6px 0 0" }}>team avg {REP.teamAvgMeeting}%</p>
            </div>
            <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #eee" }}>
              <p style={{ fontSize: 11, color: "#888", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>This week</p>
              <p style={{ fontSize: 26, fontWeight: 600, margin: "4px 0 0", letterSpacing: -0.5 }}>{REP.activitiesWeek}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "#85B7EB" }}>{REP.emailAct} email</span>
                <span style={{ fontSize: 10, color: "#AFA9EC" }}>{REP.callAct} call</span>
                <span style={{ fontSize: 10, color: "#5DCAA5" }}>{REP.liAct} LI</span>
              </div>
            </div>
          </div>

          {view === "analytics" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #eee" }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 4px" }}>Pipeline trajectory</p>
                <p style={{ fontSize: 11, color: "#888", margin: "0 0 4px" }}>Weekly cumulative ($K)</p>
                <MiniLine data={PIPELINE_DATA} maxH={120} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  {PIPELINE_DATA.filter((_,i)=> i%2===0 || i===PIPELINE_DATA.length-1).map((d,i) => <span key={i} style={{ fontSize: 9, color: "#888" }}>{d.week}</span>)}
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #eee" }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 4px" }}>Activity breakdown</p>
                <p style={{ fontSize: 11, color: "#888", margin: "0 0 0" }}>This week by channel</p>
                <MiniBar data={WEEKLY_DATA} maxH={120} />
              </div>
              <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #eee" }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 12px" }}>Conversion funnel</p>
                {FUNNEL_DATA.map((f, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span>{f.stage}</span>
                      <span style={{ fontWeight: 500 }}>{f.val} <span style={{ color: "#888", fontWeight: 400 }}>({f.pct})</span></span>
                    </div>
                    <div style={{ height: 4, background: "#f0efe9", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "#1D9E75", borderRadius: 2, width: f.pct === "100%" ? "100%" : f.pct }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #eee" }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 12px" }}>Top performing templates</p>
                {TOP_TEMPLATES.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < TOP_TEMPLATES.length - 1 ? "1px solid #f5f5f2" : "none" }}>
                    <div>
                      <p style={{ fontSize: 12, margin: 0, fontWeight: i === 0 ? 500 : 400 }}>{t.name}</p>
                      <p style={{ fontSize: 10, color: "#888", margin: 0 }}>{t.vol}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? "#0F6E56" : "#1a1a1a" }}>{t.rate}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Tabs + filters */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
                  {TABS.map(t => (
                    <button key={t} onClick={() => { setActiveTab(t); setSelectedLead(null); }} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 6, background: activeTab === t ? "#1a1a1a" : "#fff", color: activeTab === t ? "#fff" : "#666", border: activeTab === t ? "none" : "1px solid #e0e0e0", cursor: "pointer", fontWeight: activeTab === t ? 500 : 400 }}>
                      {t} <span style={{ opacity: 0.7 }}>({tabCounts[t]})</span>
                    </button>
                  ))}
                </div>
                {completedToday > 0 && (
                  <button onClick={() => setShowSent(!showSent)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, background: showSent ? "#f0efe9" : "transparent", color: "#888", border: "1px solid #e0e0e0", cursor: "pointer" }}>
                    {showSent ? "Hide" : "Show"} completed ({completedToday})
                  </button>
                )}
              </div>

              {/* Split: list + detail */}
              <div style={{ display: "grid", gridTemplateColumns: sl ? "1fr 1.1fr" : "1fr", gap: 12 }}>
                <div ref={listRef} style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 520, overflowY: "auto", paddingRight: 4 }}>
                  {leads.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 13 }}>All caught up in this queue!</div>}
                  {leads.map(lead => {
                    const isSent = sentIds.has(lead.id);
                    const isSkipped = skippedIds.has(lead.id);
                    const isSelected = selectedLead === lead.id;
                    return (
                      <div key={lead.id} onClick={() => !isSent && !isSkipped && setSelectedLead(isSelected ? null : lead.id)} style={{ background: isSelected ? "#f7f6f3" : "#fff", border: `1px solid ${isSelected ? "#ccc" : "#eee"}`, borderLeft: `3px solid ${lead.score >= 85 ? "#E24B4A" : lead.score >= 70 ? "#EF9F27" : lead.score >= 50 ? "#85B7EB" : "#B4B2A9"}`, borderRadius: 8, padding: "10px 12px", cursor: isSent || isSkipped ? "default" : "pointer", opacity: isSent || isSkipped ? 0.45 : 1, transition: "all 0.15s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <PriorityDot priority={lead.priority} />
                          <span style={{ fontWeight: 500, fontSize: 13, flex: 1 }}>{lead.name}</span>
                          <ScoreBadge score={lead.score} />
                        </div>
                        <p style={{ fontSize: 11, color: "#888", margin: "3px 0 0 12px" }}>{lead.company} · {lead.role}</p>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5, marginLeft: 12 }}>
                          {lead.signals.slice(0, 2).map((sg, i) => (
                            <span key={i} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: sg.bg, color: sg.color }}>{sg.label}</span>
                          ))}
                          {lead.signals.length > 2 && <span style={{ fontSize: 9, color: "#888" }}>+{lead.signals.length - 2}</span>}
                        </div>
                        {(isSent || isSkipped) && <p style={{ fontSize: 10, color: isSent ? "#0F6E56" : "#888", margin: "4px 0 0 12px", fontWeight: 500 }}>{isSent ? "Sent" : "Skipped"}</p>}
                      </div>
                    );
                  })}
                </div>

                {sl && (
                  <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: 20, maxHeight: 520, overflowY: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 12, color: "#185FA5" }}>{sl.name.split(" ").map(n => n[0]).join("")}</div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{sl.name}</p>
                            <p style={{ fontSize: 12, color: "#888", margin: "1px 0 0" }}>{sl.role}</p>
                          </div>
                        </div>
                      </div>
                      <ScoreBadge score={sl.score} />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "#f0efe9", color: "#555" }}>{sl.company}</span>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "#f0efe9", color: "#555" }}>{sl.stage}</span>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "#f0efe9", color: "#555" }}>{sl.size}</span>
                    </div>

                    <p style={{ fontSize: 11, color: "#888", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>Signals</p>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
                      {sl.signals.map((sg, i) => (
                        <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, background: sg.bg, color: sg.color }}>{sg.label}</span>
                      ))}
                    </div>

                    <p style={{ fontSize: 11, color: "#888", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>Suggested message</p>
                    <div style={{ background: "#FAFAF8", borderRadius: 8, padding: 14, marginBottom: 14, border: "1px solid #f0efe9" }}>
                      {editingId === sl.id ? (
                        <textarea value={slMsg} onChange={e => setEditedMessages({ ...editedMessages, [sl.id]: e.target.value })} style={{ width: "100%", fontSize: 13, lineHeight: 1.6, border: "1px solid #ccc", borderRadius: 6, padding: 10, minHeight: 100, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                      ) : (
                        <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{slMsg}</p>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleSend(sl.id)} style={{ fontSize: 12, padding: "8px 20px", borderRadius: 6, background: "#1a1a1a", color: "#fff", border: "none", cursor: "pointer", fontWeight: 500 }}>Send via email</button>
                      {editingId === sl.id ? (
                        <button onClick={() => setEditingId(null)} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, background: "transparent", color: "#0F6E56", border: "1px solid #0F6E56", cursor: "pointer" }}>Save</button>
                      ) : (
                        <button onClick={() => { setEditingId(sl.id); if (!editedMessages[sl.id]) setEditedMessages({ ...editedMessages, [sl.id]: sl.message }); }} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, background: "transparent", color: "#666", border: "1px solid #ddd", cursor: "pointer" }}>Edit message</button>
                      )}
                      <button onClick={() => handleSkip(sl.id)} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, background: "transparent", color: "#888", border: "1px solid #ddd", cursor: "pointer" }}>Skip</button>
                      <button onClick={() => handleChat(`Tell me more about ${sl.name} at ${sl.company}`)} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, background: "transparent", color: "#185FA5", border: "1px solid #85B7EB", cursor: "pointer" }}>Ask Claude</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Claude chat */}
        <div style={{ width: 340, flexShrink: 0, background: "#fff", border: "1px solid #eee", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden", height: "calc(100vh - 100px)", position: "sticky", top: 16 }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 8, background: "#FAFAF8" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#D4A574", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#fff"/></svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Claude</span>
            <span style={{ fontSize: 11, color: "#888" }}>{ROLE_LABEL} copilot</span>
          </div>

          <div style={{ flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {chatMsgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.from === "user" ? "flex-end" : "flex-start", maxWidth: "92%", background: m.from === "user" ? "#E6F1FB" : "#FAFAF8", borderRadius: m.from === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px", padding: "10px 14px", border: m.from === "user" ? "none" : "1px solid #f0efe9" }}>
                <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{renderText(m.text)}</p>
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: "flex-start", background: "#FAFAF8", borderRadius: "10px 10px 10px 2px", padding: "10px 14px", border: "1px solid #f0efe9" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#ccc", animation: `pulse 1s ${i * 0.2}s infinite` }} />)}
                </div>
                <style>{`@keyframes pulse { 0%,100% { opacity:0.3 } 50% { opacity:1 } }`}</style>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: "10px 14px", borderTop: "1px solid #eee", background: "#FAFAF8" }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {CHAT_SUGGESTIONS.map((sg, i) => (
                <button key={i} onClick={() => handleChat(sg)} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 5, background: "#fff", color: "#666", border: "1px solid #e0e0e0", cursor: "pointer" }}>{sg}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChat()} placeholder="Ask about your pipeline..." style={{ flex: 1, fontSize: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", outline: "none", background: "#fff" }} />
              <button onClick={() => handleChat()} style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8, background: "#1a1a1a", color: "#fff", border: "none", cursor: "pointer", fontWeight: 500 }}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
