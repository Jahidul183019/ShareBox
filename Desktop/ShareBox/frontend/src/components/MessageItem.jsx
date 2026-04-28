import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/atom-one-dark.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function resolveUploadUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (API_BASE) return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  return url;
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function shortId(id) {
  if (!id) return '';
  return id.length > 4 ? id.slice(-4) : id;
}

const QUICK_REACTIONS = ['👍', '❤️', '🥰', '😢', '😆', '😮', '😠'];
const MOBILE_BREAKPOINT = 768;
const LONG_PRESS_MS = 650;
const SWIPE_TRIGGER_PX = 68;
const SWIPE_MAX_VERTICAL_DRIFT_PX = 34;
const GESTURE_IGNORE_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'video',
  '.message-tools',
  '.media-wrap',
  '.code-block',
  '.message-edit-box',
  '.message-reply-preview',
].join(',');

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
}

function useMessageGestures({ enabled, onLongPress, onSwipeRight }) {
  const longPressTimerRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0 });
  const trackingRef = useRef(false);
  const longPressTriggeredRef = useRef(false);
  const swipeTriggeredRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const onTouchStart = useCallback((event) => {
    if (!enabled || event.touches.length !== 1) return;
    const target = event.target;
    if (target instanceof Element && target.closest(GESTURE_IGNORE_SELECTOR)) return;

    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
    trackingRef.current = true;
    longPressTriggeredRef.current = false;
    swipeTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      if (!trackingRef.current || swipeTriggeredRef.current) return;
      longPressTriggeredRef.current = true;
      onLongPress?.();
    }, LONG_PRESS_MS);
  }, [clearLongPressTimer, enabled, onLongPress]);

  const onTouchMove = useCallback((event) => {
    if (!enabled || !trackingRef.current || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - startRef.current.x;
    const dy = touch.clientY - startRef.current.y;

    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearLongPressTimer();
    }

    if (
      !longPressTriggeredRef.current
      && !swipeTriggeredRef.current
      && dx > SWIPE_TRIGGER_PX
      && Math.abs(dy) <= SWIPE_MAX_VERTICAL_DRIFT_PX
    ) {
      swipeTriggeredRef.current = true;
      trackingRef.current = false;
      clearLongPressTimer();
      onSwipeRight?.();
    }
  }, [clearLongPressTimer, enabled, onSwipeRight]);

  const onTouchEndOrCancel = useCallback(() => {
    if (!enabled) return;
    trackingRef.current = false;
    clearLongPressTimer();
  }, [clearLongPressTimer, enabled]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd: onTouchEndOrCancel,
    onTouchCancel: onTouchEndOrCancel,
  };
}

function replyTypeLabel(type) {
  if (type === 'image') return '[Image]';
  if (type === 'video') return '[Video]';
  if (type === 'file') return '[File]';
  if (type === 'code') return '[Code]';
  return '';
}

function CodeBlock({ content, language }) {
  const codeRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current) {
      // Let highlight.js pick the language if ours is "plaintext" or unknown
      try {
        if (language && language !== 'plaintext' && hljs.getLanguage(language)) {
          const result = hljs.highlight(content, { language, ignoreIllegals: true });
          codeRef.current.innerHTML = result.value;
        } else {
          const result = hljs.highlightAuto(content);
          codeRef.current.innerHTML = result.value;
        }
      } catch {
        codeRef.current.textContent = content;
      }
    }
  }, [content, language]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{language || 'code'}</span>
        <button className="code-copy" onClick={copy}>
          {copied ? '✓ copied' : 'Copy'}
        </button>
      </div>
      <pre><code ref={codeRef} className={`hljs language-${language || ''}`} /></pre>
    </div>
  );
}

function MessageItem({
  message,
  isSelf,
  userId,
  onOpenMedia,
  onEditMessage,
  onReactMessage,
  onReplyMessage,
  onDeleteMessage,
}) {
  const side = isSelf ? 'self' : 'other';
  const isMobile = useIsMobileViewport();
  const fileUrl = resolveUploadUrl(message.content);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content || '');
  const [reactionMenuOpen, setReactionMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [desktopToolsVisible, setDesktopToolsVisible] = useState(false);
  const toolsRef = useRef(null);

  const canEdit = isSelf && (message.type === 'text' || message.type === 'code');

  useEffect(() => {
    if (!isEditing) {
      setDraft(message.content || '');
    }
  }, [message.content, isEditing]);

  // Only listen for outside clicks while a menu is actually open. Previously
  // the listener was attached for every message permanently, which means a
  // chat with hundreds of messages had hundreds of dormant document
  // listeners firing on every click.
  useEffect(() => {
    if (!reactionMenuOpen && !actionsMenuOpen) return undefined;
    function onDocPointerDown(event) {
      if (toolsRef.current && !toolsRef.current.contains(event.target)) {
        setReactionMenuOpen(false);
        setActionsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('touchstart', onDocPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      document.removeEventListener('touchstart', onDocPointerDown);
    };
  }, [reactionMenuOpen, actionsMenuOpen]);

  function saveEdit() {
    const next = draft.trim();
    if (!next || !onEditMessage) return;
    const ok = onEditMessage(message.id, next, message.language);
    if (ok) setIsEditing(false);
  }

  async function copyMessageContent() {
    const content = message.content || '';
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Ignore clipboard failures.
    }
  }

  function confirmDelete(mode) {
    if (!onDeleteMessage) return;
    const prompt = mode === 'everyone'
      ? 'Unsend this message for everyone? This cannot be undone.'
      : 'Delete this message for you?';
    if (window.confirm(prompt)) {
      onDeleteMessage(message.id, mode);
    }
  }

  // Memoize reaction derivations so reducing the reactions object isn't
  // repeated on every unrelated re-render.
  const reactionEntries = useMemo(
    () =>
      Object.entries(message.reactions || {}).filter(
        ([, users]) => Array.isArray(users) && users.length > 0
      ),
    [message.reactions]
  );

  const closeAllMenus = useCallback(() => {
    setReactionMenuOpen(false);
    setActionsMenuOpen(false);
  }, []);

  const gestureHandlers = useMessageGestures({
    enabled: isMobile,
    onLongPress: () => {
      setActionsMenuOpen(true);
      setReactionMenuOpen(false);
    },
    onSwipeRight: () => {
      onReplyMessage?.(message);
    },
  });

  const showActionsMenu = actionsMenuOpen;

  const showDesktopTools = isMobile || desktopToolsVisible || reactionMenuOpen || actionsMenuOpen;

  function handleMouseEnterMessage() {
    if (isMobile) return;
    setDesktopToolsVisible(true);
  }

  function handleMouseLeaveMessage() {
    if (isMobile) return;
    setDesktopToolsVisible(false);
    closeAllMenus();
  }

  function toggleReactionMenu() {
    setReactionMenuOpen((v) => !v);
    setActionsMenuOpen(false);
  }

  function toggleActionsMenu() {
    setActionsMenuOpen((v) => !v);
    setReactionMenuOpen(false);
  }

  return (
    <div
      className={`message message-${side} message-type-${message.type} ${isMobile ? 'message-mobile' : 'message-desktop'}`}
      onMouseEnter={handleMouseEnterMessage}
      onMouseLeave={handleMouseLeaveMessage}
      onTouchStart={gestureHandlers.onTouchStart}
      onTouchMove={gestureHandlers.onTouchMove}
      onTouchEnd={gestureHandlers.onTouchEnd}
      onTouchCancel={gestureHandlers.onTouchCancel}
    >
      <div className="message-meta">
        <span className="message-author">
          {isSelf ? 'You' : `User ${shortId(message.user_id)}`}
        </span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
        {message.edited_at && <span className="message-edited">edited</span>}
      </div>

      <div className="message-body">
        {message.reply_to && (
          <button
            type="button"
            className="message-reply-preview"
            onClick={() => onReplyMessage?.(message.reply_to)}
          >
            <span className="message-reply-label">
              Reply to {message.reply_to.user_id ? `User ${shortId(message.reply_to.user_id)}` : 'message'}
            </span>
            <span className="message-reply-text">
              {replyTypeLabel(message.reply_to.type)} {message.reply_to.content_preview || ''}
            </span>
          </button>
        )}

        {message.type === 'text' && (
          isEditing ? (
            <div className="message-edit-box">
              <textarea
                className="message-edit-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
              />
              <div className="message-edit-actions">
                <button className="btn-secondary" type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button className="btn-primary" type="button" onClick={saveEdit}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="message-text">{message.content}</div>
          )
        )}

        {message.type === 'code' && (
          isEditing ? (
            <div className="message-edit-box">
              <textarea
                className="message-edit-input message-edit-code"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={8}
                spellCheck={false}
              />
              <div className="message-edit-actions">
                <button className="btn-secondary" type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button className="btn-primary" type="button" onClick={saveEdit}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <CodeBlock content={message.content} language={message.language} />
          )
        )}

        {message.type === 'image' && (
          <div className="media-wrap">
            <button
              className="media-thumb"
              onClick={() => onOpenMedia({ type: 'image', url: fileUrl, filename: message.filename })}
              title={message.filename}
            >
              <img src={fileUrl} alt={message.filename || 'image'} loading="lazy" />
            </button>
            <div className="media-actions">
              <a href={fileUrl} download={message.filename || true} className="download-link">
                Download image
              </a>
            </div>
          </div>
        )}

        {message.type === 'video' && (
          <div className="media-wrap">
            <div className="media-video">
              <video
                src={fileUrl}
                controls
                preload="metadata"
                playsInline
              />
              {message.filename && <div className="media-caption">{message.filename}</div>}
            </div>
            <div className="media-actions">
              <a href={fileUrl} download={message.filename || true} className="download-link">
                Download video
              </a>
            </div>
          </div>
        )}

        {message.type === 'file' && (
          <div className="media-file">
            <a href={fileUrl} download={message.filename || true} className="download-link">
              {message.filename || 'Download file'}
            </a>
          </div>
        )}
      </div>

      <div className="message-footer">
        {reactionEntries.length > 0 && (
          <div className="reactions-row">
            {reactionEntries.map(([emoji, users]) => {
              const reacted = users.includes(userId);
              return (
                <button
                  key={emoji}
                  type="button"
                  className={`reaction-pill ${reacted ? 'active' : ''}`}
                  onClick={() => onReactMessage?.(message.id, emoji)}
                  title={`${users.length} reaction${users.length > 1 ? 's' : ''}`}
                >
                  <span>{emoji}</span>
                  <span>{users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className={`message-tools ${showDesktopTools ? '' : 'is-hidden-desktop'}`} ref={toolsRef}>
          {!isMobile && (
            <div className="message-menu-wrap">
              <button
                type="button"
                className="message-round-tool"
                onClick={toggleReactionMenu}
                aria-haspopup="menu"
                aria-expanded={reactionMenuOpen}
                title="React"
              >
                ☺
              </button>

              {reactionMenuOpen && (
                <div className="reaction-burst-bar" role="menu" aria-label="Message reactions">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="reaction-burst-item"
                      onClick={() => {
                        onReactMessage?.(message.id, emoji);
                        closeAllMenus();
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isMobile && (
            <button
              type="button"
              className="message-round-tool"
              onClick={() => onReplyMessage?.(message)}
              title="Reply"
            >
              ↩
            </button>
          )}

          <div className="message-menu-wrap">
            <button
              type="button"
              className="message-round-tool"
              onClick={toggleActionsMenu}
              aria-haspopup="menu"
              aria-expanded={showActionsMenu}
              title="More"
            >
              ⋮
            </button>

            <div
              className={`message-dropdown-menu message-dropdown-menu-actions ${showActionsMenu ? 'is-open' : ''}`}
            >
              {(message.type === 'text' || message.type === 'code') && !isEditing && (
                <button
                  type="button"
                  className="message-dropdown-item"
                  onClick={() => {
                    copyMessageContent();
                    closeAllMenus();
                  }}
                >
                  {message.type === 'code' ? 'Copy code' : 'Copy text'}
                </button>
              )}
              {canEdit && !isEditing && (
                <button
                  type="button"
                  className="message-dropdown-item"
                  onClick={() => {
                    setIsEditing(true);
                    closeAllMenus();
                  }}
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                className="message-dropdown-item"
                onClick={() => {
                  confirmDelete('me');
                  closeAllMenus();
                }}
              >
                Delete for me
              </button>
              {isSelf && (
                <button
                  type="button"
                  className="message-dropdown-item danger"
                  onClick={() => {
                    confirmDelete('everyone');
                    closeAllMenus();
                  }}
                >
                  Unsend for everyone
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// memo: skip re-render when the parent list updates but this specific
// message's props haven't changed. The handlers from Room.jsx are stable
// (useCallback), and the message object only changes when this message is
// edited/reacted/deleted, so the default shallow compare is correct here.
export default memo(MessageItem);
