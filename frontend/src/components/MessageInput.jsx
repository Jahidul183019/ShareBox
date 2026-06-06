import { useRef, useState } from 'react';

const LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
  'csharp', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'sql', 'bash',
  'html', 'css', 'json', 'yaml', 'markdown',
];

function replyPreview(message) {
  if (!message) return '';
  if (message.type === 'text' || message.type === 'code') {
    const content = (message.content || '').trim();
    if (!content) return '[Message]';
    return content.length > 120 ? `${content.slice(0, 120)}...` : content;
  }
  if (message.type === 'image') return '[Image]';
  if (message.type === 'video') return '[Video]';
  if (message.type === 'file') return `[File] ${message.filename || ''}`.trim();
  return '[Message]';
}

export default function MessageInput({
  onSendText,
  onSendCode,
  onSendMedia,
  replyTo,
  onCancelReply,
  disabled,
}) {
  const [tab, setTab] = useState('text'); // 'text' | 'code' | 'media'
  const [text, setText] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function handleSendText(e) {
    e?.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (onSendText(value)) setText('');
  }

  async function handleSendCode(e) {
    e?.preventDefault();
    const value = code;
    if (!value.trim()) return;
    if (onSendCode(value, language)) setCode('');
  }

  async function handleFilePicked(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onSendMedia(file);
    } finally {
      setUploading(false);
      // Reset input so picking the same file again still fires onChange
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleTextKeyDown(e) {
    // Enter sends, Shift+Enter inserts a newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }

  function handleCodeKeyDown(e) {
    // Tab inserts 2 spaces so code blocks feel natural
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.target;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = code.slice(0, start) + '  ' + code.slice(end);
      setCode(next);
      // Restore cursor after React re-renders
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
    // Ctrl/Cmd + Enter sends code
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendCode();
    }
  }

  return (
    <div className="input-area">
      {replyTo && (
        <div className="reply-composer-bar">
          <div className="reply-composer-text">
            Replying to {replyTo.user_id ? `User ${String(replyTo.user_id).slice(-4)}` : 'message'}
          </div>
          <div className="reply-composer-preview">{replyPreview(replyTo)}</div>
          <button
            type="button"
            className="reply-composer-cancel"
            onClick={onCancelReply}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="input-tabs">
        <button
          className={`tab ${tab === 'text' ? 'tab-active' : ''}`}
          onClick={() => setTab('text')}
          type="button"
        >
          Text
        </button>
        <button
          className={`tab ${tab === 'code' ? 'tab-active' : ''}`}
          onClick={() => setTab('code')}
          type="button"
        >
          Code
        </button>
        <button
          className={`tab ${tab === 'media' ? 'tab-active' : ''}`}
          onClick={() => setTab('media')}
          type="button"
        >
          Media
        </button>
      </div>

      {tab === 'text' && (
        <form className="text-form" onSubmit={handleSendText}>
          <textarea
            className="text-input"
            placeholder={disabled ? 'Reconnecting…' : 'Type a message (Enter to send, Shift+Enter for newline)'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleTextKeyDown}
            rows={2}
            disabled={disabled}
          />
          <button
            type="submit"
            className="btn btn-primary send-btn"
            disabled={disabled || !text.trim()}
          >
            Send
          </button>
        </form>
      )}

      {tab === 'code' && (
        <form className="code-form" onSubmit={handleSendCode}>
          <div className="code-controls">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="lang-select"
              disabled={disabled}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <span className="hint-inline">Ctrl/⌘ + Enter to send</span>
          </div>
          <textarea
            className="code-input"
            placeholder={disabled ? 'Reconnecting…' : 'Paste code here'}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleCodeKeyDown}
            rows={8}
            spellCheck={false}
            disabled={disabled}
          />
          <button
            type="submit"
            className="btn btn-primary send-btn"
            disabled={disabled || !code.trim()}
          >
            Send code
          </button>
        </form>
      )}

      {tab === 'media' && (
        <div className="media-form">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFilePicked}
            disabled={disabled || uploading}
            className="file-input"
            id="file-input"
          />
          <label htmlFor="file-input" className={`file-label ${disabled || uploading ? 'disabled' : ''}`}>
            {uploading ? 'Uploading…' : 'Choose file'}
          </label>
          <div className="hint-inline">
            Max 50 MB. Images, videos, and other files are supported.
          </div>
        </div>
      )}
    </div>
  );
}
