# My Portfolio

Personal portfolio website built with Next.js (App Router).

## Features

- Responsive, modern UI
- Projects showcase with modal details
- Contact form with email API
- Dedicated About/Bio page

## Tech Stack

- Next.js
- React
- CSS
- Nodemailer

## Getting Started

Install dependencies and run the dev server:

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Environment Variables

Create a `.env.local` file in the project root:

```env
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
EMAIL_TO=your_destination_email
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Go to [https://vercel.com](https://vercel.com) and import the GitHub repo.
3. Set environment variables in Vercel:
   - `EMAIL_USER`
   - `EMAIL_PASS`
   - `EMAIL_TO`
4. Deploy.

## Project Structure

```
my-portfolio/
├── app/              # Next.js App Router pages
├── components/       # React components
├── public/          # Static assets
├── styles/          # CSS styles
└── .env.local       # Environment variables (not committed)
```

## License

MIT License - feel free to use this template for your own portfolio!

