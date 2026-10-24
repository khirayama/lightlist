import { CloudBillingClient } from "@google-cloud/billing";
import { logger } from "firebase-functions";
import { onMessagePublished } from "firebase-functions/v2/pubsub";

const billing = new CloudBillingClient();
const billingAccountName = "billingAccounts/006AFA-A3102C-9CBA02";
const budgetName = "Lightlist dev + prod monthly JPY 100";
const projects = ["lightlist-dev", "lightlist-prod-b0269"];

type BudgetNotification = {
  budgetDisplayName?: string;
  budgetAmount?: number;
  costAmount?: number;
  currencyCode?: string;
  costIntervalStart?: string;
};

export const stopLightlistBilling = onMessagePublished<BudgetNotification>(
  {
    topic: "lightlist-budget-stop",
    region: "asia-northeast1",
    serviceAccount: "lightlist-budget-stop@lightlist-prod-b0269.iam.gserviceaccount.com",
    maxInstances: 1,
    concurrency: 1,
    minInstances: 0,
    memory: "256MiB",
    cpu: "gcf_gen1",
    timeoutSeconds: 120,
    retry: true,
  },
  async (event) => {
    if (
      event.data.message.attributes.billingAccountId !== "006AFA-A3102C-9CBA02" ||
      event.data.message.attributes.budgetId !== "80977236-bfe3-482a-8e44-17e4b5374896"
    ) return;
    let notification: BudgetNotification;
    try {
      notification = event.data.message.json;
    } catch {
      logger.error("予算通知のJSONが不正です");
      return;
    }
    if (
      !notification ||
      notification.budgetDisplayName !== budgetName ||
      notification.currencyCode !== "JPY" ||
      notification.budgetAmount !== 100 ||
      typeof notification.costAmount !== "number" ||
      !Number.isFinite(notification.costAmount) ||
      notification.costAmount < 100 ||
      typeof notification.costIntervalStart !== "string"
    ) return;

    const intervalStart = new Date(notification.costIntervalStart);
    const now = new Date();
    if (
      !Number.isFinite(intervalStart.getTime()) ||
      intervalStart.getUTCFullYear() !== now.getUTCFullYear() ||
      intervalStart.getUTCMonth() !== now.getUTCMonth() ||
      intervalStart.getTime() > now.getTime()
    ) return;

    if (process.env.BILLING_STOP_ENABLED !== "true") {
      logger.warn("課金停止は無効です", { costAmount: notification.costAmount });
      return;
    }

    for (const projectId of projects) {
      const name = `projects/${projectId}`;
      const [info] = await billing.getProjectBillingInfo({ name });
      if (!info.billingEnabled) continue;
      if (info.billingAccountName !== billingAccountName) {
        throw new Error(`${projectId}の請求先が想定と異なります`);
      }
      await billing.updateProjectBillingInfo({
        name,
        projectBillingInfo: { billingAccountName: "" },
      });
      logger.warn("Lightlistの課金を無効化しました", {
        projectId,
        costAmount: notification.costAmount,
      });
    }
  },
);
