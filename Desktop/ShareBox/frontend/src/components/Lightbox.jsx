import { useEffect } from 'react';

export default function Lightbox({ item, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    // Prevent body scroll while the lightbox is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lightbox-close" aria-label="Close">×</button>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {item.type === 'image' && (
          <img src={item.url} alt={item.filename || ''} />
        )}
        {item.filename && (
          <div className="lightbox-caption">
            <span>{item.filename}</span>
            <a href={item.url} download={item.filename} className="download-link">
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
