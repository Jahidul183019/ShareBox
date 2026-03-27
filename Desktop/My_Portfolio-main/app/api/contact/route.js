import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailToOwner = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      replyTo: email,
      subject: `[Portfolio] ${subject || 'New Contact Message'} — from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e27; color: #e8eaf6; padding: 2rem; border-radius: 12px; border: 1px solid rgba(0,212,255,0.2);">
          <h2 style="color: #00d4ff; margin-bottom: 1.5rem;">New Portfolio Contact</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 0.5rem 0; color: #8892b0; width: 80px;">Name</td>
              <td style="padding: 0.5rem 0; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem 0; color: #8892b0;">Email</td>
              <td style="padding: 0.5rem 0;"><a href="mailto:${email}" style="color: #00d4ff;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 0.5rem 0; color: #8892b0;">Subject</td>
              <td style="padding: 0.5rem 0;">${subject || '—'}</td>
            </tr>
          </table>
          <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
            <p style="color: #8892b0; font-size: 0.85rem; margin-bottom: 0.5rem;">Message</p>
            <p style="line-height: 1.7; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="margin-top: 1.5rem; font-size: 0.8rem; color: #8892b0;">
            Sent via your portfolio contact form on ${new Date().toLocaleString()}.
          </p>
        </div>
      `,
    };

    const mailToSender = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thanks for reaching out, ' + name + '!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e27; color: #e8eaf6; padding: 2rem; border-radius: 12px; border: 1px solid rgba(0,212,255,0.2);">
          <h2 style="color: #00d4ff;">Hi ${name}, thanks for your message!</h2>
          <p style="color: #8892b0; line-height: 1.7; margin-top: 1rem;">
            I've received your message and will get back to you as soon as possible — 
            usually within 24–48 hours.
          </p>
          <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
            <p style="color: #8892b0; font-size: 0.85rem; margin-bottom: 0.5rem;">Your message</p>
            <p style="line-height: 1.7; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="margin-top: 1.5rem; color: #8892b0;">— MD. Jahidul Islam</p>
        </div>
      `,
    };

    await transporter.sendMail(mailToOwner);
    await transporter.sendMail(mailToSender);

    return NextResponse.json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact route error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}