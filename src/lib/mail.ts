import nodemailes from 'nodemailer';

export async function getMainClient() {
  const account = await nodemailes.createTestAccount();

  const transporter = nodemailes.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  })

  return transporter
}