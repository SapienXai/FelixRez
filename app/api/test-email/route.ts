import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email-service"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const { success, data, error } = await sendEmail({
      to: email,
      subject: "Test Email from Felix Restaurants",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0d6efd;">Email Test Successful!</h1>
          <p>This is a test email from Felix Restaurants reservation system.</p>
          <p>If you're receiving this email, it means your email configuration is working correctly.</p>
          <p>You can now use the reservation system with confidence that email notifications will be delivered.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      `,
    })

    if (!success) {
      console.error("Error sending test email:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Email sent successfully", id: data.id })
  } catch (error) {
    console.error("Error in test-email API route:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
