export const sessionReminderTemplate = (data: {
  userName: string;
  sessionTitle: string;
  scheduledAt: string;
  videoUrl: string;
  creatorName: string;
}): { subject: string; html: string; text: string } => {
  return {
    subject: `Reminder: Session starting in 1 hour - ${data.sessionTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .reminder-card { background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .button { display: inline-block; padding: 15px 40px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 18px; font-weight: bold; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Session Starting Soon!</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.userName},</h2>
              <p><strong>Your session is starting in 1 hour!</strong></p>
              
              <div class="reminder-card">
                <h3>${data.sessionTitle}</h3>
                <p><strong>With:</strong> ${data.creatorName}</p>
                <p><strong>Starting at:</strong> ${data.scheduledAt}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${data.videoUrl}" class="button">Join Video Session Now</a>
              </div>
              
              <p><strong>Quick reminders:</strong></p>
              <ul>
                <li>Test your camera and microphone before joining</li>
                <li>Find a quiet place with good lighting</li>
                <li>Have any questions or materials ready</li>
                <li>Join a few minutes early to ensure everything works</li>
              </ul>
              
              <p>See you soon!</p>
              
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
      Session Starting Soon!
      
      Hi ${data.userName},
      
      Your session is starting in 1 hour!
      
      Session: ${data.sessionTitle}
      With: ${data.creatorName}
      Starting at: ${data.scheduledAt}
      
      Video Link: ${data.videoUrl}
      
      Quick reminders:
      - Test your camera and microphone before joining
      - Find a quiet place with good lighting
      - Have any questions or materials ready
      - Join a few minutes early to ensure everything works
      
      See you soon!
      
      Best regards,
      The Athena AI Team
    `,
  };
};
