export const sessionBookingTemplate = (data: {
  userName: string;
  creatorName: string;
  sessionTitle: string;
  scheduledAt: string;
  duration: number;
  videoUrl: string;
  price: number;
  currency: string;
}): { subject: string; html: string; text: string } => {
  return {
    subject: `Session Booked: ${data.sessionTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .session-card { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .info-row { margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Session Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.userName},</h2>
              <p>Your session has been successfully booked!</p>
              
              <div class="session-card">
                <h3>${data.sessionTitle}</h3>
                <div class="info-row"><strong>Creator:</strong> ${data.creatorName}</div>
                <div class="info-row"><strong>Date & Time:</strong> ${data.scheduledAt}</div>
                <div class="info-row"><strong>Duration:</strong> ${data.duration} minutes</div>
                <div class="info-row"><strong>Price:</strong> ${data.currency} ${data.price.toFixed(2)}</div>
              </div>
              
              <a href="${data.videoUrl}" class="button">Join Video Session</a>
              
              <p><strong>What to do next:</strong></p>
              <ul>
                <li>You'll receive a reminder 1 hour before the session</li>
                <li>Click the "Join Video Session" button at the scheduled time</li>
                <li>Make sure you have a stable internet connection</li>
              </ul>
              
              <p>Looking forward to your session!</p>
              
              <p>Best regards,<br>The Athena AI Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Athena AI. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Session Confirmed!
      
      Hi ${data.userName},
      
      Your session has been successfully booked!
      
      Session Details:
      - Title: ${data.sessionTitle}
      - Creator: ${data.creatorName}
      - Date & Time: ${data.scheduledAt}
      - Duration: ${data.duration} minutes
      - Price: ${data.currency} ${data.price.toFixed(2)}
      
      Video Link: ${data.videoUrl}
      
      What to do next:
      - You'll receive a reminder 1 hour before the session
      - Click the video link at the scheduled time
      - Make sure you have a stable internet connection
      
      Looking forward to your session!
      
      Best regards,
      The Athena AI Team
    `,
  };
};
