import nodemailer from 'nodemailer';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { isDatabaseConnected, memoryUsers, memoryNotifications } from '@/lib/db';
import { sendPushNotification } from '@/lib/web-push-helper';

/**
 * Sends a notification to all administrators via Database/Cache (which triggers Web Push) and via Email.
 * 
 * @param {object} params
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification detail body
 * @param {string} params.type - Enum type of the notification ('new_order', 'new_review', 'new_lead', 'new_subscriber')
 * @param {string} [params.link] - Action redirect link
 */
export async function notifyAdmins({ title, message, type = 'general', link = '' }) {
  try {
    console.log(`🔔 Notifier: Broadcasting admin notification: "${title}"`);

    let adminUserIds = [];

    // 1. Save Notification & Trigger Web Push
    if (isDatabaseConnected) {
      try {
        const admins = await User.find({ role: 'admin' });
        adminUserIds = admins.map(admin => admin._id.toString());

        for (const adminId of adminUserIds) {
          // Creating the Notification automatically fires the post-save hook which calls sendPushNotification
          await Notification.create({
            userId: adminId,
            title,
            message,
            type,
            link,
            read: false
          });
        }
        console.log(`✅ Notifier: Saved database notifications for ${adminUserIds.length} admins.`);
      } catch (dbErr) {
        console.error('⚠️ Notifier: Failed to query admins/save notifications in DB:', dbErr);
      }
    } else {
      // Memory fallback caching
      const admins = memoryUsers.filter(u => u.role === 'admin');
      adminUserIds = admins.map(u => u._id);

      for (const adminId of adminUserIds) {
        const memoryNotif = {
          _id: 'notif_' + Date.now() + Math.random().toString(36).substr(2, 5),
          userId: adminId,
          title,
          message,
          type,
          read: false,
          link,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        memoryNotifications.unshift(memoryNotif);
        
        // Under memory fallback, we manually fire the web push helper since there's no Mongoose post-save hook
        sendPushNotification(adminId, title, message, link).catch(err => {
          console.error(`⚠️ Notifier: Memory Web Push failed for admin ${adminId}:`, err);
        });
      }
      console.log(`✅ Notifier: Saved memory fallback notifications for ${adminUserIds.length} admins.`);
    }

    // 2. Dispatch SMTP Email Alert
    const emailRecipient = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@daivika.in';
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost || 'smtp.gmail.com',
          port: smtpPort,
          secure: smtpPort === 465, // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        // Map icons or badges based on notification type
        let typeBadgeColor = '#8b5e3c'; // Theme color
        let typeLabel = 'System Alert';
        if (type === 'new_order') {
          typeBadgeColor = '#10B981'; // Green
          typeLabel = 'New Store Order 🛍️';
        } else if (type === 'new_review') {
          typeBadgeColor = '#3B82F6'; // Blue
          typeLabel = 'Customer Review ⭐';
        } else if (type === 'new_lead') {
          typeBadgeColor = '#F59E0B'; // Amber
          typeLabel = 'Inbox Inquiry 💬';
        } else if (type === 'new_subscriber') {
          typeBadgeColor = '#8B5CF6'; // Purple
          typeLabel = 'Newsletter Subscription 📧';
        }

        const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/dashboard`;

        const mailOptions = {
          from: `"Daivika Notifications" <${smtpUser}>`,
          to: emailRecipient,
          subject: `🔔 Admin Alert: ${title}`,
          html: `
            <div style="font-family: 'Poppins', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 2rem 0; width: 100%; margin: 0;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-collapse: collapse; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td bgcolor="#000000" style="padding: 2.5rem 2rem; text-align: center;">
                    <h1 style="color: #ffffff; font-size: 1.5rem; font-weight: 700; margin: 0; letter-spacing: 1px;">DAIVIKA</h1>
                    <p style="color: #a3a3a3; font-size: 0.75rem; margin: 0.25rem 0 0 0; text-transform: uppercase; letter-spacing: 2px;">Daivika Store Admin</p>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 2.5rem 2.5rem 1.5rem 2.5rem;">
                    <div style="display: inline-block; padding: 0.35rem 0.85rem; background-color: ${typeBadgeColor}; color: #ffffff; font-size: 0.7rem; font-weight: 700; border-radius: 50px; text-transform: uppercase; margin-bottom: 1.25rem; letter-spacing: 0.5px;">
                      ${typeLabel}
                    </div>
                    
                    <h2 style="color: #111827; font-size: 1.25rem; font-weight: 700; margin: 0 0 0.75rem 0; line-height: 1.3;">
                      ${title}
                    </h2>
                    
                    <p style="color: #4b5563; font-size: 0.95rem; line-height: 1.6; margin: 0 0 2rem 0;">
                      ${message}
                    </p>
                    
                    <!-- Call to Action -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 2rem 0;">
                      <tr>
                        <td align="center">
                          <a href="${dashboardUrl}" style="background-color: #8b5e3c; color: #ffffff; text-decoration: none; padding: 0.85rem 2rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; display: inline-block; transition: background-color 0.2s;">
                            Open Admin Control Panel
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td bgcolor="#f9fafb" style="padding: 1.5rem; border-top: 1px solid #f3f4f6; text-align: center; color: #9ca3af; font-size: 0.75rem;">
                    This is an automated alert generated by the Daivika Portal.<br/>
                    Configured Admin Recipient: <span style="font-weight: 600; color: #6b7280;">${emailRecipient}</span>
                  </td>
                </tr>
              </table>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✉️ Notifier: Sent alert email successfully to: ${emailRecipient}`);
      } catch (emailErr) {
        console.error('⚠️ Notifier: Failed to deliver email notification:', emailErr.message);
      }
    } else {
      console.log('ℹ️ Notifier: Email alert skipped. SMTP credentials are not configured in environment variables.');
    }
  } catch (error) {
    console.error('❌ Notifier: notifyAdmins main routine crashed:', error);
  }
}
