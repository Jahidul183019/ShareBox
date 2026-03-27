'use client';

import Image from 'next/image';
import { FaGithub, FaExternalLinkAlt, FaArrowRight } from 'react-icons/fa';

export default function ProjectCard({ project, onOpen }) {
  const { title, description, image, tags, github, demo } = project;

  return (
    <article className="project-card" onClick={() => onOpen(project)}>
      {/* Image */}
      <div
        className="project-image"
        style={{
          position: 'relative',
          width: '100%',
          height: 220,
          background: '#181e36',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          overflow: 'hidden',
        }}
      >
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={false}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bfc9e0',
              fontSize: 32,
            }}
          >
            No Image
          </div>
        )}

        <div className="project-overlay" onClick={(e) => e.stopPropagation()}>
          {github && (
            <a
              href={github}
              target="_blank"
              rel="noopener noreferrer"
              className="overlay-btn github"
            >
              <FaGithub /> Code
            </a>
          )}
          {demo && (
            <a
              href={demo}
              target="_blank"
              rel="noopener noreferrer"
              className="overlay-btn demo"
            >
              <FaExternalLinkAlt /> Live
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="project-body">
        <h3 className="project-title">{title}</h3>
        <p className="project-desc">{description}</p>

        {/* Tags */}
        <div className="project-tags" style={{ minHeight: '48px' }}>
          {tags.slice(0, 4).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
          {tags.length > 4 && (
            <span className="tag more">+{tags.length - 4}</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="project-footer">
        <span className="details-btn">
          View Details <FaArrowRight />
        </span>

        <div
          style={{ display: 'flex', gap: '0.5rem' }}
          onClick={(e) => e.stopPropagation()}
        >
          {github && (
            <a
              href={github}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                transition: 'color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = 'var(--cyan)')}
              onMouseOut={(e) =>
                (e.currentTarget.style.color = 'var(--text-secondary)')
              }
            >
              <FaGithub />
            </a>
          )}
          {demo && (
            <a
              href={demo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                transition: 'color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = 'var(--cyan)')}
              onMouseOut={(e) =>
                (e.currentTarget.style.color = 'var(--text-secondary)')
              }
            >
              <FaExternalLinkAlt />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}