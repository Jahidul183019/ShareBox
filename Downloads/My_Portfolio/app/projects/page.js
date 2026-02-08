'use client';
import { useState } from 'react';
import './projects.css';

const projectsData = [
  {
    id: 1,
    title: 'MediMart Full Stack',
    description: 'Full-stack medical store management system modernizing pharmacy operations. Features customer module with medicine browsing, cart management, order cancellation system with approval workflow, real-time notifications, and card payment simulation. Admin module includes inventory monitoring, order management, and analytics dashboard. Powered by JWT authentication, OTP password reset, WebSocket for real-time updates, and PDF invoice generation.',
    category: 'Full Stack',
    technologies: ['React', 'Vite', 'Spring Boot', 'MySQL', 'JWT', 'WebSocket', 'REST API'],
    github: null,
    githubBackend: 'https://github.com/Jahidul183019/medimart-backend',
    githubFrontend: 'https://github.com/Jahidul183019/medimart-frontend',
    demo: 'https://medimart-frontend-coral.vercel.app/',
    thumbnail: '/Home.png',
    featured: true,
  },
  {
    id: 2,
    title: 'MediMart JavaFX',
    description: 'Academic pharmacy management system for OOP (2-1) course built with JavaFX. Features Admin Panel and Customer Dashboard implementing all four OOP principles. Includes SQLite database, socket programming, multithreading, file I/O, and structured exception handling for robust pharmacy operations.',
    category: 'Academic',
    technologies: ['Java', 'JavaFX', 'SQLite', 'Sockets', 'Multithreading', 'OOP'],
    github: 'https://github.com/Jahidul183019/MediMart',
    demo: 'https://youtu.be/5leGbDB31lU?si=J8y_jTwnW0CW1MAN',
    thumbnail: '/Home.png',
    featured: true,
  },
  {
    id: 3,
    title: 'Escape Room Conquest',
    description: 'Multi-level escape room game built in C++ with SDL2, featuring themed floors (Horror, Sci-Fi, Mystery) with unique visuals and mechanics. Includes puzzle modules like RSA decryption, Tetris, circuit puzzles, and projection-based challenges. Features real-time countdown timers, interactive maps, AI system J.A.R.V.I.S. that monitors player actions, and competitive leaderboards.',
    category: 'Academic',
    technologies: ['C++', 'SDL2', 'AI System', 'Game Logic', 'Graphics'],
    github: 'https://github.com/Jahidul183019/CSE-1-2-Project-',
    demo: 'https://youtu.be/cIk5d49OHYo?si=EkZuBKmGEbiNdXaw',
    thumbnail: 'https://img.youtube.com/vi/cIk5d49OHYo/maxresdefault.jpg',
    featured: false,
  },
  {
    id: 4,
    title: 'DSA - Data Structures & Algorithms in C++',
    description: 'Personal collection for building and practicing Data Structures and Algorithms in C++. Serves as a reference guide, study resource, and progress tracker for problem-solving journey. Features modular, well-commented code organized by topic: Arrays, 2D Arrays/Matrices, Strings, Sorting Algorithms, Searching/Binary Search, Greedy Algorithms, Recursion & Backtracking, Linked Lists, Queues, Stacks, Hashing, Number Theory, STL, Two Pointer Approach, Binary Trees, BST, Binary Heaps, Graphs, AVL Trees, Disjoint Set Union, and more. Each file includes input/output examples with descriptive naming.',
    category: 'Resources',
    technologies: ['C++', 'Data Structures', 'Algorithms', 'STL', 'LeetCode', 'Problem Solving'],
    github: 'https://github.com/Jahidul183019/DSA',
    demo: null,
    featured: false,
  },
];

export default function Projects() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState(null);

  const categories = ['All', 'Full Stack', 'Academic', 'Resources'];

  const filteredProjects = selectedCategory === 'All'
    ? projectsData
    : projectsData.filter(project => project.category === selectedCategory);

  return (
    <div className="projects-page">
      {/* Background */}
      <div className="projects-bg">
        <div className="grid-pattern"></div>
      </div>

      <div className="projects-container">
        {/* Header */}
        <div className="projects-header">
          <h1>My Projects</h1>
          <p>A collection of my work showcasing various technologies and solutions</p>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {categories.map(category => (
            <button
              key={category}
              className={`filter-tab ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="projects-grid">
            {filteredProjects.map(project => (
              <div key={project.id} className="project-card" onClick={() => setSelectedProject(project)}>
                {project.featured && (
                  <div className="featured-badge">Featured</div>
                )}
                
                <div className="project-image">
                  {project.thumbnail ? (
                    <img src={project.thumbnail} alt={project.title} className="project-thumbnail" />
                  ) : (
                    <div className="project-placeholder">
                      <svg width="80" height="80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                      </svg>
                    </div>
                  )}
                </div>

                <div className="project-content">
                  <div className="project-category">{project.category}</div>
                  <h3 className="project-title">{project.title}</h3>
                  <p className="project-description">{project.description}</p>

                  <div className="project-tech">
                    {project.technologies.map((tech, index) => (
                      <span key={index} className="tech-tag">{tech}</span>
                    ))}
                  </div>

                  <div className="project-links">
                    {project.githubBackend && project.githubFrontend ? (
                      <>
                        <a
                          href={project.githubBackend}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="project-link"
                        >
                          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                          </svg>
                          Backend
                        </a>
                        <a
                          href={project.githubFrontend}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="project-link"
                        >
                          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                          </svg>
                          Frontend
                        </a>
                      </>
                    ) : (
                      <>
                        {project.github && (
                          <a
                            href={project.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="project-link"
                          >
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                            </svg>
                            Code
                          </a>
                        )}
                      </>
                    )}
                    {project.demo && (
                      <a
                        href={project.demo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-link primary"
                      >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Demo
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3>No Projects Found</h3>
            <p>Try selecting a different category</p>
          </div>
        )}
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProject(null)}>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="modal-image">
              {selectedProject.thumbnail ? (
                <img src={selectedProject.thumbnail} alt={selectedProject.title} />
              ) : (
                <div className="project-placeholder">
                  <svg width="80" height="80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                  </svg>
                </div>
              )}
            </div>

            <div className="modal-body">
              <div className="modal-header">
                <div>
                  <div className="project-category">{selectedProject.category}</div>
                  <h2 className="modal-title">{selectedProject.title}</h2>
                </div>
                {selectedProject.featured && (
                  <div className="featured-badge">Featured</div>
                )}
              </div>

              <p className="modal-description">{selectedProject.description}</p>

              <div className="modal-tech">
                <h4>Technologies:</h4>
                <div className="project-tech">
                  {selectedProject.technologies.map((tech, index) => (
                    <span key={index} className="tech-tag">{tech}</span>
                  ))}
                </div>
              </div>

              <div className="modal-links">
                <h4>Links:</h4>
                <div className="links-group">
                  {selectedProject.githubBackend && selectedProject.githubFrontend ? (
                    <>
                      <a
                        href={selectedProject.githubBackend}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-link large"
                      >
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                        </svg>
                        Backend Repository
                      </a>
                      <a
                        href={selectedProject.githubFrontend}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-link large"
                      >
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                        </svg>
                        Frontend Repository
                      </a>
                    </>
                  ) : (
                    <>
                      {selectedProject.github && (
                        <a
                          href={selectedProject.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="project-link large"
                        >
                          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                          </svg>
                          Source Code
                        </a>
                      )}
                    </>
                  )}
                  {selectedProject.demo && (
                    <a
                      href={selectedProject.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-link large primary"
                    >
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Live Demo
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

