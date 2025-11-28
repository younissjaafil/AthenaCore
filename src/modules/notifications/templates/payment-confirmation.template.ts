export const paymentConfirmationTemplate = (data: {
  name: string;
  amount: number;
  currency: string;
  transactionId: string;
  description: string;
  date: string;
}): { subject: string; html: string; text: string } => {
  return {
    subject: `Payment Confirmation - ${data.currency} ${data.amount}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .amount { font-size: 28px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Payment Successful</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name},</h2>
              <p>Your payment has been processed successfully!</p>
              
              <div class="amount">${data.currency} ${data.amount.toFixed(2)}</div>
              
              <div class="details">
                <div class="detail-row">
                  <span>Transaction ID:</span>
                  <strong>${data.transactionId}</strong>
                </div>
                <div class="detail-row">
                  <span>Description:</span>
                  <strong>${data.description}</strong>
                </div>
                <div class="detail-row">
                  <span>Date:</span>
                  <strong>${data.date}</strong>
                </div>
                <div class="detail-row">
                  <span>Amount:</span>
                  <strong>${data.currency} ${data.amount.toFixed(2)}</strong>
                </div>
              </div>
              
              <p>A receipt has been saved to your account. You can view your transaction history in your dashboard.</p>
              
              <p>Thank you for using Athena AI!</p>
              
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
      Payment Successful
      
      Hi ${data.name},
      
      Your payment has been processed successfully!
      
      Amount: ${data.currency} ${data.amount.toFixed(2)}
      
      Transaction Details:
      - Transaction ID: ${data.transactionId}
      - Description: ${data.description}
      - Date: ${data.date}
      - Amount: ${data.currency} ${data.amount.toFixed(2)}
      
      A receipt has been saved to your account. You can view your transaction history in your dashboard.
      
      Thank you for using Athena AI!
      
      Best regards,
      The Athena AI Team
    `,
  };
};
