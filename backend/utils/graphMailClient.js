import { config } from "../config/index.js";
import logger from "../logger.js";

/**
 * Get Microsoft Graph client for sending emails.
 * Uses client credentials flow (application permissions).
 */
const getGraphClient = async () => {
    // Dynamically import to avoid issues if packages aren't installed
    const { ClientSecretCredential } = await import("@azure/identity");
    const { Client } = await import("@microsoft/microsoft-graph-client");
    const { TokenCredentialAuthenticationProvider } = await import(
        "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js"
    );

    const { tenantId, clientId, clientSecret } = config.azure;

    if (!tenantId || !clientId || !clientSecret) {
        throw new Error("Azure credentials not configured");
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ["https://graph.microsoft.com/.default"],
    });

    return Client.initWithMiddleware({ authProvider });
};

/**
 * Send a password reset email using Microsoft Graph.
 * Falls back to console logging in development if Azure is not configured.
 *
 * @param {string} toEmail - Recipient email address
 * @param {string} userName - Recipient name for personalization
 * @param {string} resetLink - The password reset link
 */
export const sendPasswordResetEmail = async (toEmail, userName, resetLink) => {
    const { mailFrom } = config.azure;

    // Mock in development if Azure is not configured
    if (!mailFrom) {
        logger.info({
            event: "password_reset_email_mock",
            to: toEmail,
            resetLink,
        });
        console.log("\n========================================");
        console.log("[DEV] Password Reset Email");
        console.log(`To: ${toEmail}`);
        console.log(`Name: ${userName}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log("========================================\n");
        return;
    }

    try {
        const client = await getGraphClient();

        const message = {
            subject: "Nulstil dit password",
            body: {
                contentType: "HTML",
                content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">Nulstil dit password</h2>
            <p>Hej ${userName},</p>
            <p>Vi har modtaget en anmodning om at nulstille dit password.</p>
            <p>Klik på linket nedenfor for at vælge et nyt password:</p>
            <p style="margin: 24px 0;">
              <a href="${resetLink}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Nulstil password
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Linket udløber om ${config.passwordReset.tokenExpiryMinutes} minutter.
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Hvis du ikke har anmodet om at nulstille dit password, kan du ignorere denne email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              Denne email blev sendt automatisk. Svar venligst ikke på den.
            </p>
          </div>
        `,
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: toEmail,
                        name: userName,
                    },
                },
            ],
        };

        await client.api(`/users/${mailFrom}/sendMail`).post({ message });

        logger.info({ event: "password_reset_email_sent", to: toEmail });
    } catch (error) {
        logger.error({ event: "password_reset_email_failed", to: toEmail, error: error.message });
        throw error;
    }
};
