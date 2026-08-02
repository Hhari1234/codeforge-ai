import logging
import smtplib
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USERNAME
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL

    def send_email(self, to_email: str, subject: str, html_content: str) -> None:
        logger.info("[EMAIL] send_email() called: to=%s, subject=%s, from=%s, host=%s, port=%s", to_email, subject, self.from_email, self.host, self.port)

        if not all([self.host, self.port, self.username, self.password, self.from_email]):
            logger.warning("[EMAIL] SMTP is not fully configured. Email to %s not sent. host=%r, port=%r, username=%r, password=%r, from_email=%r", to_email, self.host, self.port, self.username, self.password[:4] + "****" if self.password else "", self.from_email)
            return

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = self.from_email
        message["To"] = to_email
        message.attach(MIMEText(html_content, "html"))

        try:
            logger.info("[EMAIL] Connecting to SMTP server %s:%s ...", self.host, self.port)
            with smtplib.SMTP(self.host, self.port, timeout=15) as server:
                server.set_debuglevel(1)
                logger.info("[EMAIL] Starting TLS ...")
                server.starttls()
                logger.info("[EMAIL] TLS started. Attempting login as %s ...", self.username)
                server.login(self.username, self.password)
                logger.info("[EMAIL] SMTP authentication SUCCESSFUL for %s.", self.username)

                logger.info("[EMAIL] Calling sendmail(from=%s, to=%s, message_length=%d bytes) ...", self.from_email, to_email, len(message.as_string()))
                server.sendmail(self.from_email, [to_email], message.as_string())
                logger.info("[EMAIL] SMTP sendmail() returned successfully. Email accepted by provider for delivery to %s.", to_email)
        except smtplib.SMTPAuthenticationError as exc:
            logger.error("[EMAIL] SMTP authentication FAILED for %s: %s", self.username, exc)
            logger.error("[EMAIL] Full traceback:\n%s", traceback.format_exc())
        except smtplib.SMTPException as exc:
            logger.error("[EMAIL] SMTP error while sending to %s: %s", to_email, exc)
            logger.error("[EMAIL] Full traceback:\n%s", traceback.format_exc())
        except Exception as exc:
            logger.error("[EMAIL] Unexpected error while sending email to %s: %s", to_email, exc)
            logger.error("[EMAIL] Full traceback:\n%s", traceback.format_exc())


email_service = EmailService()


def send_password_reset_email(to_email: str, reset_token: str) -> None:
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"

    subject = "CodeForge AI - Password Reset"
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #e2e8f0; background-color: #0f172a;">
        <div style="background-color: #1e293b; border-radius: 8px; padding: 24px; border: 1px solid #334155;">
          <h1 style="color: #34d399; font-size: 20px; margin-bottom: 16px;">Password Reset Request</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
            You requested to reset your password for your CodeForge AI account.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
            Click the button below to reset your password. This link will expire in 30 minutes.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="{reset_url}" style="background-color: #10b981; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b;">
            If you didn't request this, you can safely ignore this email.
          </p>
          <p style="font-size: 12px; color: #64748b;">
            Link: <a href="{reset_url}" style="color: #34d399;">{reset_url}</a>
          </p>
        </div>
      </body>
    </html>
    """

    logger.info("[EMAIL] send_password_reset_email() called: to=%s, reset_url=%s", to_email, reset_url)
    email_service.send_email(to_email, subject, html_content)
    logger.info("[EMAIL] send_password_reset_email() finished for %s", to_email)
