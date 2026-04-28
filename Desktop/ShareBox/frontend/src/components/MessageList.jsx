import { useEffect, useRef } from 'react';
import MessageItem from './MessageItem.jsx';

export default function MessageList({
  messages,
  userId,
  onOpenMedia,
  onEditMessage,
  onReactMessage,
  onReplyMessage,
  onDeleteMessage,
}) {
  const scrollRef = useRef(null);
  const prevLenRef = useRef(0);

  // Auto-scroll to bottom when a new message arrives, but only if the user is
  // already near the bottom — avoids yanking the scroll when reviewing history
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > prevLenRef.current;
    prevLenRef.current = messages.length;
    if (!grew) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 200) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list message-list-empty" ref={scrollRef}>
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>Nothing here yet</h3>
          <p>Share the room code and start sending — text, code, images, or videos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list" ref={scrollRef}>
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          isSelf={msg.user_id === userId}
          userId={userId}
          onOpenMedia={onOpenMedia}
          onEditMessage={onEditMessage}
          onReactMessage={onReactMessage}
          onReplyMessage={onReplyMessage}
          onDeleteMessage={onDeleteMessage}
        />
      ))}
    </div>
  );
}
