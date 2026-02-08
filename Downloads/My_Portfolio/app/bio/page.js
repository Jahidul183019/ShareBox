"use client";

import React, { useState, useEffect } from 'react';
import './bio.css';
import anime from 'animejs';

const Bio = () => {
  const [selectedSkillCategory, setSelectedSkillCategory] = useState('programming');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [animatedText, setAnimatedText] = useState('');

  const skillCategories = {
    programming: ['C', 'C++', 'Java'],
    frontend: ['React', 'Vite', 'JavaScript'],
    backend: ['Spring Boot'],
    database: ['SQLite', 'MySQL'],
    tools: ['Git', 'IntelliJ', 'VS Code']
  };

  const specializations = [
    'Full Stack Developer',
    'Backend Developer',
    'Software Engineer',
    'Problem Solver'
  ];

  useEffect(() => {
    let currentIndex = 0;
    setAnimatedText(specializations[currentIndex]);
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % specializations.length;
      setAnimatedText(specializations[currentIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Scroll reveal animations
  useEffect(() => {
    const revealTargets = document.querySelectorAll(
      '.profile-section, .bio-description, .skills-section, .education-section'
    );

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          entry.target.dataset.animated = 'true';

          anime({
            targets: entry.target,
            opacity: [0, 1],
            translateY: [24, 0],
            duration: 600,
            easing: 'easeOutCubic'
          });

          // Stagger in skill tags when the skills section enters
          if (entry.target.classList.contains('skills-section')) {
            const tags = entry.target.querySelectorAll('.skill-tag');
            anime({
              targets: tags,
              opacity: [0, 1],
              translateY: [12, 0],
              delay: anime.stagger(60),
              duration: 400,
              easing: 'easeOutQuad'
            });
          }

          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    revealTargets.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
    };
  }, []);

  const openModal = (type, data) => {
    setModalContent({ type, data });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalContent(null);
  };

  return (
    <div className="bio-page">
      {/* Animated background elements */}
      <div className="bg-animation">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
      </div>

      <div className="bio-container">
        {/* Profile Section */}
        <div className="profile-section">
          <div className="profile-image-wrapper">
            <div 
              className="profile-image"
              style={{
                backgroundImage: 'url("/me.jpeg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
              onClick={() => openModal('profile', {})}
            />
            <div className="online-status"></div>
          </div>
          
          <div className="profile-info">
            <h1>MD. Jahidul Islam</h1>
            <div className="animated-title">
              <p className="job-title">{animatedText}</p>
            </div>
          </div>
        </div>

        {/* Bio Description */}
        <div className="bio-description">
          <div className="bio-text">
            <p>
              I'm Jahidul Islam, a software engineer with expertise in full stack development. 
              My journey in software engineering has been driven by a deep desire to build meaningful applications 
              that solve real-world problems. With strong skills in both frontend and backend development, 
              I enjoy working across the entire technology stack to create seamless digital experiences.
            </p>
          </div>
        </div>

        {/* Skills Section */}
        <div className="skills-section">
          <h2>Technical Skills</h2>
          
          {/* Skill Category Buttons */}
          <div className="skill-categories">
            {Object.keys(skillCategories).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedSkillCategory(category)}
                className={`category-btn ${selectedSkillCategory === category ? 'active' : ''}`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Skills Grid */}
          <div className="skills-grid">
            {skillCategories[selectedSkillCategory].map((skill, index) => (
              <div
                key={skill}
                className="skill-tag"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => openModal('skill', { name: skill, category: selectedSkillCategory })}
              >
                {skill}
              </div>
            ))}
          </div>
        </div>

        {/* Education Section */}
        <div className="education-section">
          <h2>Education</h2>
          
          {/* University Education */}
          <div className="education-item">
            <div className="education-icon">
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9l-11-6zM18.82 9L12 12.72 5.18 9 12 5.28 18.82 9zM17 16l-5 2.72L7 16v-3.73L12 15l5-2.73V16z"/>
              </svg>
            </div>
            <div className="education-details">
              <h3>Bachelor of Science in Computer Science and Engineering</h3>
              <p className="education-institution">University of Dhaka</p>
              <p className="education-description">
                Comprehensive study in computer science fundamentals, software engineering, data structures, 
                algorithms, and modern software development practices.
              </p>
            </div>
          </div>

          {/* School Education */}
          <div className="education-item">
            <div className="education-icon">
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
              </svg>
            </div>
            <div className="education-details">
              <h3>Secondary & Higher Secondary Education</h3>
              <p className="education-institution">Ispahani Public School & College</p>
              <p className="education-description">
                Completed foundational education with a focus on science and mathematics, 
                building the groundwork for a career in computer science.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalContent?.type === 'skill' ? modalContent.data.name : 'Profile'}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              {modalContent?.type === 'skill' ? (
                <div>
                  <p className="modal-category">
                    Category: <span>{modalContent.data.category}</span>
                  </p>
                  <p>
                    {modalContent.data.name} is one of my core technical skills. I use it regularly in my development projects 
                    and continue to expand my expertise in this area.
                  </p>
                </div>
              ) : (
                <div>
                  <p>
                    Software Engineer focused on creating innovative solutions and building scalable applications. 
                    Always eager to learn new technologies and tackle challenging problems.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bio;