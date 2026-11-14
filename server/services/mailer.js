import nodemailer from 'nodemailer';

export const mailerConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

let transport;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || `Jobtrail <${process.env.SMTP_USER}>`;
  await getTransport().sendMail({ from, to, subject, html, text });
}
