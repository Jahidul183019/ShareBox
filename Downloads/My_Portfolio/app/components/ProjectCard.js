'use client';

export default function ProjectCard({ project }) {
  return (
    <div className="bg-gray-800 p-5 rounded-lg hover:scale-105 transition transform cursor-pointer">
      <h2 className="text-xl font-semibold mb-2">{project.name}</h2>
      <p>{project.desc}</p>
    </div>
  );
}
