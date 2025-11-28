export const welcomeEmailTemplate = (data: {
  name: string;
  verificationLink?: string;
}): { subject: string; html: string; text: string } => {
  return {
    subject: 'Welcome to Athena AI',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Athena AI! </h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name},</h2>
              <p>We're thrilled to have you on board! Athena AI is here to revolutionize your AI experience with powerful agents and seamless integrations.</p>
              
              <p><strong>What you can do with Athena:</strong></p>
              <ul>
                <li>Create and customize AI agents</li>
                <li>Access premium AI models</li>
                <li>Book sessions with creators</li>
                <li>Manage payments securely</li>
              </ul>
              
              ${data.verificationLink ? `<a href="${data.verificationLink}" class="button">Verify Your Email</a>` : ''}
              
              <p>If you have any questions, feel free to reach out to our support team.</p>
              
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
      Welcome to Athena AI!
      
      Hi ${data.name},
      
      We're thrilled to have you on board! Athena AI is here to revolutionize your AI experience with powerful agents and seamless integrations.
      
      What you can do with Athena:
      - Create and customize AI agents
      - Access premium AI Agent Made by Proffessionals in each field 
      - Book sessions with creators
      - Manage payments securely
      
      ${data.verificationLink ? `Verify your email: ${data.verificationLink}` : ''}
      
      If you have any questions, feel free to reach out to our support team.
      
      Best regards,
      The Athena AI Team
    `,
  };
};
