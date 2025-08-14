import { Resend } from "resend"

// Your verified domain
const DOMAIN = "felixsmile.com"

// Management email for notifications
export const MANAGEMENT_EMAIL = process.env.MANAGEMENT_EMAIL || "info@felixsmile.com"

// Initialize Resend with your API key from environment variables
// Add a fallback empty string to prevent runtime errors
const resend = new Resend(process.env.RESEND_API_KEY || "")

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
  attachments?: Array<{
    filename: string
    content: string
  }>
}

export async function sendEmail({
  to,
  subject,
  html,
  from = `Felix Restaurants <reservations@${DOMAIN}>`,
  attachments = [],
}: SendEmailParams) {
  try {
    console.log(`[Email Service] Preparing to send email to ${to} with subject: ${subject}`)
    console.log(`[Email Service] API Key available: ${!!process.env.RESEND_API_KEY}`)

    // Check if API key is available
    if (!process.env.RESEND_API_KEY) {
      console.warn("[Email Service] Resend API key is missing. Email sending is disabled.")
      return {
        success: false,
        error: {
          message: "Email sending is disabled because the Resend API key is missing.",
          code: "missing_api_key",
        },
        emailDisabled: true,
      }
    }

    // Prepare email data
    const emailData = {
      from,
      to,
      subject,
      html,
      reply_to: `reservations@${DOMAIN}`,
      attachments: attachments.length > 0 ? attachments : undefined,
    }

    console.log(`[Email Service] Sending email with data:`, {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      hasAttachments: !!emailData.attachments,
    })

    // Send the email
    const { data, error } = await resend.emails.send(emailData)

    if (error) {
      console.error("[Email Service] Error sending email:", error)
      return { success: false, error }
    }

    console.log("[Email Service] Email sent successfully:", data)
    return { success: true, data }
  } catch (error) {
    console.error("[Email Service] Error in sendEmail:", error)
    return { success: false, error }
  }
}

export function generateReservationConfirmationEmail({
  customerName,
  restaurantName,
  reservationAreaName,
  reservationDate,
  reservationTime,
  partySize,
  reservationType,
  lang = "en",
}: {
  customerName: string
  restaurantName: string
  reservationAreaName?: string | null
  reservationDate: string
  reservationTime: string
  partySize: number | string
  reservationType?: string
  lang?: string
}) {
  const isEnglish = lang === "en"

  const subject = isEnglish ? `Reservation Received: ${restaurantName}` : `Rezervasyon Alındı: ${restaurantName}`

  const html = `
    <!DOCTYPE html>
    <html lang="${lang}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: #0d6efd;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
        }
        .reservation-details {
          background-color: #f5f5f7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        .detail-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${isEnglish ? "Reservation Received" : "Rezervasyon Alındı"}</h1>
      </div>
      <div class="content">
        <p>${isEnglish ? "Dear" : "Sayın"} ${customerName},</p>
        <p>
          ${
            isEnglish
              ? `Thank you for your reservation request at ${restaurantName}. Your reservation is currently <strong>pending</strong> and will be confirmed by our team shortly.`
              : `${restaurantName} için rezervasyon talebiniz için teşekkür ederiz. Rezervasyonunuz şu anda <strong>beklemede</strong> ve ekibimiz tarafından kısa süre içinde onaylanacaktır.`
          }
        </p>
        
        <div class="reservation-details">
          <h3>${isEnglish ? "Reservation Details" : "Rezervasyon Detayları"}</h3>
          <div class="detail-row">
            <strong>${isEnglish ? "Restaurant" : "Restoran"}:</strong>
            <span>${restaurantName}</span>
          </div>
          ${reservationAreaName ? `
          <div class="detail-row">
            <strong>${isEnglish ? "Area" : "Alan"}:</strong>
            <span>${reservationAreaName}</span>
          </div>
          ` : ''}
          <div class="detail-row">
            <strong>${isEnglish ? "Date" : "Tarih"}:</strong>
            <span>${reservationDate}</span>
          </div>
          <div class="detail-row">
            <strong>${isEnglish ? "Time" : "Saat"}:</strong>
            <span>${reservationTime}</span>
          </div>
          <div class="detail-row">
            <strong>${isEnglish ? "Party Size" : "Kişi Sayısı"}:</strong>
            <span>${partySize}</span>
          </div>
          ${reservationType ? `
          <div class="detail-row">
            <strong>${isEnglish ? "Reservation Type" : "Rezervasyon Türü"}:</strong>
            <span>${reservationType === 'meal' ? (isEnglish ? 'Dining' : 'Yemek') : (isEnglish ? 'Drinks Only' : 'Sadece İçecek')}</span>
          </div>
          ` : ''}
        </div>
        
        <p>
          ${
            isEnglish
              ? "You will receive another email once your reservation is confirmed. If you have any questions or need to make changes to your reservation, please contact us directly."
              : "Rezervasyonunuz onaylandığında başka bir e-posta alacaksınız. Herhangi bir sorunuz varsa veya rezervasyonunuzda değişiklik yapmanız gerekiyorsa, lütfen doğrudan bizimle iletişime geçin."
          }
        </p>
        
        <p>${isEnglish ? "Best regards," : "Saygılarımızla,"}<br>Felix Restaurants</p>
      </div>
      <div class="footer">
        <p>&copy; 2025 Felix Restaurants. ${isEnglish ? "All rights reserved." : "Tüm hakları saklıdır."}</p>
        <p><a href="https://${DOMAIN}" style="color: #666; text-decoration: underline;">${DOMAIN}</a></p>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}

export function generateManagementNotificationEmail({
  action,
  customerName,
  restaurantName,
  reservationAreaName,
  reservationDate,
  reservationTime,
  partySize,
  customerEmail,
  customerPhone,
  specialRequests,
  reservationId,
  reservationType,
}: {
  action: 'created' | 'updated'
  customerName: string
  restaurantName: string
  reservationAreaName?: string | null
  reservationDate: string
  reservationTime: string
  partySize: number | string
  customerEmail: string
  customerPhone: string
  specialRequests?: string
  reservationId: string
  reservationType?: string
}) {
  const subject = `New Reservation ${action === 'created' ? 'Created' : 'Updated'}: ${restaurantName}`

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: ${action === 'created' ? '#28a745' : '#ffc107'};
          color: ${action === 'created' ? 'white' : '#212529'};
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
        }
        .reservation-details {
          background-color: #f5f5f7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        .detail-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .action-required {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Reservation ${action === 'created' ? 'Created' : 'Updated'}</h1>
      </div>
      <div class="content">
        <p>A reservation has been <strong>${action}</strong> and requires your attention.</p>
        
        <div class="reservation-details">
          <h3>Reservation Details</h3>
          <div class="detail-row">
            <strong>Reservation ID:</strong>
            <span>${reservationId}</span>
          </div>
          <div class="detail-row">
            <strong>Restaurant:</strong>
            <span>${restaurantName}</span>
          </div>
          ${reservationAreaName ? `
          <div class="detail-row">
            <strong>Area:</strong>
            <span>${reservationAreaName}</span>
          </div>
          ` : ''}
          <div class="detail-row">
            <strong>Customer Name:</strong>
            <span>${customerName}</span>
          </div>
          <div class="detail-row">
            <strong>Email:</strong>
            <span>${customerEmail}</span>
          </div>
          <div class="detail-row">
            <strong>Phone:</strong>
            <span>${customerPhone}</span>
          </div>
          <div class="detail-row">
            <strong>Date:</strong>
            <span>${reservationDate}</span>
          </div>
          <div class="detail-row">
            <strong>Time:</strong>
            <span>${reservationTime}</span>
          </div>
          <div class="detail-row">
            <strong>Party Size:</strong>
            <span>${partySize}</span>
          </div>
          ${reservationType ? `
          <div class="detail-row">
            <strong>Reservation Type:</strong>
            <span>${reservationType === 'meal' ? 'Dining' : 'Drinks Only'}</span>
          </div>
          ` : ''}
          ${specialRequests ? `
          <div class="detail-row">
            <strong>Special Requests:</strong>
            <span>${specialRequests}</span>
          </div>
          ` : ''}
        </div>
        
        ${action === 'created' ? `
        <div class="action-required">
          <h4>⚠️ Action Required</h4>
          <p>This reservation is currently <strong>pending</strong> and needs to be confirmed or declined. Please log in to the management dashboard to review and update the reservation status.</p>
        </div>
        ` : ''}
        
        <p>Please log in to the management dashboard to review this reservation and take appropriate action.</p>
        
        <p>Best regards,<br>Felix Reservation System</p>
      </div>
      <div class="footer">
        <p>&copy; 2025 Felix Restaurants. All rights reserved.</p>
        <p><a href="https://${DOMAIN}" style="color: #666; text-decoration: underline;">${DOMAIN}</a></p>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}

export function generateStatusUpdateEmail({
  customerName,
  restaurantName,
  reservationAreaName,
  reservationDate,
  reservationTime,
  partySize,
  status,
  notes,
  reservationType,
  lang = "en",
}: {
  customerName: string
  restaurantName: string
  reservationAreaName?: string | null
  reservationDate: string
  reservationTime: string
  partySize: number | string
  status: "confirmed" | "cancelled"
  notes?: string
  reservationType?: string
  lang?: string
}) {
  const isEnglish = lang === "en"
  const isConfirmed = status === "confirmed"

  const subject = isEnglish
    ? `Reservation ${isConfirmed ? "Confirmed" : "Cancelled"}: ${restaurantName}`
    : `Rezervasyon ${isConfirmed ? "Onaylandı" : "İptal Edildi"}: ${restaurantName}`

  const html = `
    <!DOCTYPE html>
    <html lang="${lang}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: ${isConfirmed ? "#4CAF50" : "#F44336"};
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
        }
        .reservation-details {
          background-color: #f5f5f7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        .detail-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .notes {
          background-color: ${isConfirmed ? "#E8F5E9" : "#FFEBEE"};
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid ${isConfirmed ? "#4CAF50" : "#F44336"};
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          margin-top: 30px;
        }
        .calendar-invite {
          background-color: #f5f5f7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${
          isEnglish
            ? `Reservation ${isConfirmed ? "Confirmed" : "Cancelled"}`
            : `Rezervasyon ${isConfirmed ? "Onaylandı" : "İptal Edildi"}`
        }</h1>
      </div>
      <div class="content">
        <p>${isEnglish ? "Dear" : "Sayın"} ${customerName},</p>
        <p>
          ${
            isConfirmed
              ? isEnglish
                ? `We're pleased to confirm your reservation at ${restaurantName}.`
                : `${restaurantName} rezervasyonunuzu onaylamaktan memnuniyet duyarız.`
              : isEnglish
                ? `We regret to inform you that your reservation at ${restaurantName} has been cancelled.`
                : `${restaurantName} rezervasyonunuzun iptal edildiğini bildirmekten üzüntü duyarız.`
          }
        </p>
        
        <div class="reservation-details">
          <h3>${isEnglish ? "Reservation Details" : "Rezervasyon Detayları"}</h3>
          <div class="detail-row">
            <strong>${isEnglish ? "Restaurant" : "Restoran"}:</strong>
            <span>${restaurantName}</span>
          </div>
          ${reservationAreaName ? `
          <div class="detail-row">
            <strong>${isEnglish ? "Area" : "Alan"}:</strong>
            <span>${reservationAreaName}</span>
          </div>
          ` : ''}
          <div class="detail-row">
            <strong>${isEnglish ? "Date" : "Tarih"}:</strong>
            <span>${reservationDate}</span>
          </div>
          <div class="detail-row">
            <strong>${isEnglish ? "Time" : "Saat"}:</strong>
            <span>${reservationTime}</span>
          </div>
          <div class="detail-row">
            <strong>${isEnglish ? "Party Size" : "Kişi Sayısı"}:</strong>
            <span>${partySize}</span>
          </div>
          ${reservationType ? `
          <div class="detail-row">
            <strong>${isEnglish ? "Reservation Type" : "Rezervasyon Türü"}:</strong>
            <span>${reservationType === 'meal' ? (isEnglish ? 'Dining' : 'Yemek') : (isEnglish ? 'Drinks Only' : 'Sadece İçecek')}</span>
          </div>
          ` : ''}
        </div>
        
        ${
          notes
            ? `
        <div class="notes">
          <h3>${isEnglish ? "Notes from the Restaurant" : "Restorandan Notlar"}</h3>
          <p>${notes}</p>
        </div>
        `
            : ""
        }
        
        ${
          isConfirmed
            ? `
        <div class="calendar-invite">
          <p>${
            isEnglish
              ? "We've attached a calendar invite to this email. Add it to your calendar so you don't forget your reservation!"
              : "Bu e-postaya bir takvim daveti ekledik. Rezervasyonunuzu unutmamak için takviminize ekleyin!"
          }</p>
        </div>
        `
            : ""
        }
        
        <p>
          ${
            isConfirmed
              ? isEnglish
                ? `We look forward to welcoming you to ${restaurantName}.`
                : `Sizi ${restaurantName}'da ağırlamayı dört gözle bekliyoruz.`
              : isEnglish
                ? `We apologize for any inconvenience this may cause. Please contact us if you would like to reschedule your visit.`
                : `Bu durumun neden olabileceği herhangi bir rahatsızlık için özür dileriz. Ziyaretinizi yeniden planlamak isterseniz lütfen bizimle iletişime geçin.`
          }
        </p>
        
        <p>${isEnglish ? "Best regards," : "Saygılarımızla,"}<br>Felix Restaurants</p>
      </div>
      <div class="footer">
        <p>&copy; 2025 Felix Restaurants. ${isEnglish ? "All rights reserved." : "Tüm hakları saklıdır."}</p>
        <p><a href="https://${DOMAIN}" style="color: #666; text-decoration: underline;">${DOMAIN}</a></p>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}
