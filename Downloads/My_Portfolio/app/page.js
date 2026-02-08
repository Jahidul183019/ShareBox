'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import anime from 'animejs';
import Navbar from './components/Navbar';
import './home.css';

export default function Home() {
  const [typedText, setTypedText] = useState('');
  const [stars, setStars] = useState([]);
  const titles = [
    'Software Engineer',
    'Full Stack Developer',
    'Problem Solver',
    'Tech Enthusiast'
  ];
  const [titleIndex, setTitleIndex] = useState(0);

  // Typing effect
  useEffect(() => {
    let currentText = '';
    let charIndex = 0;
    const currentTitle = titles[titleIndex];
    let isDeleting = false;

    const typeInterval = setInterval(() => {
      if (!isDeleting) {
        currentText = currentTitle.substring(0, charIndex + 1);
        charIndex++;
        setTypedText(currentText);

        if (charIndex === currentTitle.length) {
          isDeleting = true;
          setTimeout(() => {}, 2000); // Pause before deleting
        }
      } else {
        currentText = currentTitle.substring(0, charIndex - 1);
        charIndex--;
        setTypedText(currentText);

        if (charIndex === 0) {
          isDeleting = false;
          setTitleIndex((prev) => (prev + 1) % titles.length);
          clearInterval(typeInterval);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearInterval(typeInterval);
  }, [titleIndex]);

  // Animations
  useEffect(() => {
    // Floating shapes animation
    anime({
      targets: '.shape',
      translateY: [-20, 20],
      translateX: [-10, 10],
      rotate: [0, 360],
      duration: 6000,
      easing: 'easeInOutSine',
      loop: true,
      delay: anime.stagger(500),
    });

    // Code window animation
    anime({
      targets: '.code-line',
      opacity: [0, 1],
      translateX: [-20, 0],
      delay: anime.stagger(100, { start: 500 }),
      duration: 800,
      easing: 'easeOutExpo',
    });
  }, []);

  // Generate stars on client only to avoid hydration mismatch
  useEffect(() => {
    const generated = [];
    for (let i = 0; i < 50; i++) {
      const style = {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
      };
      generated.push(<div key={i} className="star" style={style}></div>);
    }
    setStars(generated);
  }, []);

  return (
    <div className="home-page">
      <Navbar />
      
      {/* Animated Background */}
      <div className="gradient-bg"></div>
      
      {/* Starfield */}
      <div className="stars">{stars}</div>

      {/* Floating Shapes */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Main Content */}
      <div className="home-container">
        <div className="hero-section">
          {/* Hero Content */}
          <div className="hero-content">
            <div className="hero-greeting">
              <span className="wave">👋</span>
              <span>Hello, I'm</span>
            </div>
            
            <h1 className="hero-name">
              <span className="highlight">MD. Jahidul</span><br />
              Islam
            </h1>
            
            <div className="hero-title">
              <span className="typing-text">{typedText}</span>
            </div>
            
            <p className="hero-description">
              Passionate software engineer focused on building impactful web applications. 
              I love turning complex problems into elegant solutions with clean, efficient code.
            </p>

            {/* CTA Buttons */}
            <div className="hero-cta">
              <Link href="/projects" className="btn btn-primary">
                View My Work
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link href="/contact" className="btn btn-secondary">
                Get In Touch
              </Link>
            </div>

            {/* Stats */}
            <div className="stats-section">
              <div className="stat-item">
                <span className="stat-number">3</span>
                <span className="stat-label">Projects</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">10+</span>
                <span className="stat-label">Technologies</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">2+</span>
                <span className="stat-label">Years Coding</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="social-links">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Hero Visual - Code Window */}
          <div className="hero-visual">
            <div className="code-window">
              <div className="window-header">
                <div className="window-dot dot-red"></div>
                <div className="window-dot dot-yellow"></div>
                <div className="window-dot dot-green"></div>
              </div>
              <div className="code-content">
                <div className="code-line">
                  <span className="line-number">1</span>
                  <span className="line-content">
                    <span className="keyword">const</span> <span className="function">developer</span> = {'{'}
                  </span>
                </div>
                <div className="code-line">
                  <span className="line-number">2</span>
                  <span className="line-content">
                    &nbsp;&nbsp;name: <span className="string">'Jahidul Islam'</span>,
                  </span>
                </div>
                <div className="code-line">
                  <span className="line-number">3</span>
                  <span className="line-content">
                    &nbsp;&nbsp;role: <span className="string">'Software Engineer'</span>,
                  </span>
                </div>
                <div className="code-line">
                  <span className="line-number">4</span>
                  <span className="line-content">
                    &nbsp;&nbsp;skills: [<span className="string">'C++'</span>, <span className="string">'JavaScript'</span>, <span className="string">'React'</span>],
                  </span>
                </div>
                <div className="code-line">
                  <span className="line-number">5</span>
                  <span className="line-content">
                    &nbsp;&nbsp;passion: <span className="string">'Building solutions'</span>,
                  </span>
                </div>
                <div className="code-line">
                  <span className="line-number">6</span>
                  <span className="line-content">
                    &nbsp;&nbsp;<span className="function">code</span>: () =&gt; <span className="string">'Clean & Efficient'</span>
                  </span>
                </div>
                <div className="code-line">
                  <span className="line-number">7</span>
                  <span className="line-content">{'}'}</span>
                </div>
                <div className="code-line">
                  <span className="line-number">8</span>
                  <span className="line-content"></span>
                </div>
                <div className="code-line">
                  <span className="line-number">9</span>
                  <span className="line-content">
                    <span className="comment">// Let's build something amazing! 🚀</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Projects Section */}
      <div className="featured-projects-section">
        <div className="section-header">
          <h2 className="section-title">Featured Projects</h2>
          <p className="section-subtitle">Showcasing my best work in full-stack development and software engineering</p>
        </div>

        <div className="projects-grid">
          {/* Project 1 - MediMart Full Stack */}
          <div className="project-preview-card">
            <div className="project-header">
              <div className="project-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <span className="project-badge">Full Stack</span>
            </div>
            <h3 className="project-title">MediMart E-Commerce Platform</h3>
            <p className="project-description">
              Complete healthcare e-commerce solution with real-time chat support, secure payment integration, 
              and comprehensive admin dashboard. Built with React + Vite frontend and Spring Boot backend.
            </p>
            <div className="project-tech">
              <span className="tech-tag">React</span>
              <span className="tech-tag">Spring Boot</span>
              <span className="tech-tag">MySQL</span>
              <span className="tech-tag">JWT</span>
              <span className="tech-tag">WebSocket</span>
            </div>
            <div className="project-links">
              <a href="https://github.com/Jahidul183019/medimart-frontend" target="_blank" className="project-link">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                View Code
              </a>
              <a href="https://medimart-frontend-coral.vercel.app" target="_blank" className="project-link primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Live Demo
              </a>
            </div>
          </div>

          {/* Project 2 - MediMart JavaFX */}
          <div className="project-preview-card">
            <div className="project-header">
              <div className="project-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <span className="project-badge academic">Academic</span>
            </div>
            <h3 className="project-title">MediMart Desktop Application</h3>
            <p className="project-description">
              OOP-based pharmacy management system with multi-threaded architecture, real-time notifications, 
              and role-based access control. Comprehensive medicine inventory and order management.
            </p>
            <div className="project-tech">
              <span className="tech-tag">Java</span>
              <span className="tech-tag">JavaFX</span>
              <span className="tech-tag">SQLite</span>
              <span className="tech-tag">Sockets</span>
              <span className="tech-tag">Multithreading</span>
            </div>
            <div className="project-links">
              <a href="https://github.com/Jahidul183019/MediMart-JavaFX" target="_blank" className="project-link">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                View Code
              </a>
              <a href="https://www.youtube.com/watch?v=qwsVr-ECQUM" target="_blank" className="project-link primary">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Watch Demo
              </a>
            </div>
          </div>

          {/* Project 3 - Escape Room Conquest */}
          <div className="project-preview-card">
            <div className="project-header">
              <div className="project-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <span className="project-badge academic">Academic</span>
            </div>
            <h3 className="project-title">Escape Room Conquest Game</h3>
            <p className="project-description">
              Interactive puzzle-solving game featuring AI assistant J.A.R.V.I.S., themed escape rooms 
              (Library, Garden, Workshop), dynamic hint system, and custom 2D graphics with SDL2.
            </p>
            <div className="project-tech">
              <span className="tech-tag">C++</span>
              <span className="tech-tag">SDL2</span>
              <span className="tech-tag">OOP</span>
              <span className="tech-tag">Game Dev</span>
            </div>
            <div className="project-links">
              <a href="https://github.com/Jahidul183019/Escape-Room-Conquest" target="_blank" className="project-link">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                View Code
              </a>
              <a href="https://www.youtube.com/watch?v=AOqe7R-c3hk" target="_blank" className="project-link primary">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Watch Demo
              </a>
            </div>
          </div>
        </div>

        <div className="view-all-projects">
          <a href="/projects" className="view-all-btn">
            View All Projects
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

