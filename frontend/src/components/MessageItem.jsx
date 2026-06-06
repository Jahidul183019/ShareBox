import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
const LONG_PRESS_CANCEL_DRIFT_PX = 14;
const GESTURE_DIRECTION_LOCK_PX = 8;
const ACTIONS_MENU_WIDTH_ESTIMATE_PX = 208;
const ACTIONS_MENU_HEIGHT_ESTIMATE_PX = 228;
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

function useMessageGestures({
  enabled,
  onLongPress,
  onSwipeRight,
  onSwipeProgress,
  onSwipeRelease,
}) {
  const longPressTimerRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0 });
  const maxDxRef = useRef(0);
  const trackingRef = useRef(false);
  const lockRef = useRef('none');
  const longPressTriggeredRef = useRef(false);

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
    lockRef.current = 'none';
    maxDxRef.current = 0;
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      if (!trackingRef.current) return;
      longPressTriggeredRef.current = true;
      onLongPress?.();
    }, LONG_PRESS_MS);
  }, [clearLongPressTimer, enabled, onLongPress]);

  const onTouchMove = useCallback((event) => {
    if (!enabled || !trackingRef.current || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - startRef.current.x;
    const dy = touch.clientY - startRef.current.y;

    if (lockRef.current === 'none' && (Math.abs(dx) > GESTURE_DIRECTION_LOCK_PX || Math.abs(dy) > GESTURE_DIRECTION_LOCK_PX)) {
      lockRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }

    if (Math.abs(dx) > LONG_PRESS_CANCEL_DRIFT_PX || Math.abs(dy) > LONG_PRESS_CANCEL_DRIFT_PX || lockRef.current === 'vertical') {
      clearLongPressTimer();
    }

    // Stream live progress for rightward, mostly-horizontal drags so the
    // message can visually translate under the finger. Vertical scrolls
    // never satisfy the dy guard, so they pass through untouched.
    if (
      !longPressTriggeredRef.current
      && lockRef.current !== 'vertical'
      && dx > 0
      && Math.abs(dy) <= SWIPE_MAX_VERTICAL_DRIFT_PX
    ) {
      // Keep horizontal reply drags buttery by suppressing scroll only while
      // the drag is clearly horizontal and rightward.
      if (event.cancelable) event.preventDefault();
      maxDxRef.current = Math.max(maxDxRef.current, dx);
      onSwipeProgress?.(dx);
    }

    if (maxDxRef.current > SWIPE_TRIGGER_PX) {
      clearLongPressTimer();
    }
  }, [clearLongPressTimer, enabled, onSwipeProgress]);

  const onTouchEndOrCancel = useCallback((event) => {
    if (!enabled) return;
    const isCancel = event?.type === 'touchcancel';
    const shouldReply = !isCancel
      && !longPressTriggeredRef.current
      && lockRef.current !== 'vertical'
      && maxDxRef.current > SWIPE_TRIGGER_PX;

    trackingRef.current = false;
    clearLongPressTimer();
    maxDxRef.current = 0;
    lockRef.current = 'none';
    if (shouldReply) onSwipeRight?.();
    onSwipeRelease?.();
  }, [clearLongPressTimer, enabled, onSwipeRelease, onSwipeRight]);

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
  const [actionsMenuAlign, setActionsMenuAlign] = useState(isSelf ? 'right' : 'left');
  const [actionsMenuVertical, setActionsMenuVertical] = useState('down');
  const [desktopToolsVisible, setDesktopToolsVisible] = useState(false);
  const toolsRef = useRef(null);
  const mobileReactionRef = useRef(null);

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
      const insideTools = toolsRef.current?.contains(event.target);
      const insideMobileReactions = mobileReactionRef.current?.contains(event.target);
      if (!insideTools && !insideMobileReactions) {
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

  // Mobile swipe-to-reply visual feedback. The bubble translates under the
  // finger and a reply icon fades in on the left so the gesture is
  // discoverable. We mutate the DOM directly instead of going through
  // useState because touchmove fires every frame — re-rendering on each
  // event would tank scroll smoothness.
  const messageRef = useRef(null);
  const swipeRafRef = useRef(0);
  const latestSwipeDxRef = useRef(0);

  useEffect(() => () => {
    if (swipeRafRef.current) {
      cancelAnimationFrame(swipeRafRef.current);
      swipeRafRef.current = 0;
    }
  }, []);

  const writeSwipeOffset = useCallback((dx) => {
    const el = messageRef.current;
    if (!el) return;
    // Follow the finger closely with a light rubber-band near the cap.
    const linear = dx * 0.82;
    const softCapStart = 88;
    const pastCap = Math.max(0, linear - softCapStart);
    const display = Math.max(0, Math.min(softCapStart + pastCap * 0.18, 102));
    const trigger = SWIPE_TRIGGER_PX * 0.82;
    el.style.setProperty('--swipe-x', `${display}px`);
    el.style.setProperty('--swipe-progress', `${Math.min(dx / trigger, 1)}`);
    el.classList.add('is-swiping');
  }, []);

  const applySwipeOffset = useCallback((dx) => {
    latestSwipeDxRef.current = dx;
    if (swipeRafRef.current) return;
    swipeRafRef.current = requestAnimationFrame(() => {
      swipeRafRef.current = 0;
      writeSwipeOffset(latestSwipeDxRef.current);
    });
  }, [writeSwipeOffset]);

  const releaseSwipe = useCallback(() => {
    if (swipeRafRef.current) {
      cancelAnimationFrame(swipeRafRef.current);
      swipeRafRef.current = 0;
    }
    const el = messageRef.current;
    if (!el) return;
    el.style.setProperty('--swipe-x', '0px');
    el.style.setProperty('--swipe-progress', '0');
    el.classList.remove('is-swiping');
  }, []);

  const gestureHandlers = useMessageGestures({
    enabled: isMobile,
    onLongPress: () => {
      // Long-press surfaces the reactions burst bar above the bubble.
      // The actions menu stays behind a deliberate [⋮] tap so the long-press
      // popup stays focused on a single decision (which reaction to send).
      setReactionMenuOpen(true);
      setActionsMenuOpen(false);
    },
    onSwipeRight: () => {
      onReplyMessage?.(message);
    },
    onSwipeProgress: applySwipeOffset,
    onSwipeRelease: releaseSwipe,
  });

  // For mobile, render the reaction burst bar into a fixed-position portal
  // so it won't be clipped by scrolling/overflow containers and remains
  // reliably tappable above the message bubble.
  const [mobileReactionStyle, setMobileReactionStyle] = useState(null);
  useEffect(() => {
    if (!reactionMenuOpen || !isMobile) {
      setMobileReactionStyle(null);
      return;
    }
    const el = messageRef.current;
    if (!el) return;

    function updatePos() {
      const rect = el.getBoundingClientRect();
      const top = Math.max(8, rect.top - 56); // keep on-screen
      const isSelfClass = el.classList.contains('message-self');
      const estimatedWidth = Math.min(window.innerWidth - 16, 304);
      const anchorLeft = isSelfClass ? rect.right - estimatedWidth : rect.left;
      const left = Math.max(8, Math.min(anchorLeft, window.innerWidth - estimatedWidth - 8));
      setMobileReactionStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        maxWidth: 'calc(100vw - 16px)',
        zIndex: 100000,
      });
    }

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, { passive: true });
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos);
    };
  }, [reactionMenuOpen, isMobile]);

  const showActionsMenu = actionsMenuOpen;
  const hasOpenMenu = showActionsMenu || reactionMenuOpen;

  // On mobile, always show tools. On desktop, show only on hover or when menus are open
  const showDesktopTools = isMobile || desktopToolsVisible || reactionMenuOpen || actionsMenuOpen;

  function handleMouseEnterMessage() {
    if (isMobile) return;
    setDesktopToolsVisible(true);
  }

  function handleMouseLeaveMessage() {
    if (isMobile) return;
    // If a menu is open, leave everything alone. The dropdown panel extends
    // outside the message bounds, so moving the cursor into an option fires
    // mouseleave on this div — closing the menu here would kill the option
    // click. Outside-click handles dismissal when the user clicks elsewhere.
    if (reactionMenuOpen || actionsMenuOpen) return;
    setDesktopToolsVisible(false);
  }

  function toggleReactionMenu() {
    setReactionMenuOpen((v) => !v);
    setActionsMenuOpen(false);
  }

  function toggleActionsMenu() {
    if (!actionsMenuOpen) {
      const menuWidth = ACTIONS_MENU_WIDTH_ESTIMATE_PX;
      const menuHeight = ACTIONS_MENU_HEIGHT_ESTIMATE_PX;
      const btn = toolsRef.current?.querySelector('.message-round-tool[title="More"]');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const rightRoom = window.innerWidth - rect.left;
        const leftRoom = rect.right;
        const belowRoom = window.innerHeight - rect.bottom;
        const aboveRoom = rect.top;
        const fitsLeftAlign = rightRoom >= menuWidth;
        const fitsRightAlign = leftRoom >= menuWidth;
        const shouldOpenUp = belowRoom < menuHeight && aboveRoom > belowRoom;

        if (fitsLeftAlign && !fitsRightAlign) {
          setActionsMenuAlign('left');
        } else if (!fitsLeftAlign && fitsRightAlign) {
          setActionsMenuAlign('right');
        } else if (fitsLeftAlign && fitsRightAlign) {
          setActionsMenuAlign(rightRoom >= leftRoom ? 'left' : 'right');
        } else {
          setActionsMenuAlign(isSelf ? 'right' : 'left');
        }
        setActionsMenuVertical(shouldOpenUp ? 'up' : 'down');
      } else {
        setActionsMenuAlign(isSelf ? 'right' : 'left');
        setActionsMenuVertical('down');
      }
    }
    setActionsMenuOpen((v) => !v);
    setReactionMenuOpen(false);
  }

  return (
    <div
      ref={messageRef}
      className={`message message-${side} message-type-${message.type} ${isMobile ? 'message-mobile' : 'message-desktop'} ${hasOpenMenu ? 'message-menu-open' : ''}`}
      onMouseEnter={handleMouseEnterMessage}
      onMouseLeave={handleMouseLeaveMessage}
      onTouchStart={gestureHandlers.onTouchStart}
      onTouchMove={gestureHandlers.onTouchMove}
      onTouchEnd={gestureHandlers.onTouchEnd}
      onTouchCancel={gestureHandlers.onTouchCancel}
    >
      {isMobile && reactionMenuOpen && mobileReactionStyle && createPortal(
        <div
          ref={mobileReactionRef}
          style={mobileReactionStyle}
          className="reaction-burst-bar reaction-burst-bar-mobile"
          role="menu"
          aria-label="Message reactions"
        >
          {QUICK_REACTIONS.map((emoji) => {
                const hasReacted = message.reactions?.[emoji]?.includes(userId);
                return (
                  <button
                    key={emoji}
                    type="button"
                    className="reaction-burst-item"
                    onClick={() => {
                      onReactMessage?.(message.id, emoji, hasReacted ? 'remove' : 'add');
                      closeAllMenus();
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
        </div>,
        document.body,
      )}

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
                  onClick={() => {
                    // If user already reacted with this emoji, remove it; otherwise add it
                    if (reacted) {
                      onReactMessage?.(message.id, emoji, 'remove');
                    } else {
                      onReactMessage?.(message.id, emoji, 'add');
                    }
                  }}
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
          <div className="message-menu-wrap">
            {isMobile ? (
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
            ) : (
              <>
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
                    {QUICK_REACTIONS.map((emoji) => {
                      const hasReacted = message.reactions?.[emoji]?.includes(userId);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          className="reaction-burst-item"
                          onClick={() => {
                            onReactMessage?.(message.id, emoji, hasReacted ? 'remove' : 'add');
                            closeAllMenus();
                          }}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            className="message-round-tool"
            onClick={() => onReplyMessage?.(message)}
            title="Reply"
          >
            ↩
          </button>

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
              className={`message-dropdown-menu message-dropdown-menu-actions menu-align-${actionsMenuAlign} menu-vertical-${actionsMenuVertical} ${showActionsMenu ? 'is-open' : ''}`}
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
