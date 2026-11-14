"use client";

import ScopedSavingsTab from "@/components/shared/ScopedSavingsTab";
import { reportingKeyId } from "@/components/UsagePage/keyActivityData";
import { hasProxyWideSpendView, spendScopeUserId } from "@/utils/roles";
import type { ActivityDateRange } from "@/app/(dashboard)/cost-optimization/_components/useDailyActivityRange";

interface KeySavingsTabProps {
  accessToken: string | null;
  keyToken: string;
  userId: string | null;
  userRole: string;
  activity: ActivityDateRange;
}

const KeySavingsTab = ({ accessToken, keyToken, userId, userRole, activity }: KeySavingsTabProps) => (
  <ScopedSavingsTab
    accessToken={accessToken}
    scope={{ userId: spendScopeUserId(userRole, userId), apiKey: reportingKeyId(keyToken) }}
    activity={activity}
    entityType="key"
    scopeNote={
      hasProxyWideSpendView(userRole)
        ? undefined
        : "仅显示你在这把密钥上的请求。团队共享密钥还会包含其他成员的消费，这里不计入。"
    }
  />
);

export default KeySavingsTab;
