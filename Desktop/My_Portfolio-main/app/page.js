'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Navbar from './components/Navbar';
import {
  FaGithub, FaLinkedin, FaDownload, FaArrowRight,
  FaEnvelope, FaMapMarkerAlt, FaPaperPlane,
} from 'react-icons/fa';
import { SiLeetcode, SiCodeforces, SiCodechef } from 'react-icons/si';
import toast, { Toaster } from 'react-hot-toast';
import Image from 'next/image';
import Modal from './components/Modal';
import ProjectCard from './components/ProjectCard';
import './home.css';
import './bio/bio.css';
import './projects/projects.css';
import './contact/contact.css';

import ProjectsSection from './projects/page';
const ROLES = [
  'Aspiring Software Engineer',
  'Full-Stack Developer',
  'Problem Solver',
  'AI Enthusiast',
];

function useTyping(words, speed = 100, pause = 1800) {
  const [displayed, setDisplayed] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIdx];
    let timeout;
    if (!deleting && charIdx < current.length) {
      timeout = setTimeout(() => setCharIdx(c => c + 1), speed);
    } else if (!deleting && charIdx === current.length) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx(c => c - 1), speed / 2);
    } else {
      setDeleting(false);
      setWordIdx(i => (i + 1) % words.length);
    }
    setDisplayed(current.slice(0, charIdx));
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return displayed;
}

function StarfieldCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let stars = [];

    const initStars = () => {
      stars = [];
      const n = Math.floor((width * height) / 4000);
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.5,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          glow: Math.random() * 0.5 + 0.1,
        });
      }
    };

    initStars();
    let rafId;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;
        s.glow += (Math.random() - 0.5) * 0.05;
        s.glow = Math.min(0.8, Math.max(0.1, s.glow));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = Math.random() > 0.5
          ? `rgba(123,47,247,${s.glow})`
          : `rgba(0,212,255,${s.glow})`;
        ctx.fill();
      });
      rafId = requestAnimationFrame(animate);
    };

    animate();

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield-canvas" />;
}

const CODE_LINES = [
  { num: 1,  parts: [{ t: 'kw', v: 'const' }, { t: 'val', v: ' developer = {' }] },
  { num: 2,  parts: [{ t: 'indent', v: '' }, { t: 'py', v: 'name' }, { t: 'sym', v: ': ' }, { t: 'str', v: "'Jahidul Islam'," }] },
  { num: 3,  parts: [{ t: 'indent', v: '' }, { t: 'py', v: 'role' }, { t: 'sym', v: ': ' }, { t: 'str', v: "'Software Engineer'," }] },
  { num: 4,  parts: [{ t: 'indent', v: '' }, { t: 'py', v: 'skills' }, { t: 'sym', v: ': [' }, { t: 'str', v: "'C', 'C++', 'Java', 'Python'" }, { t: 'sym', v: '],' }] },
  { num: 5,  parts: [{ t: 'indent', v: '' }, { t: 'py', v: 'passion' }, { t: 'sym', v: ': ' }, { t: 'str', v: "'Building solutions'," }] },
  { num: 6,  parts: [{ t: 'indent', v: '' }, { t: 'py', v: 'code' }, { t: 'sym', v: ': () => ' }, { t: 'str', v: "'Clean & Efficient'" }] },
  { num: 7,  parts: [{ t: 'sym', v: '};' }] },
  { num: 8,  parts: [] },
  { num: 9,  parts: [{ t: 'cm', v: "// Let's build something amazing! 🚀" }] },
];

function CodeLine({ parts }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.t === 'indent') return <span key={i} className="indent" />;
        return <span key={i} className={p.t}>{p.v}</span>;
      })}
    </>
  );
}

const STATS = [
  { value: '2+',   label: 'Years Coding'     },
  { value: '10+',  label: 'Projects Built'   },
  { value: '3+',   label: 'Languages'        },
  { value: '600+', label: 'Problems Solved'  },
];

const SOCIALS = [
  { icon: FaGithub,     href: 'https://github.com/Jahidul183019',                   label: 'GitHub'     },
  { icon: FaLinkedin,   href: 'https://linkedin.com/in/md-jahidul-islam-231879321', label: 'LinkedIn'   },
  { icon: SiLeetcode,   href: 'https://leetcode.com/Jahidul1',                      label: 'LeetCode'   },
  { icon: SiCodeforces, href: 'https://codeforces.com/profile/Jahidul1',            label: 'Codeforces' },
  { icon: SiCodechef,   href: 'https://codechef.com/users/jahidul1',                label: 'CodeChef'   },
];

export default function Home() {
  const typed = useTyping(ROLES);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{ style: { background: '#0f1535', color: '#e8eaf6', border: '1px solid rgba(0,212,255,0.3)' } }}
      />
      <div className="home-wrapper">
        <StarfieldCanvas />
        <Navbar />

        {/* ── Hero ── */}
        <section id="home" className="hero-section">
          <div className="hero-bg-glow" />

          <div className="hero-inner">
            <div className="hero-left">


              <h1 className="hero-name">
                Hi, I&apos;m{' '}
                <span className="gradient-text">MD. Jahidul Islam</span>
              </h1>

              <div className="hero-role">
                <span className="role-prefix">I&apos;m a </span>
                <span className="role-typed">{typed}</span>
                <span className="cursor-blink" />
              </div>

                <p className="hero-bio">
                  Passionate software engineer focused on building impactful web applications. I love turning complex problems into elegant solutions with clean, efficient code.
                </p>

              <div className="hero-cta-group">
                <Link
                  href="#projects"
                  scroll={false}
                  className="btn-primary"
                  onClick={e => {
                    e.preventDefault();
                    document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  View Projects <FaArrowRight />
                </Link>
                <a href="/Resume.pdf" download className="btn-secondary">
                  <FaDownload /> Download Resume
                </a>
              </div>

              <div className="hero-socials">
                {SOCIALS.map(({ icon: Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className="social-icon" title={label}>
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

            {/* Code Window */}
            <div className="hero-right">
              <div className="code-window">
                <div className="code-window-header">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                  <span className="window-title">portfolio.js</span>
                </div>
                <div className="code-body">
                  {CODE_LINES.map(line => (
                    <div key={line.num} className="code-line">
                      <span className="line-num">{line.num}</span>
                      <span><CodeLine parts={line.parts} /></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="scroll-indicator">
            <div className="scroll-mouse">
              <div className="scroll-wheel" />
            </div>
            <span>scroll</span>
          </div>
        </section>

        {/* ── Stats Bar ── */}
        <div className="stats-bar">
          <div className="stats-inner">
            {STATS.map(s => (
              <div key={s.label} className="stat-item">
                <h3>{s.value}</h3>
                <p>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <BioSection />
        <section id="projects">
          <ProjectsSection />
        </section>
        <ContactSection />

      </div>
    </>
  );
}

/* ─────────────────────────── BIO SECTION ─────────────────────────── */

const SKILL_CATEGORIES = {
  All: [],
  Frontend:  ['React', 'Next', 'CSS', 'JavaScript', 'Vite'],
  Backend:   ['Spring Boot', 'REST APIs', 'Python'],
  Database:  ['MySQL', 'SQLite'],
  Languages: ['C', 'C++', 'Java', 'JavaScript', 'Python'],
  Tools:     ['Git', 'GitHub', 'Docker', 'Linux', 'VS Code', 'IntelliJ IDEA'],
};

const ALL_SKILLS = [
  ...SKILL_CATEGORIES.Frontend,
  ...SKILL_CATEGORIES.Backend,
  ...SKILL_CATEGORIES.Database,
  ...SKILL_CATEGORIES.Languages,
  ...SKILL_CATEGORIES.Tools,
].filter((v, i, a) => a.indexOf(v) === i);

SKILL_CATEGORIES.All = ALL_SKILLS;

const EDUCATION = [
  {
    degree: 'Bachelor of Science in Computer Science and Engineering',
    institution: 'University of Dhaka',
    detail: 'Comprehensive study in computer science fundamentals, software engineering, data structures, algorithms, and modern software development practices.',
    icon: '🎓',
  },
  {
    degree: 'Secondary & Higher Secondary Education',
    institution: 'Ispahani Public School & College',
    detail: 'Completed foundational education with a focus on science and mathematics, building the groundwork for a career in computer science.',
    icon: '🏫',
  },
];

function BioSection() {
  const [activeTab, setActiveTab] = useState('All');

  return (
    <section id="about" className="bio-section">
      <div className="bio-container">
        <p className="section-label">Get to know me</p>
        <h2 className="section-title"><span className="gradient-text">About Me</span></h2>
        <p className="section-subtitle">
          Passionate developer who turns complex problems into elegant solutions.
        </p>

        <div className="bio-profile-grid">
          <div className="bio-photo-wrap">
            <div className="bio-photo-ring">
              <div className="bio-photo-inner">
                <Image src="/me.jpeg" alt="MD. Jahidul Islam" width={200} height={200} className="bio-photo" />
              </div>
            </div>
          </div>

          <div className="bio-text-col">
            <h3 className="bio-name gradient-text">MD. Jahidul Islam</h3>
            <p className="bio-title">Software Engineer · Full-Stack Developer</p>
            <p className="bio-desc">
              I&apos;m a Computer Science student at the University of Dhaka with a deep passion
              for software engineering. I specialize in building full-stack web applications
              using modern technologies like React, Next.js, Node.js, and Spring Boot.
            </p>
            <p className="bio-desc" style={{ marginTop: '0.75rem' }}>
              Beyond web development, I actively participate in competitive programming on
              LeetCode, Codeforces, and CodeChef — sharpening my algorithmic thinking every day.
            </p>



            <a href="/Resume.pdf" download className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              <FaDownload /> Download Resume
            </a>
          </div>
        </div>

        {/* Skills */}
        <div className="skills-section">
          <h3 className="skills-title">Technical Skills</h3>
          <div className="skills-tabs">
            {Object.keys(SKILL_CATEGORIES).map(tab => (
              <button key={tab}
                className={`skill-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>
          <div className="skills-grid">
            {SKILL_CATEGORIES[activeTab].map(skill => (
              <div key={skill} className="skill-chip">{skill}</div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="education-section">
          <h3 className="skills-title">Education</h3>
          <div className="education-timeline">
            {EDUCATION.map((edu, i) => (
              <div key={i} className="edu-card glass-card">
                <div className="edu-icon">{edu.icon}</div>
                <div className="edu-content">
                  <div className="edu-header">
                    <h4 className="edu-degree">{edu.degree}</h4>
                    <span className="edu-period">{edu.period}</span>
                  </div>
                  <p className="edu-institution gradient-text">{edu.institution}</p>
                  <p className="edu-detail">{edu.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── PROJECTS SECTION ─────────────────────────── */


/* ─────────────────────────── CONTACT SECTION ─────────────────────────── */

function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Message sent! I'll get back to you soon 🚀");
        setForm({ name: '', email: '', subject: '', message: '' });
      } else {
        toast.error(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      toast.error('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="contact-section">
      <div className="contact-container">
        <p className="section-label">Get in touch</p>
        <h2 className="section-title"><span className="gradient-text">Contact Me</span></h2>
        <p className="section-subtitle">
          Have a question or want to work together? Feel free to reach out!
        </p>

        <div className="contact-grid">
          <div className="contact-info">
            <div className="info-heading" style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '2rem' }}>Contact Information</div>
            {/* Email */}
            <div className="contact-info-item">
              <span className="contact-info-icon" style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--cyan)' }}>
                <FaEnvelope style={{ fontSize: '1.5rem' }} />
              </span>
              <div>
                <div className="contact-info-label" style={{ fontWeight: 600, fontSize: '1.1rem' }}>Email</div>
                <a href="mailto:mdjahidulislamsarker@gmail.com" className="contact-info-value link" style={{ color: '#7b8ba3', fontSize: '1rem' }}>mdjahidulislamsarker@gmail.com</a>
              </div>
            </div>
            {/* Location */}
            <div className="contact-info-item">
              <span className="contact-info-icon" style={{ background: 'rgba(123,47,247,0.12)', color: '#7b2ff7' }}>
                <FaMapMarkerAlt style={{ fontSize: '1.5rem' }} />
              </span>
              <div>
                <div className="contact-info-label" style={{ fontWeight: 600, fontSize: '1.1rem' }}>Location</div>
                <div className="contact-info-value" style={{ color: '#7b8ba3', fontSize: '1rem' }}>Dhaka, Bangladesh</div>
              </div>
            </div>
            {/* Social Icons Row */}
            <div style={{ marginTop: '2.5rem' }}>
              <div className="contact-info-label" style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.2rem' }}>Connect with me</div>
              <div style={{ display: 'flex', gap: '2.2rem', alignItems: 'center' }}>
                <a href="https://github.com/Jahidul183019" target="_blank" rel="noopener noreferrer" title="GitHub" style={{ fontSize: '2rem', color: 'var(--cyan)' }}>
                  <FaGithub />
                </a>
                <a href="https://linkedin.com/in/md-jahidul-islam-231879321" target="_blank" rel="noopener noreferrer" title="LinkedIn" style={{ fontSize: '2rem', color: 'var(--cyan)' }}>
                  <FaLinkedin />
                </a>
              </div>
            </div>
          </div>

          <form className="contact-form glass-card" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name <span className="required">*</span></label>
                <input className="form-input" name="name" value={form.name}
                  onChange={handleChange} placeholder="Your name" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input className="form-input" name="email" type="email" value={form.email}
                  onChange={handleChange} placeholder="your@email.com" required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <input className="form-input" name="subject" value={form.subject}
                onChange={handleChange} placeholder="What's this about?" />
            </div>

            <div className="form-group">
              <label className="form-label">Message <span className="required">*</span></label>
              <textarea className="form-textarea" name="message" value={form.message}
                onChange={handleChange} placeholder="Tell me about your project or idea..."
                rows={6} required />
            </div>

            <button type="submit" className="btn-primary submit-btn" disabled={loading}>
              {loading ? <span className="spinner" /> : <><FaPaperPlane /> Send Message</>}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}