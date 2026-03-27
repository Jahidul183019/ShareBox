'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import './Modal.css';
import { FaGithub, FaExternalLinkAlt, FaTimes, FaCheck } from 'react-icons/fa';

export default function Modal({ project, onClose }) {
  const { title, longDescription, image, tags, github, demo, features } = project;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <FaTimes />
        </button>

        {/* Image */}
        <div className="modal-image">
          <Image src={image} alt={title} fill style={{ objectFit: 'cover' }} sizes="800px" />
          <div className="modal-image-overlay" />
        </div>

        {/* Content */}
        <div className="modal-content">
          <h2 className="modal-title">{title}</h2>

          <div className="modal-tags">
            {tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>

          <p className="modal-desc">{longDescription}</p>

          {features && features.length > 0 && (
            <div className="modal-features">
              <h4 className="features-heading">Key Features</h4>
              <ul className="features-list">
                {features.map((f, i) => (
                  <li key={i} className="feature-item">
                    <FaCheck className="feature-check" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="modal-actions">
            {github && (
              <a href={github} target="_blank" rel="noopener noreferrer" className="btn-primary modal-btn">
                <FaGithub /> View Code
              </a>
            )}
            {demo && (
              <a href={demo} target="_blank" rel="noopener noreferrer" className="btn-secondary modal-btn">
                <FaExternalLinkAlt /> Live Demo
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
