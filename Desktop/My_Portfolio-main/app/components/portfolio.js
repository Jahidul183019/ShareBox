import React from 'react';

const developer = {
  name: 'Jahidul Islam',
  role: 'Software Engineer',
  skills: ['C', 'C++', 'Java', 'Python'],
  passion: 'Building solutions',
  code: () => 'Clean & Efficient',
};

export default function Portfolio() {
  return (
    <section className="portfolio-section">
      <h2>{developer.name}</h2>
      <p><strong>Role:</strong> {developer.role}</p>
      <p><strong>Skills:</strong> {developer.skills.join(', ')}</p>
      <p><strong>Passion:</strong> {developer.passion}</p>
      <p><strong>Code Philosophy:</strong> {developer.code()}</p>
      <div className="portfolio-toggle">Let's build something amazing! 🚀</div>
    </section>
  );
}
