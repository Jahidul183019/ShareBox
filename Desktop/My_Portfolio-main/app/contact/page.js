'use client';
import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import './contact.css';
import { FaGithub, FaLinkedin, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

export default function Contact() {
  const [form, setForm] = useState({ name: '', message: '' });
  const [loading, setLoading] = useState(false);

  // HIGH PERFORMANCE: Optimized Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          // Performance boost: Stop observing the element once it has animated in
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    // useEffect runs after DOM paint, so setTimeout is unnecessary and causes lag
    const reveals = document.querySelectorAll('.contact-container .reveal');
    reveals.forEach(reveal => observer.observe(reveal));

    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.message) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      
      if (res.ok) {
        toast.success('Message sent successfully!');
        setForm({ name: '', message: '' });
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-section">
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      <div className="contact-container">
        <div className="contact-header">
          <h1>
            Get In <span style={{ color: 'var(--cyan)', background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Touch</span>
          </h1>
          <p>Currently open for new opportunities. Whether you have a question or just want to say hi, I'll try my best to get back to you!</p>
        </div>
        <div className="contact-grid">
          {/* Info Column */}
          <div className="contact-info">
            <div className="info-heading">Contact Information</div>
            <div className="contact-info-item">
              <span className="contact-info-icon" title="Email">
                <FaEnvelope style={{ fontSize: '1.6rem', color: 'var(--cyan)' }} />
              </span>
              <div>
                <div className="contact-info-label">Email</div>
                <div className="contact-info-value"><a href="mailto:mdjahidulislamsarker@gmail.com">mdjahidulislamsarker@gmail.com</a></div>
              </div>
            </div>
            <div className="contact-info-item">
              <span className="contact-info-icon" title="Location">
                <FaMapMarkerAlt style={{ fontSize: '1.6rem', color: 'var(--cyan)' }} />
              </span>
              <div>
                <div className="contact-info-label">Location</div>
                <div className="contact-info-value">Dhaka, Bangladesh</div>
              </div>
            </div>
            <div className="contact-info-item">
              <span className="contact-info-icon" title="GitHub">
                <FaGithub style={{ fontSize: '1.6rem', color: 'var(--cyan)' }} />
              </span>
              <div>
                <div className="contact-info-label">GitHub</div>
                <div className="contact-info-value"><a href="https://github.com/Jahidul183019" target="_blank" rel="noopener noreferrer">github.com/Jahidul183019</a></div>
              </div>
            </div>
            <div className="contact-info-item">
              <span className="contact-info-icon" title="LinkedIn">
                <FaLinkedin style={{ fontSize: '1.6rem', color: 'var(--cyan)' }} />
              </span>
              <div>
                <div className="contact-info-label">LinkedIn</div>
                <div className="contact-info-value"><a href="https://www.linkedin.com/in/md-jahidul-islam-231879321" target="_blank" rel="noopener noreferrer">linkedin.com/in/md-jahidul-islam-231879321</a></div>
              </div>
            </div>
            <div className="contact-info-item" style={{marginTop: '2rem'}}>
              <span className="contact-info-label">Connect with me</span>
              <div style={{display: 'flex', gap: '1.2rem', marginTop: '0.7rem'}}>
                <a href="https://github.com/Jahidul183019" target="_blank" rel="noopener noreferrer" title="GitHub" style={{fontSize: '2rem', color: 'var(--text-secondary)'}}>
                  <FaGithub />
                </a>
                <a href="https://www.linkedin.com/in/md-jahidul-islam-231879321" target="_blank" rel="noopener noreferrer" title="LinkedIn" style={{fontSize: '2rem', color: 'var(--text-secondary)'}}>
                  <FaLinkedin />
                </a>
              </div>
            </div>
          </div>
          {/* Form Column */}
          <div>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Your Name</label>
                  <input
                    className="form-input"
                    type="text"
                    id="name"
                    placeholder="Your Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email Address</label>
                  <input
                    className="form-input"
                    type="email"
                    id="email"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="message">Message</label>
                <textarea
                  className="form-textarea"
                  id="message"
                  placeholder="How can I help you?"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                <span>{loading ? 'Sending...' : 'Send Message'}</span>
                {loading && <span className="spinner"></span>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}