import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// ─── Toast helpers ──────────────────────────────────────────────────────────

const toastStyle = {
  base: {
    background: "rgba(15, 10, 30, 0.95)",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    borderRadius: "14px",
    color: "#e8e8f0",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14px",
    fontWeight: "500",
    padding: "14px 18px",
    boxShadow: "0 8px 32px rgba(124, 58, 237, 0.25), 0 2px 8px rgba(0,0,0,0.6)",
    backdropFilter: "blur(24px)",
    maxWidth: "360px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
};

const notify = {
  error: (msg) =>
    toast(msg, {
      icon: "✕",
      style: {
        ...toastStyle.base,
        border: "1px solid rgba(236, 72, 153, 0.35)",
        boxShadow: "0 8px 32px rgba(236, 72, 153, 0.2), 0 2px 8px rgba(0,0,0,0.6)",
      },
      iconTheme: { primary: "#ec4899", secondary: "transparent" },
      duration: 4000,
    }),
  success: (msg) =>
    toast(msg, {
      icon: "✓",
      style: {
        ...toastStyle.base,
        border: "1px solid rgba(167, 139, 250, 0.35)",
        boxShadow: "0 8px 32px rgba(124, 58, 237, 0.25), 0 2px 8px rgba(0,0,0,0.6)",
      },
      iconTheme: { primary: "#a78bfa", secondary: "transparent" },
      duration: 3000,
    }),
  loading: (msg) =>
    toast.loading(msg, {
      style: {
        ...toastStyle.base,
        border: "1px solid rgba(167, 139, 250, 0.25)",
      },
      iconTheme: { primary: "#a78bfa", secondary: "rgba(167,139,250,0.15)" },
    }),
  dismiss: (id) => toast.dismiss(id),
};

// ─── Animation variants ─────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 },
  }),
  exit: { opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.22 } },
};

const progressVariants = {
  hidden: { opacity: 0, y: -16, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.45, ease: [0.34, 1.4, 0.64, 1] },
  },
  exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.3, ease: "easeIn" } },
};

const selectVariants = {
  hidden: { opacity: 0, y: -8, scaleY: 0.92 },
  visible: { opacity: 1, y: 0, scaleY: 1, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

const emptyVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

const skeletonGridVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.22, ease: "easeIn" } },
};

const skeletonCardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 },
  }),
};

const historyPanelVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.3, ease: "easeIn" } },
};

const historyItemVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.97 },
  visible: (i) => ({
    opacity: 1, x: 0, scale: 1,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 },
  }),
  exit: { opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.22, ease: "easeIn" } },
};

// ─── History helpers ─────────────────────────────────────────────────────────

const HISTORY_KEY = "ytgrav_download_history";
const MAX_HISTORY = 20;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(items) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch {}
}

function addHistoryEntry(current, filename, type) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    filename, type, timestamp: Date.now(),
  };
  const updated = [entry, ...current].slice(0, MAX_HISTORY);
  saveHistory(updated);
  return updated;
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────

function SkeletonCard({ index }) {
  return (
    <motion.div
      className="card skeleton-card"
      custom={index}
      variants={skeletonCardVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="skeleton-thumb">
        <div className="skeleton-shimmer" />
        <div className="skeleton-badge-wrap">
          <div className="skeleton-block skeleton-badge-pill" />
        </div>
        <div className="skeleton-play-hint">
          <div className="skeleton-play-circle">
            <div className="skeleton-block" style={{ width: 14, height: 14, borderRadius: "50%" }} />
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="skeleton-block skeleton-title-lg" />
        <div className="skeleton-block skeleton-title-md" style={{ marginTop: 8 }} />
        <div className="skeleton-block skeleton-channel" style={{ marginTop: 12 }} />
        <div className="skeleton-block skeleton-duration" style={{ marginTop: 6, marginBottom: 20 }} />
        <div className="skeleton-block skeleton-dropdown" />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <div className="skeleton-block skeleton-btn-primary" />
          <div className="skeleton-block skeleton-btn-secondary" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Animated Waveform SVG for empty history ─────────────────────────────────

function WaveformIcon() {
  return (
    <svg width="48" height="32" viewBox="0 0 48 32" fill="none" style={{ display: "block" }}>
      {[4, 10, 16, 22, 28, 34, 40, 46].map((x, i) => {
        const heights = [8, 20, 14, 28, 10, 22, 16, 6];
        const h = heights[i];
        const y = (32 - h) / 2;
        return (
          <rect
            key={x}
            x={x - 2} y={y} width="4" height={h}
            rx="2"
            fill="url(#waveGrad)"
            opacity={0.3 + i * 0.05}
            style={{
              animation: `waveBar 1.8s ease-in-out ${i * 0.15}s infinite alternate`,
            }}
          />
        );
      })}
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Orbit Empty State ────────────────────────────────────────────────────────

function EmptyOrbit() {
  return (
    <div className="empty-orbit-wrap" aria-hidden="true">
      <div className="empty-orbit-ring empty-orbit-ring-1" />
      <div className="empty-orbit-ring empty-orbit-ring-2" />
      <div className="empty-orbit-ring empty-orbit-ring-3" />
      <div className="empty-orbit-core">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="url(#coreGrad)" strokeWidth="1.5" opacity="0.5" />
          <path d="M12 10.5v11l9-5.5-9-5.5z" fill="url(#coreGrad)" opacity="0.8" />
          <defs>
            <linearGradient id="coreGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="orbit-dot orbit-dot-1" />
      <div className="orbit-dot orbit-dot-2" />
      <div className="orbit-dot orbit-dot-3" />
    </div>
  );
}

// ─── Features Data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "⚡",
    title: "Lightning Fast",
    description: "Downloads start instantly — no queues, no waiting rooms. Gravity-speed media extraction.",
    color: "violet",
    delay: 0,
  },
  {
    icon: "🎵",
    title: "MP3 Conversion",
    description: "Extract crystal-clear audio from any video. Perfect bitrate, perfectly named files.",
    color: "pink",
    delay: 0.06,
  },
  {
    icon: "🎥",
    title: "4K Video Support",
    description: "Pull the highest available quality — from 360p to full 4K Ultra HD, you choose.",
    color: "orange",
    delay: 0.12,
  },
  {
    icon: "📜",
    title: "Download History",
    description: "Every file you've grabbed, tracked locally. Organised, timestamped, always accessible.",
    color: "blue",
    delay: 0.18,
  },
  {
    icon: "🔒",
    title: "Privacy Focused",
    description: "Zero accounts, zero tracking. Your searches and downloads never leave your device.",
    color: "green",
    delay: 0.24,
  },
  {
    icon: "📱",
    title: "Fully Responsive",
    description: "Pixel-perfect on desktop, tablet, and mobile. One interface, every screen.",
    color: "violet",
    delay: 0.30,
  },
];

function FeaturesSection() {
  return (
    <section className="features-section" aria-label="Features">
      <motion.div
        className="section-header"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="section-eyebrow">Why YTGrav</span>
        <h2 className="section-title">Everything you need,<br />nothing you don't</h2>
      </motion.div>

      <div className="features-grid">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            className={`feature-card feature-card--${f.color}`}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: f.delay }}
            whileHover={{
              y: -6,
              scale: 1.02,
              transition: { duration: 0.22, ease: "easeOut" },
            }}
          >
            <div className="feature-icon-wrap" aria-hidden="true">
              <span className="feature-icon">{f.icon}</span>
              <div className="feature-icon-glow" />
            </div>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.description}</p>
            <div className="feature-card-shine" aria-hidden="true" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Privacy Section ──────────────────────────────────────────────────────────

const PRIVACY_ITEMS = [
  "No login required",
  "No accounts needed",
  "No personal data collected",
  "No search history stored on servers",
  "Downloads handled locally on your device",
];

function PrivacySection() {
  return (
    <motion.section
      className="privacy-section"
      aria-label="Privacy"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="privacy-card">
        <div className="privacy-card-shine" aria-hidden="true" />
        <div className="privacy-top">
          <div className="privacy-icon-wrap" aria-hidden="true">🔒</div>
          <div>
            <div className="privacy-eyebrow">Commitment</div>
            <h3 className="privacy-title">Privacy First</h3>
          </div>
        </div>
        <ul className="privacy-list" role="list">
          {PRIVACY_ITEMS.map((item, i) => (
            <motion.li
              key={item}
              className="privacy-item"
              initial={{ opacity: 0, x: -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: i * 0.055 }}
            >
              <span className="privacy-check" aria-hidden="true">✓</span>
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-glow" aria-hidden="true" />
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo" aria-label="YTGrav">YTGrav</span>
          <p className="footer-tagline">Pull Media At The Speed Of Gravity</p>
          <div className="footer-built">
            <span className="footer-built-label">Built with</span>
            <div className="footer-stack">
              {["React", "Django", "yt-dlp"].map((tech) => (
                <span key={tech} className="footer-tech-badge">{tech}</span>
              ))}
            </div>
          </div>
        </div>

        <nav className="footer-nav" aria-label="Footer navigation">
          <div className="footer-nav-group">
            <span className="footer-nav-label">Navigate</span>
            <button className="footer-link" onClick={() => scrollTo("features-section")}>Features</button>
            <button className="footer-link" onClick={() => scrollTo("privacy-section")}>Privacy</button>
            <button className="footer-link" onClick={() => scrollTo("history-section")}>History</button>
          </div>
          <div className="footer-nav-group">
            <span className="footer-nav-label">Info</span>
            <span className="footer-link footer-link--static">Version 1.0</span>
            <span className="footer-link footer-link--static">Open Source</span>
          </div>
        </nav>
      </div>

      <div className="footer-bottom">
        <div className="footer-divider" aria-hidden="true" />
        <div className="footer-bottom-row">
          <span className="footer-copy">© {new Date().getFullYear()} YTGrav</span>
          <span className="footer-copy footer-copy--muted">For personal use only. Respect copyright laws.</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Enhanced Empty State ─────────────────────────────────────────────────────

function EmptyStateEnhanced() {
  const highlights = [
    { icon: "⚡", label: "Lightning Fast" },
    { icon: "🎵", label: "MP3 & MP4" },
    { icon: "🎥", label: "Up to 4K" },
    { icon: "🔒", label: "Private" },
  ];

  return (
    <motion.div
      className="empty-state"
      variants={emptyVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      aria-label="Start searching for videos"
    >
      <EmptyOrbit />
      <p className="empty-eyebrow">Ready to pull media</p>
      <h2 className="empty-headline">Search anything</h2>
      <p className="empty-sub">Songs, videos, playlists — YTGrav fetches it all at gravity speed.</p>

      <div className="empty-highlights" aria-label="Key features">
        {highlights.map((h, i) => (
          <motion.div
            key={h.label}
            className="empty-highlight-pill"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.38, delay: 0.3 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="empty-highlight-icon" aria-hidden="true">{h.icon}</span>
            <span className="empty-highlight-label">{h.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="empty-hints" aria-label="Search suggestions">
        {["lofi hip hop", "movie trailers", "podcast episodes", "music videos"].map((hint, i) => (
          <motion.span
            key={hint}
            className="empty-hint-chip"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.55 + i * 0.06 }}
          >
            {hint}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [formats, setFormats] = useState({});
  const [selectedFormats, setSelectedFormats] = useState({});
  const [searchFocused, setSearchFocused] = useState(false);

  const [history, setHistory] = useState(() => loadHistory());
  const [historyExpanded, setHistoryExpanded] = useState(true);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim()) searchVideos();
      else setVideos([]);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  const fetchProgress = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/progress/");
      setProgress(response.data.progress);
    } catch (error) { console.log(error); }
  };

  const fetchFormats = async (url) => {
    if (formats[url]) return;
    const tid = notify.loading("Fetching available qualities…");
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/formats/", { url });
      setFormats((prev) => ({ ...prev, [url]: response.data }));
      notify.dismiss(tid);
      notify.success("Qualities loaded");
    } catch (error) {
      console.log(error);
      notify.dismiss(tid);
      notify.error("Could not load qualities");
    }
  };

  const searchVideos = async () => {
    if (!query) return;
    try {
      setLoading(true);
      const response = await axios.post("http://127.0.0.1:8000/api/search/", { query });
      setVideos(response.data);
    } catch (error) {
      console.log(error);
      notify.error(error.response?.data?.error || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadVideo = async (url, formatId) => {
    setDownloading(true);
    const tid = notify.loading("Preparing your video…");
    const interval = setInterval(fetchProgress, 500);
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/download/video/",
        { url, format_id: formatId },
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "video/mp4" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const filename = decodeFilename(response.headers["x-filename"]) || "video.mp4";
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      notify.dismiss(tid);
      notify.success("Video downloaded successfully");
      setHistory((prev) => addHistoryEntry(prev, filename, "MP4"));
    } catch (error) {
      console.log(error);
      notify.dismiss(tid);
      notify.error(error.response?.data?.error || "Video download failed");
    } finally {
      clearInterval(interval);
      setTimeout(() => { setDownloading(false); setProgress(0); }, 1000);
    }
  };

  const downloadMP3 = async (url) => {
    setDownloading(true);
    const tid = notify.loading("Extracting audio…");
    const interval = setInterval(fetchProgress, 500);
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/download/mp3/",
        { url },
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "audio/mpeg" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const filename = decodeFilename(response.headers["x-filename"]) || "audio.mp3";
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      notify.dismiss(tid);
      notify.success("MP3 downloaded successfully");
      setHistory((prev) => addHistoryEntry(prev, filename, "MP3"));
    } catch (error) {
      console.log(error);
      notify.dismiss(tid);
      notify.error(error.response?.data?.error || "MP3 download failed");
    } finally {
      clearInterval(interval);
      setTimeout(() => { setDownloading(false); setProgress(0); }, 1000);
    }
  };

  const decodeFilename = (raw) => {
    if (!raw) return null;
    try {
      const match = raw.match(/=\?utf-8\?q\?(.*?)\?=/i);
      if (match) {
        const decoded = match[1]
          .replace(/_/g, " ")
          .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        return decodeURIComponent(escape(decoded));
      }
    } catch (e) { console.warn("Filename decode failed:", e); }
    return raw;
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    notify.success("History cleared");
  };

  const showResults = !loading && videos.length > 0;
  const showEmpty = !loading && videos.length === 0 && query === "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --violet: #7c3aed;
          --violet-light: #a78bfa;
          --violet-soft: rgba(167,139,250,0.12);
          --pink: #ec4899;
          --orange: #f97316;
          --blue: #3b82f6;
          --green: #10b981;
          --surface: rgba(255,255,255,0.03);
          --surface-hover: rgba(255,255,255,0.055);
          --border: rgba(255,255,255,0.07);
          --border-accent: rgba(167,139,250,0.25);
          --text-primary: #f0f0f8;
          --text-secondary: rgba(200,200,220,0.55);
          --text-muted: rgba(200,200,220,0.28);
          --radius-card: 22px;
          --radius-btn: 12px;
          --easing: cubic-bezier(0.22, 1, 0.36, 1);
        }

        html { scroll-behavior: smooth; }

        body {
          background: #050508;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overscroll-behavior: none;
        }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.2); border-radius: 100px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(167,139,250,0.4); }

        *:focus-visible {
          outline: 2px solid rgba(167,139,250,0.7);
          outline-offset: 3px;
          border-radius: 6px;
        }

        .app-root {
          min-height: 100vh;
          background: #050508;
          color: var(--text-primary);
          overflow-x: hidden;
          position: relative;
        }

        /* ── Ambient orbs ── */
        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(110px);
          pointer-events: none;
          z-index: 0;
          will-change: transform;
        }
        .orb-1 {
          width: min(700px, 90vw); height: min(700px, 90vw);
          background: radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%);
          top: -180px; left: -180px;
          animation: drift1 20s ease-in-out infinite alternate;
        }
        .orb-2 {
          width: min(600px, 80vw); height: min(600px, 80vw);
          background: radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%);
          bottom: -120px; right: -120px;
          animation: drift2 25s ease-in-out infinite alternate;
        }
        .orb-3 {
          width: min(420px, 70vw); height: min(420px, 70vw);
          background: radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%);
          top: 45%; left: 55%;
          transform: translate(-50%,-50%);
          animation: drift3 32s ease-in-out infinite alternate;
        }
        @keyframes drift1 { from { transform: translate(0,0); } to { transform: translate(70px,55px); } }
        @keyframes drift2 { from { transform: translate(0,0); } to { transform: translate(-55px,-70px); } }
        @keyframes drift3 {
          from { transform: translate(-50%,-50%) scale(1); }
          to   { transform: translate(-50%,-50%) scale(1.28); }
        }

        .noise {
          position: fixed; inset: 0; z-index: 0; opacity: 0.022; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px;
        }

        /* ── Container ── */
        .container {
          max-width: 1300px;
          margin: 0 auto;
          padding: clamp(40px, 8vw, 80px) clamp(16px, 5vw, 48px) 0;
          position: relative; z-index: 1;
        }

        /* ── Header ── */
        .header { text-align: center; margin-bottom: clamp(48px, 8vw, 80px); }

        .logo {
          font-family: 'Syne', sans-serif;
          font-size: clamp(52px, 11vw, 96px);
          font-weight: 800;
          letter-spacing: -0.035em;
          line-height: 1;
          background: linear-gradient(135deg, #a78bfa 0%, #ec4899 45%, #f97316 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          margin-bottom: 14px;
          position: relative; display: inline-block;
          filter: drop-shadow(0 0 40px rgba(167,139,250,0.15));
        }
        .logo::after {
          content: 'YTGrav'; position: absolute; inset: 0;
          background: linear-gradient(135deg, #a78bfa 0%, #ec4899 45%, #f97316 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          filter: blur(22px); opacity: 0.35; z-index: -1; pointer-events: none;
        }

        .tagline {
          color: var(--text-muted);
          font-size: clamp(12px, 2vw, 15px);
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        /* ── Search ── */
        .search-shell {
          position: relative;
          margin-bottom: clamp(32px, 6vw, 56px);
          max-width: 760px; margin-left: auto; margin-right: auto;
        }
        .search-glow {
          position: absolute; inset: -1px; border-radius: 22px;
          background: linear-gradient(135deg, rgba(167,139,250,0.6), rgba(236,72,153,0.5), rgba(249,115,22,0.35));
          opacity: 0; transition: opacity 0.35s ease; z-index: 0; filter: blur(1.5px);
        }
        .search-shell:focus-within .search-glow { opacity: 1; }

        .search-inner {
          position: relative; z-index: 1;
          background: rgba(255,255,255,0.035);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: clamp(4px, 1.2vw, 7px) clamp(4px, 1.2vw, 7px) clamp(4px, 1.2vw, 7px) clamp(14px, 3vw, 22px);
          display: flex; align-items: center; gap: clamp(8px, 2vw, 14px);
          backdrop-filter: blur(28px);
          transition: border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
        }
        .search-shell:focus-within .search-inner {
          background: rgba(255,255,255,0.05);
          border-color: transparent;
          box-shadow: 0 0 0 1px transparent, 0 8px 40px rgba(124,58,237,0.12);
        }

        .search-icon {
          color: rgba(167,139,250,0.6);
          font-size: clamp(16px, 3vw, 20px);
          flex-shrink: 0;
          transition: color 0.25s ease;
          line-height: 1;
        }
        .search-shell:focus-within .search-icon { color: rgba(167,139,250,0.9); }

        .search-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: var(--text-primary);
          font-size: clamp(14px, 2.5vw, 16px);
          font-family: 'DM Sans', sans-serif; font-weight: 400;
          padding: clamp(12px, 2.5vw, 16px) 0;
          min-width: 0;
        }
        .search-input::placeholder { color: var(--text-muted); transition: color 0.25s ease; }
        .search-shell:focus-within .search-input::placeholder { color: rgba(200,200,220,0.2); }

        .search-badge {
          background: linear-gradient(135deg, var(--violet) 0%, var(--pink) 100%);
          border-radius: 14px;
          padding: clamp(9px, 1.5vw, 12px) clamp(14px, 3vw, 22px);
          font-size: clamp(11px, 2vw, 13px); font-weight: 600; letter-spacing: 0.06em;
          color: #fff; white-space: nowrap; flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(124,58,237,0.3);
        }

        .spinner {
          width: 16px; height: 16px; flex-shrink: 0;
          border: 2px solid rgba(167,139,250,0.15); border-top-color: #a78bfa;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Progress card ── */
        .progress-card {
          margin: 0 clamp(16px,5vw,48px) clamp(24px, 4vw, 40px);
          background: rgba(124,58,237,0.055);
          border: 1px solid rgba(124,58,237,0.22);
          border-radius: var(--radius-card);
          padding: clamp(20px, 4vw, 30px) clamp(20px, 4vw, 34px);
          backdrop-filter: blur(28px);
          position: relative; overflow: hidden;
        }
        .progress-card::before {
          content: '';
          position: absolute; top: 0; left: -100%; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.85) 50%, transparent 100%);
          animation: shimmerLine 2.8s ease-in-out infinite;
        }
        .progress-card::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 65%);
          pointer-events: none;
        }
        @keyframes shimmerLine { 0% { left: -100%; } 100% { left: 100%; } }

        .progress-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: clamp(16px, 3vw, 22px);
          gap: 12px;
        }
        .progress-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .progress-dot {
          width: 8px; height: 8px; background: var(--violet-light); border-radius: 50%; flex-shrink: 0;
          animation: pulse 1.2s ease-in-out infinite;
          box-shadow: 0 0 10px rgba(167,139,250,0.8), 0 0 20px rgba(167,139,250,0.4);
        }
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.6); } }

        .progress-label {
          font-size: 11px; font-weight: 600; letter-spacing: 0.15em;
          text-transform: uppercase; color: rgba(167,139,250,0.7); line-height: 1;
        }
        .progress-title {
          font-family: 'Syne', sans-serif; font-size: clamp(14px, 2.5vw, 16px);
          font-weight: 700; color: var(--text-primary); margin-top: 3px;
        }
        .progress-pct {
          font-family: 'Syne', sans-serif;
          font-size: clamp(24px, 5vw, 30px); font-weight: 800; flex-shrink: 0;
          background: linear-gradient(135deg, var(--violet-light), var(--pink));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          line-height: 1;
        }

        .progress-track {
          width: 100%; height: 4px; background: rgba(255,255,255,0.05);
          border-radius: 100px; overflow: hidden; position: relative; margin-bottom: 14px;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--violet), #a855f7, var(--pink), var(--orange));
          background-size: 200% 100%; border-radius: 100px;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative; animation: gradientSlide 1.8s linear infinite;
        }
        .progress-fill::after {
          content: ''; position: absolute; top: -2px; right: -2px; bottom: -2px; width: 40px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55));
          filter: blur(3px);
        }
        @keyframes gradientSlide { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }

        .progress-steps { display: flex; gap: 5px; justify-content: flex-end; }
        .step-pip {
          width: 5px; height: 5px; border-radius: 50%;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.05);
          transition: background 0.3s ease, box-shadow 0.3s ease;
        }
        .step-pip.active { background: rgba(167,139,250,0.55); box-shadow: 0 0 5px rgba(167,139,250,0.5); }

        /* ── Results section ── */
        .results-section {
          padding: 0 clamp(16px, 5vw, 48px);
          margin-bottom: clamp(48px, 8vw, 80px);
        }

        .results-header {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: clamp(16px, 3vw, 24px);
        }
        .results-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: linear-gradient(135deg, var(--violet-light), var(--pink));
          box-shadow: 0 0 8px rgba(167,139,250,0.7);
          animation: pulse 1.8s ease-in-out infinite;
          flex-shrink: 0;
        }
        .results-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.16em;
          text-transform: uppercase; color: rgba(167,139,250,0.55);
        }

        /* ── Grid ── */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr));
          gap: clamp(14px, 2.5vw, 24px);
          margin-top: 8px;
        }

        /* ── Card ── */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          overflow: hidden;
          backdrop-filter: blur(20px);
          position: relative;
          cursor: default;
          transition: border-color 0.25s ease;
        }
        .card::before {
          content: '';
          position: absolute; inset: 0; border-radius: inherit;
          background: linear-gradient(135deg, rgba(167,139,250,0.04) 0%, transparent 60%);
          pointer-events: none; opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 0;
        }
        .card:hover::before { opacity: 1; }

        .thumb-wrap {
          position: relative; overflow: hidden;
          height: clamp(180px, 25vw, 220px);
        }
        .thumb-wrap img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.55s var(--easing);
        }
        .card:hover .thumb-wrap img { transform: scale(1.06); }

        .thumb-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(5,5,8,0) 35%, rgba(5,5,8,0.92) 100%);
          transition: opacity 0.3s ease;
        }
        .thumb-badge {
          position: absolute; bottom: 10px; right: 10px;
          background: rgba(0,0,0,0.7);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 7px; padding: 3px 9px;
          font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.8);
          letter-spacing: 0.04em;
        }

        .card-body {
          padding: clamp(16px, 3vw, 24px);
          position: relative; z-index: 1;
        }

        .card-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(14px, 2.5vw, 17px);
          font-weight: 700; line-height: 1.38;
          margin: 0 0 9px; color: var(--text-primary);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .card-uploader {
          font-size: 12px; color: var(--text-secondary);
          margin-bottom: 3px; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .card-duration {
          font-size: 11px; color: var(--text-muted);
          margin-bottom: clamp(14px, 2.5vw, 20px);
          letter-spacing: 0.04em;
        }

        .btn-load {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-btn);
          padding: clamp(10px, 1.8vw, 13px) 0;
          color: var(--text-secondary);
          font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          margin-bottom: clamp(10px, 2vw, 14px);
          transition: background 0.22s ease, border-color 0.22s ease, color 0.22s ease, transform 0.18s ease, box-shadow 0.22s ease;
        }
        .btn-load:hover {
          background: var(--violet-soft);
          border-color: var(--border-accent);
          color: var(--violet-light);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(124,58,237,0.12);
        }
        .btn-load:active { transform: translateY(0); }
        .btn-load:focus-visible { outline-color: var(--violet-light); }

        .quality-select {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-btn);
          padding: clamp(10px, 1.8vw, 13px) 38px clamp(10px, 1.8vw, 13px) 14px;
          color: var(--text-primary);
          font-size: 13px; font-family: 'DM Sans', sans-serif; font-weight: 500;
          outline: none; cursor: pointer; margin-bottom: clamp(10px, 2vw, 14px);
          appearance: none; -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23a78bfa' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center;
          transition: border-color 0.22s ease, background-color 0.22s ease, box-shadow 0.22s ease;
        }
        .quality-select:hover { background-color: rgba(255,255,255,0.05); border-color: var(--border-accent); }
        .quality-select:focus { border-color: rgba(167,139,250,0.5); box-shadow: 0 0 0 3px rgba(167,139,250,0.08); }
        .quality-select option { background: #1a1228; color: var(--text-primary); }

        .btn-row { display: flex; gap: clamp(7px, 1.5vw, 11px); margin-top: 4px; }
        .btn {
          flex: 1; border: none; border-radius: var(--radius-btn);
          padding: clamp(12px, 2vw, 15px) 0;
          font-size: clamp(11px, 2vw, 13px); font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          position: relative; overflow: hidden;
          transition: transform 0.18s var(--easing), box-shadow 0.22s ease, opacity 0.18s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .btn::before {
          content: ''; position: absolute; inset: 0;
          background: rgba(255,255,255,0); transition: background 0.18s ease;
        }
        .btn:not(:disabled):hover::before { background: rgba(255,255,255,0.08); }
        .btn:not(:disabled):hover { transform: translateY(-2px); }
        .btn:not(:disabled):active { transform: translateY(0) scale(0.97); }
        .btn:disabled { opacity: 0.38; cursor: not-allowed; }

        .btn-mp4 {
          background: linear-gradient(135deg, var(--violet) 0%, var(--pink) 100%);
          color: #fff;
          box-shadow: 0 4px 18px rgba(124,58,237,0.35);
        }
        .btn-mp4:not(:disabled):hover { box-shadow: 0 8px 28px rgba(124,58,237,0.52); }

        .btn-mp3 {
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(220,220,240,0.85);
        }
        .btn-mp3:not(:disabled):hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.18);
        }

        /* ── Section shared ── */
        .section-header {
          text-align: center;
          margin-bottom: clamp(32px, 6vw, 56px);
        }
        .section-eyebrow {
          display: inline-block;
          font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(167,139,250,0.6);
          margin-bottom: 12px;
          background: rgba(167,139,250,0.07);
          border: 1px solid rgba(167,139,250,0.15);
          border-radius: 100px;
          padding: 5px 14px;
        }
        .section-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(26px, 5vw, 42px);
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.025em;
          line-height: 1.18;
        }

        /* ── Features ── */
        .features-section {
          padding: clamp(56px, 10vw, 100px) clamp(16px, 5vw, 48px);
          position: relative; z-index: 1;
          border-top: 1px solid rgba(255,255,255,0.04);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
          gap: clamp(12px, 2vw, 20px);
        }

        .feature-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: clamp(20px, 3.5vw, 30px);
          position: relative; overflow: hidden;
          backdrop-filter: blur(20px);
          cursor: default;
          transition: border-color 0.28s ease, background 0.28s ease;
        }
        .feature-card:hover {
          background: rgba(255,255,255,0.038);
          border-color: rgba(167,139,250,0.2);
        }
        .feature-card-shine {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.3) 50%, transparent 100%);
          opacity: 0; transition: opacity 0.28s ease;
        }
        .feature-card:hover .feature-card-shine { opacity: 1; }

        .feature-icon-wrap {
          position: relative;
          width: 48px; height: 48px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
          flex-shrink: 0;
        }
        .feature-card--violet .feature-icon-wrap { background: rgba(124,58,237,0.15); border: 1px solid rgba(167,139,250,0.2); }
        .feature-card--pink   .feature-icon-wrap { background: rgba(236,72,153,0.12); border: 1px solid rgba(236,72,153,0.2); }
        .feature-card--orange .feature-icon-wrap { background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.2); }
        .feature-card--blue   .feature-icon-wrap { background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.2); }
        .feature-card--green  .feature-icon-wrap { background: rgba(16,185,129,0.1);  border: 1px solid rgba(16,185,129,0.18); }

        .feature-icon { font-size: 22px; line-height: 1; }

        .feature-icon-glow {
          position: absolute; inset: 0; border-radius: 14px;
          opacity: 0; transition: opacity 0.3s ease;
        }
        .feature-card:hover .feature-icon-glow { opacity: 1; }
        .feature-card--violet:hover .feature-icon-glow { box-shadow: 0 0 20px rgba(124,58,237,0.35); }
        .feature-card--pink:hover   .feature-icon-glow { box-shadow: 0 0 20px rgba(236,72,153,0.3); }
        .feature-card--orange:hover .feature-icon-glow { box-shadow: 0 0 20px rgba(249,115,22,0.28); }
        .feature-card--blue:hover   .feature-icon-glow { box-shadow: 0 0 20px rgba(59,130,246,0.28); }
        .feature-card--green:hover  .feature-icon-glow { box-shadow: 0 0 20px rgba(16,185,129,0.25); }

        .feature-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(15px, 2.2vw, 18px);
          font-weight: 700; color: var(--text-primary);
          margin-bottom: 9px; letter-spacing: -0.01em;
        }
        .feature-desc {
          font-size: clamp(12px, 1.8vw, 14px);
          color: var(--text-secondary);
          line-height: 1.65;
          font-weight: 400;
        }

        /* ── Privacy ── */
        .privacy-section {
          padding: 0 clamp(16px, 5vw, 48px) clamp(56px, 10vw, 100px);
          position: relative; z-index: 1;
        }

        .privacy-card {
          max-width: 640px;
          margin: 0 auto;
          background: rgba(16,185,129,0.04);
          border: 1px solid rgba(16,185,129,0.14);
          border-radius: var(--radius-card);
          padding: clamp(24px, 5vw, 40px);
          position: relative; overflow: hidden;
          backdrop-filter: blur(24px);
        }
        .privacy-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.5) 40%, rgba(167,139,250,0.4) 70%, transparent 100%);
        }
        .privacy-card-shine {
          position: absolute; inset: 0; border-radius: inherit;
          background: radial-gradient(ellipse at 0% 0%, rgba(16,185,129,0.06) 0%, transparent 60%);
          pointer-events: none;
        }

        .privacy-top {
          display: flex; align-items: center; gap: 16px;
          margin-bottom: clamp(20px, 4vw, 28px);
        }
        .privacy-icon-wrap {
          width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
          background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
        }
        .privacy-eyebrow {
          font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(16,185,129,0.65); margin-bottom: 4px;
        }
        .privacy-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(18px, 3vw, 22px);
          font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;
        }

        .privacy-list {
          list-style: none;
          display: flex; flex-direction: column; gap: 10px;
        }
        .privacy-item {
          display: flex; align-items: center; gap: 12px;
          font-size: clamp(13px, 2vw, 15px);
          color: rgba(220,220,240,0.75);
          font-weight: 400;
          line-height: 1.5;
        }
        .privacy-check {
          width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0;
          background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.22);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          color: #10b981;
        }

        /* ── History panel ── */
        .history-section {
          padding: 0 clamp(16px, 5vw, 48px) clamp(56px, 10vw, 80px);
          position: relative; z-index: 1;
        }

        .history-section-header {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: clamp(16px, 3vw, 24px);
        }

        .history-panel {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(167,139,250,0.15);
          border-radius: var(--radius-card);
          backdrop-filter: blur(28px);
          overflow: hidden; position: relative;
        }
        .history-panel::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.55) 40%, rgba(236,72,153,0.45) 70%, transparent 100%);
        }

        .history-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: clamp(16px, 3vw, 22px) clamp(16px, 3.5vw, 28px);
          cursor: pointer; user-select: none;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.2s ease;
          gap: 10px;
        }
        .history-header:hover { background: rgba(255,255,255,0.018); }
        .history-header:focus-visible { outline: 2px solid rgba(167,139,250,0.5); outline-offset: -2px; border-radius: inherit; }

        .history-header-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
        .history-icon-wrap {
          width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(124,58,237,0.28), rgba(236,72,153,0.18));
          border: 1px solid rgba(167,139,250,0.2);
          display: flex; align-items: center; justify-content: center; font-size: 15px;
        }
        .history-label {
          font-size: 10px; font-weight: 700; letter-spacing: 0.16em;
          text-transform: uppercase; color: rgba(167,139,250,0.6); line-height: 1;
        }
        .history-title {
          font-family: 'Syne', sans-serif; font-size: clamp(13px, 2.5vw, 15px);
          font-weight: 700; color: var(--text-primary); margin-top: 3px; line-height: 1;
        }

        .history-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .history-count {
          background: rgba(124,58,237,0.18); border: 1px solid rgba(167,139,250,0.22);
          border-radius: 100px; padding: 3px 10px;
          font-size: 11px; font-weight: 700; color: rgba(167,139,250,0.8); letter-spacing: 0.06em;
        }
        .history-clear-btn {
          background: rgba(236,72,153,0.07); border: 1px solid rgba(236,72,153,0.18);
          border-radius: 8px; padding: clamp(5px,1vw,7px) clamp(10px,2vw,14px);
          font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
          color: rgba(236,72,153,0.65); cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease;
          white-space: nowrap;
        }
        .history-clear-btn:hover {
          background: rgba(236,72,153,0.14); border-color: rgba(236,72,153,0.38); color: var(--pink);
          transform: translateY(-1px);
        }
        .history-clear-btn:active { transform: translateY(0); }

        .history-chevron {
          color: rgba(167,139,250,0.45); display: flex; align-items: center;
          transition: transform 0.35s var(--easing), color 0.2s ease;
        }
        .history-chevron.open { transform: rotate(180deg); }
        .history-header:hover .history-chevron { color: rgba(167,139,250,0.75); }

        .history-list { padding: clamp(10px,2vw,14px) clamp(10px,2vw,14px) clamp(12px,2vw,16px); display: flex; flex-direction: column; gap: 5px; }

        .history-item {
          display: flex; align-items: center; gap: clamp(10px,2vw,14px);
          padding: clamp(10px,2vw,13px) clamp(12px,2.5vw,16px);
          border-radius: 14px;
          background: var(--surface); border: 1px solid rgba(255,255,255,0.045);
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.18s ease;
          position: relative; overflow: hidden; min-width: 0;
        }
        .history-item:hover {
          background: rgba(167,139,250,0.05);
          border-color: rgba(167,139,250,0.14);
          transform: translateX(3px);
        }
        .history-item::after {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2.5px; border-radius: 0 2px 2px 0;
        }
        .history-item.mp3::after { background: linear-gradient(180deg, var(--violet-light), var(--pink)); }
        .history-item.mp4::after { background: linear-gradient(180deg, var(--violet), var(--orange)); }

        .history-type-badge {
          width: clamp(32px,5vw,38px); height: clamp(32px,5vw,38px);
          border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: clamp(14px,2.5vw,16px);
        }
        .history-type-badge.mp3 { background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.2); }
        .history-type-badge.mp4 { background: rgba(249,115,22,0.07); border: 1px solid rgba(249,115,22,0.18); }

        .history-item-info { flex: 1; min-width: 0; }
        .history-filename {
          font-size: clamp(12px,2vw,13px); font-weight: 500; color: rgba(220,220,240,0.85);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.35;
        }
        .history-meta { display: flex; align-items: center; gap: 7px; margin-top: 3px; flex-wrap: wrap; }

        .history-type-tag {
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
          padding: 2px 7px; border-radius: 100px;
        }
        .history-type-tag.mp3 { color: rgba(167,139,250,0.9); background: rgba(167,139,250,0.1); }
        .history-type-tag.mp4 { color: rgba(249,115,22,0.9); background: rgba(249,115,22,0.1); }

        .history-time {
          font-size: 11px; color: var(--text-muted); letter-spacing: 0.02em; white-space: nowrap;
        }

        .history-empty-state {
          padding: clamp(28px,5vw,40px) 0 clamp(24px,4vw,32px);
          text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .history-empty-icon { opacity: 0.55; }
        .history-empty-headline {
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
          color: rgba(200,200,220,0.3); letter-spacing: -0.01em;
        }
        .history-empty-sub { font-size: 12px; color: var(--text-muted); letter-spacing: 0.04em; }

        @keyframes waveBar {
          from { transform: scaleY(1); opacity: 0.3; }
          to   { transform: scaleY(0.3); opacity: 0.15; }
        }

        /* ── Empty state ── */
        .empty-state {
          display: flex; flex-direction: column; align-items: center;
          padding: clamp(40px, 8vw, 80px) clamp(16px, 5vw, 48px) clamp(32px, 6vw, 60px);
          text-align: center; position: relative; z-index: 1;
        }

        .empty-orbit-wrap {
          position: relative;
          width: clamp(140px, 25vw, 190px);
          height: clamp(140px, 25vw, 190px);
          margin-bottom: clamp(28px, 5vw, 40px);
          flex-shrink: 0;
        }
        .empty-orbit-ring {
          position: absolute; border-radius: 50%;
          border: 1px solid transparent;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: orbitSpin linear infinite;
        }
        .empty-orbit-ring-1 {
          width: 100%; height: 100%;
          border-color: rgba(167,139,250,0.12);
          border-top-color: rgba(167,139,250,0.5);
          animation-duration: 8s;
        }
        .empty-orbit-ring-2 {
          width: 72%; height: 72%;
          border-color: rgba(236,72,153,0.1);
          border-bottom-color: rgba(236,72,153,0.45);
          animation-duration: 12s; animation-direction: reverse;
        }
        .empty-orbit-ring-3 {
          width: 44%; height: 44%;
          border-color: rgba(249,115,22,0.08);
          border-left-color: rgba(249,115,22,0.4);
          animation-duration: 6s;
        }
        @keyframes orbitSpin { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }

        .empty-orbit-core {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          display: flex; align-items: center; justify-content: center;
          animation: coreBreath 4s ease-in-out infinite;
        }
        @keyframes coreBreath {
          0%,100% { transform: translate(-50%,-50%) scale(1); filter: drop-shadow(0 0 8px rgba(167,139,250,0.3)); }
          50% { transform: translate(-50%,-50%) scale(1.1); filter: drop-shadow(0 0 16px rgba(167,139,250,0.6)); }
        }

        .orbit-dot {
          position: absolute; width: 6px; height: 6px; border-radius: 50%;
          background: var(--violet-light);
          box-shadow: 0 0 6px rgba(167,139,250,0.8);
          top: 50%; left: 50%;
          transform-origin: 0 0;
        }
        .orbit-dot-1 { animation: orbitDot1 8s linear infinite; }
        .orbit-dot-2 { animation: orbitDot2 12s linear infinite reverse; background: var(--pink); box-shadow: 0 0 6px rgba(236,72,153,0.8); width: 5px; height: 5px; }
        .orbit-dot-3 { animation: orbitDot3 6s linear infinite; background: var(--orange); box-shadow: 0 0 5px rgba(249,115,22,0.7); width: 4px; height: 4px; }

        @keyframes orbitDot1 {
          0%   { transform: translate(-50%,-50%) rotate(0deg) translateX(calc(clamp(70px,12.5vw,95px))) translate(-50%,-50%); }
          100% { transform: translate(-50%,-50%) rotate(360deg) translateX(calc(clamp(70px,12.5vw,95px))) translate(-50%,-50%); }
        }
        @keyframes orbitDot2 {
          0%   { transform: translate(-50%,-50%) rotate(60deg) translateX(calc(clamp(50px,9vw,68px))) translate(-50%,-50%); }
          100% { transform: translate(-50%,-50%) rotate(420deg) translateX(calc(clamp(50px,9vw,68px))) translate(-50%,-50%); }
        }
        @keyframes orbitDot3 {
          0%   { transform: translate(-50%,-50%) rotate(120deg) translateX(calc(clamp(30px,5.5vw,42px))) translate(-50%,-50%); }
          100% { transform: translate(-50%,-50%) rotate(480deg) translateX(calc(clamp(30px,5.5vw,42px))) translate(-50%,-50%); }
        }

        .empty-eyebrow {
          font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
          color: rgba(167,139,250,0.45); margin-bottom: 10px;
        }
        .empty-headline {
          font-family: 'Syne', sans-serif;
          font-size: clamp(20px, 4vw, 28px); font-weight: 800;
          color: rgba(240,240,248,0.55); line-height: 1.2;
          margin-bottom: 10px; letter-spacing: -0.02em;
        }
        .empty-sub {
          font-size: clamp(12px, 2vw, 14px); color: var(--text-muted);
          max-width: 280px; line-height: 1.6; font-weight: 400;
          margin-bottom: 24px;
        }

        .empty-highlights {
          display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;
        }
        .empty-highlight-pill {
          display: flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 100px; padding: 7px 14px;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .empty-highlight-pill:hover {
          background: rgba(167,139,250,0.06);
          border-color: rgba(167,139,250,0.2);
        }
        .empty-highlight-icon { font-size: 14px; line-height: 1; }
        .empty-highlight-label {
          font-size: 12px; font-weight: 600; color: var(--text-secondary);
          white-space: nowrap; letter-spacing: 0.02em;
        }

        .empty-hints {
          display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
        }
        .empty-hint-chip {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 100px; padding: 6px 14px;
          font-size: 12px; color: var(--text-muted); font-weight: 500;
          letter-spacing: 0.03em; white-space: nowrap;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
        }
        .empty-hint-chip:hover {
          border-color: var(--border-accent); color: var(--violet-light);
          background: var(--violet-soft); cursor: default;
        }

        /* ── Skeleton ── */
        .skeleton-card { pointer-events: none; }
        .skeleton-thumb {
          position: relative; overflow: hidden;
          height: clamp(180px,25vw,210px);
          background: rgba(255,255,255,0.025);
        }
        .skeleton-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(105deg,
            rgba(255,255,255,0.00) 0%,
            rgba(255,255,255,0.00) 28%,
            rgba(167,139,250,0.07) 46%,
            rgba(236,72,153,0.05) 52%,
            rgba(255,255,255,0.00) 68%,
            rgba(255,255,255,0.00) 100%);
          background-size: 250% 100%;
          animation: shimmerSweep 2.2s ease-in-out infinite;
        }
        @keyframes shimmerSweep {
          0%   { background-position: 200% center; }
          100% { background-position: -100% center; }
        }
        .skeleton-badge-wrap { position: absolute; bottom: 12px; right: 12px; }
        .skeleton-play-hint {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .skeleton-play-circle {
          width: 42px; height: 42px; border-radius: 50%;
          background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.05);
          display: flex; align-items: center; justify-content: center;
        }
        .skeleton-block {
          border-radius: 7px; background: rgba(255,255,255,0.048);
          position: relative; overflow: hidden;
        }
        .skeleton-block::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg,
            transparent 0%, transparent 28%,
            rgba(167,139,250,0.09) 46%, rgba(236,72,153,0.06) 52%,
            transparent 68%, transparent 100%);
          background-size: 300% 100%;
          animation: shimmerSweep 2.2s ease-in-out infinite;
        }
        .skeleton-title-lg   { height: 17px; width: 88%; border-radius: 6px; }
        .skeleton-title-md   { height: 13px; width: 62%; border-radius: 6px; }
        .skeleton-channel    { height: 12px; width: 44%; border-radius: 5px; }
        .skeleton-duration   { height: 10px; width: 28%; border-radius: 5px; }
        .skeleton-dropdown   { height: 42px; width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.04); }
        .skeleton-btn-primary {
          flex: 1; height: 44px; border-radius: 12px;
          background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.14);
          overflow: hidden; position: relative;
        }
        .skeleton-btn-primary::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg,
            transparent 0%, transparent 28%,
            rgba(167,139,250,0.13) 46%, rgba(236,72,153,0.07) 52%,
            transparent 68%, transparent 100%);
          background-size: 300% 100%;
          animation: shimmerSweep 2.2s ease-in-out infinite;
        }
        .skeleton-btn-secondary {
          flex: 1; height: 44px; border-radius: 12px;
          background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.05);
          overflow: hidden; position: relative;
        }
        .skeleton-btn-secondary::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg,
            transparent 0%, transparent 28%,
            rgba(255,255,255,0.05) 50%,
            transparent 68%, transparent 100%);
          background-size: 300% 100%;
          animation: shimmerSweep 2.2s ease-in-out infinite;
        }
        .skeleton-badge-pill {
          width: 44px; height: 20px; border-radius: 6px;
          background: rgba(0,0,0,0.38); border: 1px solid rgba(255,255,255,0.05);
        }

        .skeleton-label-strip {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: clamp(14px,2.5vw,20px); padding: 0 2px;
        }
        .skeleton-label-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: linear-gradient(135deg, var(--violet), var(--pink));
          animation: pulse 1.5s ease-in-out infinite;
          box-shadow: 0 0 8px rgba(167,139,250,0.65);
          flex-shrink: 0;
        }
        .skeleton-label-text {
          font-size: 11px; font-weight: 600; letter-spacing: 0.15em;
          text-transform: uppercase; color: rgba(167,139,250,0.45);
        }

        /* ── Footer ── */
        .footer {
          position: relative; z-index: 1;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: rgba(5,5,8,0.8);
          backdrop-filter: blur(20px);
          overflow: hidden;
        }
        .footer-glow {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 600px; height: 300px;
          background: radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .footer-inner {
          max-width: 1300px;
          margin: 0 auto;
          padding: clamp(40px, 7vw, 72px) clamp(16px, 5vw, 48px) clamp(28px, 5vw, 48px);
          display: flex;
          gap: clamp(32px, 6vw, 80px);
          flex-wrap: wrap;
          justify-content: space-between;
          position: relative; z-index: 1;
        }
        .footer-brand { flex: 1; min-width: 200px; max-width: 320px; }
        .footer-logo {
          font-family: 'Syne', sans-serif;
          font-size: clamp(22px, 4vw, 30px);
          font-weight: 800; letter-spacing: -0.03em;
          background: linear-gradient(135deg, #a78bfa 0%, #ec4899 60%, #f97316 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          display: block; margin-bottom: 8px;
        }
        .footer-tagline {
          font-size: clamp(11px, 1.8vw, 13px);
          color: var(--text-muted);
          letter-spacing: 0.06em;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .footer-built {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .footer-built-label {
          font-size: 11px; color: var(--text-muted); font-weight: 500; white-space: nowrap;
        }
        .footer-stack { display: flex; gap: 6px; flex-wrap: wrap; }
        .footer-tech-badge {
          font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
          background: rgba(167,139,250,0.08); border: 1px solid rgba(167,139,250,0.15);
          border-radius: 7px; padding: 3px 9px; color: rgba(167,139,250,0.75);
        }

        .footer-nav {
          display: flex; gap: clamp(28px, 5vw, 60px); flex-wrap: wrap;
          align-items: flex-start;
        }
        .footer-nav-group {
          display: flex; flex-direction: column; gap: 10px; min-width: 100px;
        }
        .footer-nav-label {
          font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(167,139,250,0.45); margin-bottom: 2px;
        }
        .footer-link {
          background: none; border: none; padding: 0; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(13px, 2vw, 14px); color: var(--text-secondary); font-weight: 400;
          text-align: left;
          transition: color 0.2s ease;
          line-height: 1.4;
        }
        .footer-link:hover { color: var(--violet-light); }
        .footer-link--static { cursor: default; pointer-events: none; }
        .footer-link--static:hover { color: var(--text-secondary); }

        .footer-bottom {
          position: relative; z-index: 1;
        }
        .footer-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 30%, rgba(167,139,250,0.1) 50%, rgba(255,255,255,0.06) 70%, transparent 100%);
          margin: 0 clamp(16px, 5vw, 48px);
        }
        .footer-bottom-row {
          max-width: 1300px; margin: 0 auto;
          padding: clamp(16px, 3vw, 22px) clamp(16px, 5vw, 48px);
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 8px;
        }
        .footer-copy {
          font-size: 12px; color: var(--text-muted); font-weight: 400; letter-spacing: 0.04em;
        }
        .footer-copy--muted { color: rgba(200,200,220,0.18); font-size: 11px; }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .footer-inner { flex-direction: column; gap: 28px; }
          .footer-brand { max-width: 100%; }
          .footer-nav { gap: 24px; }
          .footer-bottom-row { flex-direction: column; text-align: center; }
          .footer-copy--muted { display: none; }
        }

        @media (max-width: 480px) {
          .history-count { display: none; }
          .history-clear-btn { padding: 6px 10px; font-size: 10px; }
          .search-badge { padding: 9px 12px; }
          .btn-row { gap: 7px; }
          .empty-hints { gap: 6px; }
          .empty-hint-chip { padding: 5px 11px; font-size: 11px; }
          .features-grid { grid-template-columns: 1fr; }
          .footer-nav { flex-direction: column; gap: 20px; }
        }

        @media (max-width: 360px) {
          .logo { letter-spacing: -0.04em; }
          .progress-pct { font-size: 22px; }
        }
      `}</style>

      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{ duration: 3500 }}
        containerStyle={{ top: 24, right: 24 }}
      />

      <div className="app-root">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="noise" aria-hidden="true" />

        {/* ── Hero + Search ── */}
        <div className="container">
          <header className="header">
            <motion.h1
              className="logo"
              initial={{ opacity: 0, y: -28, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            >
              YTGrav
            </motion.h1>
            <motion.p
              className="tagline"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            >
              Pull media at the speed of gravity
            </motion.p>
          </header>

          {/* ── Search ── */}
          <motion.div
            className="search-shell"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.32 }}
          >
            <div className="search-glow" aria-hidden="true" />
            <motion.div
              className="search-inner"
              animate={{ scale: searchFocused ? 1.01 : 1 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search songs, videos, playlists…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="search-input"
                aria-label="Search for YouTube videos"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="spinner"
                    className="spinner"
                    initial={{ opacity: 0, scale: 0.55 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.55 }}
                    transition={{ duration: 0.18 }}
                    role="status"
                    aria-label="Searching…"
                  />
                ) : (
                  <motion.span
                    key="badge"
                    className="search-badge"
                    initial={{ opacity: 0, scale: 0.82 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.82 }}
                    transition={{ duration: 0.18 }}
                    aria-hidden="true"
                  >
                    Search
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Progress card ── */}
        <AnimatePresence>
          {downloading && (
            <motion.div
              className="progress-card"
              variants={progressVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
              role="status"
              aria-live="polite"
              aria-label={`Downloading: ${progress}%`}
            >
              <div className="progress-header">
                <div className="progress-left">
                  <span className="progress-dot" aria-hidden="true" />
                  <div>
                    <div className="progress-label">Downloading</div>
                    <div className="progress-title">Processing your file…</div>
                  </div>
                </div>
                <motion.span
                  className="progress-pct"
                  key={progress}
                  initial={{ opacity: 0.5, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  aria-hidden="true"
                >
                  {progress}%
                </motion.span>
              </div>

              <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>

              <div className="progress-steps" aria-hidden="true">
                {[...Array(8)].map((_, i) => (
                  <span key={i} className={`step-pip${progress >= (i + 1) * 12.5 ? " active" : ""}`} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Video Results (always before everything else) ── */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="skeleton-grid"
              className="results-section"
              variants={skeletonGridVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-busy="true"
              aria-label="Loading results"
            >
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                style={{ gridColumn: "1 / -1", marginBottom: "clamp(14px, 2.5vw, 20px)" }}
              >
                <div className="skeleton-label-strip">
                  <span className="skeleton-label-dot" aria-hidden="true" />
                  <span className="skeleton-label-text">Searching the cosmos…</span>
                </div>
              </motion.div>
              <div className="grid">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`skeleton-nth-${i + 1}`}>
                    <SkeletonCard index={i} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {showResults && (
            <motion.section
              key="results"
              className="results-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
              aria-label="Search results"
            >
              <div className="results-header">
                <span className="results-dot" aria-hidden="true" />
                <span className="results-label">{videos.length} result{videos.length !== 1 ? "s" : ""} found</span>
              </div>
              <div className="grid" role="list">
                {videos.map((video, index) => (
                  <motion.div
                    key={video.url || index}
                    className="card"
                    custom={index}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    role="listitem"
                    whileHover={{
                      y: -6, scale: 1.008,
                      borderColor: "rgba(167,139,250,0.32)",
                      boxShadow: "0 24px 56px rgba(124,58,237,0.16), 0 0 0 1px rgba(167,139,250,0.1)",
                      transition: { duration: 0.22, ease: "easeOut" },
                    }}
                    whileTap={{ scale: 0.988 }}
                  >
                    <div className="thumb-wrap">
                      <img
                        src={video.thumbnail}
                        alt={`Thumbnail for ${video.title}`}
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="thumb-overlay" aria-hidden="true" />
                      {video.duration && (
                        <span className="thumb-badge" aria-label={`Duration: ${video.duration} seconds`}>
                          {video.duration}s
                        </span>
                      )}
                    </div>

                    <div className="card-body">
                      <h2 className="card-title">{video.title}</h2>
                      <p className="card-uploader">{video.uploader}</p>
                      <p className="card-duration">Duration: {video.duration || "N/A"} sec</p>

                      <AnimatePresence mode="wait">
                        {!formats[video.url] ? (
                          <motion.button
                            key="load-btn"
                            onClick={() => fetchFormats(video.url)}
                            className="btn-load"
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.22 }}
                          >
                            ✦ Load Qualities
                          </motion.button>
                        ) : (
                          <motion.select
                            key="quality-select"
                            className="quality-select"
                            variants={selectVariants}
                            initial="hidden"
                            animate="visible"
                            aria-label="Select video quality"
                            onChange={(e) =>
                              setSelectedFormats((prev) => ({ ...prev, [video.url]: e.target.value }))
                            }
                          >
                            <option value="">Best Quality</option>
                            {formats[video.url]?.map((format, i) => (
                              <option key={i} value={format.format_id}>{format.resolution}</option>
                            ))}
                          </motion.select>
                        )}
                      </AnimatePresence>

                      <div className="btn-row">
                        <motion.button
                          disabled={downloading}
                          onClick={() => downloadVideo(video.url, selectedFormats[video.url])}
                          className="btn btn-mp4"
                          aria-label={`Download ${video.title} as MP4`}
                          whileHover={!downloading ? { scale: 1.03, transition: { duration: 0.18 } } : {}}
                          whileTap={!downloading ? { scale: 0.96 } : {}}
                        >
                          MP4
                        </motion.button>
                        <motion.button
                          disabled={downloading}
                          onClick={() => downloadMP3(video.url)}
                          className="btn btn-mp3"
                          aria-label={`Download ${video.title} as MP3`}
                          whileHover={!downloading ? { scale: 1.03, transition: { duration: 0.18 } } : {}}
                          whileTap={!downloading ? { scale: 0.96 } : {}}
                        >
                          MP3
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {showEmpty && (
            <EmptyStateEnhanced key="empty" />
          )}
        </AnimatePresence>

        {/* ── Features Section ── */}
        <div id="features-section">
          <FeaturesSection />
        </div>

        {/* ── Privacy Section ── */}
        <div id="privacy-section">
          <PrivacySection />
        </div>

        {/* ── Download History ── */}
        <section id="history-section" className="history-section" aria-label="Download history">
          <div className="history-section-header">
            <span className="results-dot" aria-hidden="true" style={{ background: "linear-gradient(135deg, #a78bfa, #ec4899)" }} />
            <span className="results-label">Download History</span>
          </div>

          <AnimatePresence>
            <motion.div
              className="history-panel"
              variants={historyPanelVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              layout
            >
              <div
                className="history-header"
                onClick={() => setHistoryExpanded((v) => !v)}
                role="button"
                tabIndex={0}
                aria-expanded={historyExpanded}
                aria-controls="history-list-region"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHistoryExpanded((v) => !v); } }}
              >
                <div className="history-header-left">
                  <div className="history-icon-wrap" aria-hidden="true">⬇</div>
                  <div>
                    <div className="history-label">Recent</div>
                    <div className="history-title">Download History</div>
                  </div>
                </div>
                <div className="history-header-right">
                  {history.length > 0 && (
                    <span className="history-count" aria-label={`${history.length} items`}>{history.length}</span>
                  )}
                  {history.length > 0 && (
                    <motion.button
                      className="history-clear-btn"
                      onClick={(e) => { e.stopPropagation(); clearHistory(); }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label="Clear download history"
                    >
                      Clear
                    </motion.button>
                  )}
                  <span className={`history-chevron${historyExpanded ? " open" : ""}`} aria-hidden="true">
                    <svg width="11" height="7" viewBox="0 0 12 8" fill="none">
                      <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {historyExpanded && (
                  <motion.div
                    id="history-list-region"
                    key="history-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: "auto", opacity: 1,
                      transition: {
                        height: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                        opacity: { duration: 0.28, delay: 0.1 },
                      },
                    }}
                    exit={{
                      height: 0, opacity: 0,
                      transition: {
                        height: { duration: 0.32, ease: "easeIn" },
                        opacity: { duration: 0.14 },
                      },
                    }}
                    style={{ overflow: "hidden" }}
                  >
                    {history.length === 0 ? (
                      <div className="history-empty-state">
                        <div className="history-empty-icon">
                          <WaveformIcon />
                        </div>
                        <div className="history-empty-headline">Nothing downloaded yet</div>
                        <div className="history-empty-sub">Your saved files will appear here</div>
                      </div>
                    ) : (
                      <div className="history-list">
                        <AnimatePresence mode="popLayout">
                          {history.map((item, i) => (
                            <motion.div
                              key={item.id}
                              className={`history-item ${item.type.toLowerCase()}`}
                              custom={i}
                              variants={historyItemVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              layout
                            >
                              <div className={`history-type-badge ${item.type.toLowerCase()}`} aria-hidden="true">
                                {item.type === "MP3" ? "🎵" : "🎥"}
                              </div>
                              <div className="history-item-info">
                                <div className="history-filename" title={item.filename}>
                                  {item.filename}
                                </div>
                                <div className="history-meta">
                                  <span className={`history-type-tag ${item.type.toLowerCase()}`}>
                                    {item.type}
                                  </span>
                                  <span className="history-time">
                                    {formatTimestamp(item.timestamp)}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* ── Footer ── */}
        <Footer />
      </div>
    </>
  );
}

export default App;
