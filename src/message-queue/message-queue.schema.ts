import { FileCategory } from '@prisma/client';
import { TokenPayload } from 'src/auth/auth.schema';
import { env } from 'src/lib/environment';

export enum QueueTable {
  EMAILS = 'emails',
  FILES = 'files',
}
// Files
export interface ParseFilePayload {
  fileId: string;
  fileCategory: FileCategory;
  courseSessionId?: string;
}

// Emails
export enum EmailSubject {
  ACTIVATE_ACCOUNT = 'Activate Your Account',
  RESET_PASSWORD = 'Reset Your Password',
  RESULT_UPLOAD = 'Your Result Was Uploaded',
  APPROVAL_REQUEST = 'Request for Approval',
  APPROVAL_SUCCESS = 'Approval Successful',
}

export interface SendEmailPayload {
  toEmail: string;
  subject: EmailSubject;
  content: string;
}

export interface SetPasswordSchema {
  isActivateAccount: boolean;
  tokenPayload: TokenPayload;
}

export interface NotificationSchema {
  subject: EmailSubject;
  email: string;
  title: string;
  message: string;
}

export const setPasswordTemplate = (
  isActivateAccount: boolean,
  url: string,
) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set Your Password</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f9; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .header { background-color: #2d4a3e; color: #fff; padding: 10px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; color: #333; }
    .button { display: inline-block; background-color: #2d4a3e; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; padding: 10px; color: #777; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Obafemi Awolowo University</h2>
      <p>College of Health Sciences</p>
    </div>
    <div class="content">
      <h3>${isActivateAccount ? 'Activate Your Account' : 'Reset Your Password'}</h3>
      <p>Welcome to the OAU College of Health Sciences Results Portal. To complete your registration and access your account, please activate it using the button below.</p>
      <p><a href="${url}" class="button">${isActivateAccount ? 'Activate Account' : 'Reset Password'}</a></p>
      <p>If you didn’t request this account, you can safely ignore this email.</p>
      <p>Best regards,<br>OAU College of Health Sciences Team</p>
    </div>
    <div class="footer">
      <p>© 2025 Obafemi Awolowo University College of Health Sciences. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
};

export const notificationTemplate = (title: string, message: string) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Notification</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f9; }
        .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background-color: #2d4a3e; color: #fff; padding: 10px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; color: #333; }
        .button { display: inline-block; background-color: #2d4a3e; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 10px; color: #777; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Obafemi Awolowo University</h2>
            <p>College of Health Sciences</p>
        </div>
        <div class="content">
            <h3>${title}</h3>
            <p>${message}</p>
            <p>For more details, visit the portal:</p>
            <p><a href="${env.FRONTEND_BASE_URL}" class="button">Go to Portal</a></p>
            <p>Best regards,<br>OAU College of Health Sciences Team</p>
        </div>
        <div class="footer">
            <p>© 2025 Obafemi Awolowo University College of Health Sciences. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};
