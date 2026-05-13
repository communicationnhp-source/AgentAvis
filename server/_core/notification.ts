/**
 * Notifications propriétaire — version Railway.
 * La version Manus utilisait un service interne (forge.manus.im) inaccessible
 * en dehors de leur plateforme.
 *
 * Cette version logue en console (Railway affiche les logs en temps réel)
 * et supporte optionnellement un webhook Slack ou Discord via NOTIFY_WEBHOOK_URL.
 */

export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * Envoie une notification au propriétaire.
 * - Toujours affiché dans les logs Railway
 * - Si NOTIFY_WEBHOOK_URL est défini, envoie aussi un message Slack/Discord
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = payload;

  // Toujours logger
  console.log(`\n📢 [Notification] ${title}\n${content}\n`);

  const webhookUrl = process.env.NOTIFY_WEBHOOK_URL;
  if (!webhookUrl) {
    return true; // pas de webhook configuré, c'est OK
  }

  try {
    // Format compatible Slack et Discord
    const body = webhookUrl.includes("discord")
      ? { content: `**${title}**\n${content}` }
      : { text: `*${title}*\n${content}` };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn(`[Notification] Webhook failed: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Webhook error:", error);
    return false;
  }
}
