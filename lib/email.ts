/**
 * Email sending (password reset, verification) via nodemailer.
 * Configure SMTP via env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
 */

import nodemailer from "nodemailer"
import { getTemplateByName } from "@/lib/email-template-repo"
import { getEnv } from "@/lib/crypto"

const SMTP_HOST = getEnv("SMTP_HOST")
const SMTP_PORT = getEnv("SMTP_PORT")
const SMTP_USER = getEnv("SMTP_USER")
const SMTP_PASS = getEnv("SMTP_PASS")
const SMTP_SECURE = getEnv("SMTP_SECURE")

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: SMTP_SECURE === "true",
  auth:
    SMTP_USER && SMTP_PASS
      ? { user: SMTP_USER, pass: SMTP_PASS }
      : undefined,
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 5000, // 5 seconds
  greetingTimeout: 5000,   // 5 seconds
  socketTimeout: 10000,    // 10 seconds
})

const MAIL_FROM = process.env.MAIL_FROM || "noreply@example.com"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:5005"

interface EmailData {
  [key: string]: string | number
}

interface EmailAttachment {
    filename: string;
    content: Buffer | string;
    contentType?: string;
}

function replacePlaceholders(template: string, data: EmailData): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match
  })
}

export async function sendTemplateEmail(
  to: string,
  templateName: string,
  data: EmailData,
  attachments?: EmailAttachment[]
): Promise<void> {
  // Add common data
  const mergedData = {
    site_url: SITE_URL,
    site_name: "dailychatai AI", // Or from env
    ...data,
  }

  try {
    const template = await getTemplateByName(templateName)
    
    if (template) {
      const subject = replacePlaceholders(template.subject, mergedData)
      const html = replacePlaceholders(template.body_html, mergedData)
      const text = replacePlaceholders(template.body_text, mergedData)

      await transporter.sendMail({
        from: MAIL_FROM,
        to,
        subject,
        html,
        text,
        attachments: attachments,
      })
      console.log(`[Email] Sent '${templateName}' to ${to}`)
    } else {
      console.warn(`[Email] Template '${templateName}' not found. Email not sent to ${to}.`)
      // Optional: Fallback to hardcoded if critical, or throw error
      // For now, we rely on templates being present.
    }
  } catch (error) {
    console.error(`[Email] Failed to send '${templateName}' to ${to}:`, error)
    // Don't rethrow to avoid breaking the user flow (e.g. registration) unless critical
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`
  await sendTemplateEmail(email, "forgot_password", {
    action_url: url,
    token: token,
  })
}

export async function sendVerificationEmail(email: string, token: string, username: string = ""): Promise<void> {
  const url = `${SITE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`
  await sendTemplateEmail(email, "verification", {
    action_url: url,
    token: token,
    username: username,
  })
}

export async function sendWelcomeEmail(email: string, username: string): Promise<void> {
  await sendTemplateEmail(email, "welcome", {
    username,
  })
}

import { generateInvoicePdf, InvoiceData } from "./invoice"

export async function sendInvoiceEmail(
    email: string, 
    username: string, 
    invoiceData: InvoiceData
): Promise<void> {
    const pdfBuffer = await generateInvoicePdf(invoiceData)
    
    await sendTemplateEmail(email, "invoice", {
        username: username,
        invoice_id: invoiceData.invoiceId,
        amount: invoiceData.total.toFixed(2),
    }, [
        {
            filename: `invoice-${invoiceData.invoiceId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }
    ])
}

export function isEmailConfigured(): boolean {
  return !!(getEnv("SMTP_HOST") && getEnv("SMTP_USER") && getEnv("SMTP_PASS"))
}
