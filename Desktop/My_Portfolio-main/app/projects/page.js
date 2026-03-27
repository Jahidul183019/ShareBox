'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import './projects.css';

const projectsData = [
  {
    id: 1,
    title: 'MediMart Full Stack',
    description: 'Full-stack medical store management system modernizing pharmacy operations...',
    category: 'Full Stack',
    technologies: ['React', 'Vite', 'Spring Boot', 'MySQL', 'JWT', 'WebSocket', 'REST API'],
    githubBackend: 'https://github.com/Jahidul183019/medimart-backend',
    githubFrontend: 'https://github.com/Jahidul183019/medimart-frontend',
    demo: 'https://medimart-frontend-coral.vercel.app/',
    thumbnail: '/Home.png',
    featured: true,
  },
  {
    id: 2,
    title: 'MediMart JavaFX',
    description: 'Academic pharmacy management system...',
    category: 'Academic',
    technologies: ['Java', 'JavaFX', 'SQLite', 'Sockets', 'Multithreading', 'OOP'],
    github: 'https://github.com/Jahidul183019/MediMart',
    demo: 'https://youtu.be/5leGbDB31lU',
    thumbnail: '/Home.png',
    featured: true,
  },
  {
    id: 3,
    title: 'Escape Room Conquest',
    description: 'Multi-level escape room game...',
    category: 'Academic',
    technologies: ['C++', 'SDL2', 'AI System', 'Game Logic', 'Graphics'],
    github: 'https://github.com/Jahidul183019/CSE-1-2-Project-',
    demo: 'https://youtu.be/cIk5d49OHYo',
    thumbnail: 'https://img.youtube.com/vi/cIk5d49OHYo/maxresdefault.jpg',
    featured: false,
  },
  {
    id: 4,
    title: 'DSA - Data Structures & Algorithms in C++',
    description: 'Personal DSA collection...',
    category: 'Resources',
    technologies: ['C++', 'Data Structures', 'Algorithms', 'STL'],
    github: 'https://github.com/Jahidul183019/DSA',
    featured: false,
  },
];

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState(null);
  const gridRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = selectedProject ? 'hidden' : '';
    return () => (document.body.style.overflow = '');
  }, [selectedProject]);

  // Only show all projects (no filter bar)
  return (
    <div className="projects-page">
      <div className="projects-container">
        {/* Header */}
        <div className="projects-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            margin: 0,
            background: 'linear-gradient(90deg, #fff 60%, #38e1ff 80%, #a259f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'inline-block',
          }}>Featured Projects</h1>
          <p style={{ fontSize: '1rem', marginTop: '0.5rem' }}>A collection of my work</p>
        </div>
        {/* Grid */}
        <div className="projects-grid" ref={gridRef}>
          {projectsData.map(project => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => setSelectedProject(project)}
            >
              {/* Image */}
              <div className="project-image">
                <img src={project.thumbnail} alt={project.title} />
              </div>
              {/* Body */}
              <div className="project-body">
                {/* ✅ FIXED META ROW */}
                <div className="project-meta">
                  {/* Remove category and featured badge if not needed, or keep as desired */}
                </div>
                <h3 className="project-title">{project.title}</h3>
                <p className="project-desc">{project.description}</p>
                <div className="project-tags">
                  {project.technologies.map((tech, i) => (
                    <span key={i} className="tag">{tech}</span>
                  ))}
                </div>
              </div>
              {/* Footer */}
              <div className="project-footer" onClick={(e) => e.stopPropagation()}>
                <div className="project-links">
                  {project.githubBackend && (
                    <a href={project.githubBackend} target="_blank" className="overlay-btn github">Backend</a>
                  )}
                  {project.githubFrontend && (
                    <a href={project.githubFrontend} target="_blank" className="overlay-btn github">Frontend</a>
                  )}
                  {project.github && (
                    <a href={project.github} target="_blank" className="overlay-btn github">Code</a>
                  )}
                  {project.demo && (
                    <a href={project.demo} target="_blank" className="overlay-btn demo">Demo</a>
                  )}
                </div>
                <button className="details-btn">
                  Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Modal */}
      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '600px',
              width: '90%',
              margin: '0 auto',
              padding: '2.5rem 2rem',
              borderRadius: '28px',
              background: 'rgba(15,23,42,0.95)',
              color: '#fff',
              boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '1.2rem',
            }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>{selectedProject.title}</h2>
            <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>{selectedProject.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}