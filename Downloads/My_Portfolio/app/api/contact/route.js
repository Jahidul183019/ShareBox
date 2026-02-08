import nodemailer from 'nodemailer';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const name = (body?.name || '').trim();
  const email = (body?.email || '').trim();
  const message = (body?.message || '').trim();

  if (!name || !email || !message) {
    return Response.json({ error: 'Name, email, and message are required.' }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return Response.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  const { EMAIL_USER, EMAIL_PASS, EMAIL_TO } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS || !EMAIL_TO) {
    return Response.json({ error: 'Email service not configured.' }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: EMAIL_USER,
      to: EMAIL_TO,
      replyTo: email,
      subject: `New message from ${name}`,
      text: `${message}\n\nFrom: ${name} <${email}>`,
    });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    return Response.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}
