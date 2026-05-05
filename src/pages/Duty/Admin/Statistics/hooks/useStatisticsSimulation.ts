import { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

interface SimulationParams {
  kipPrice: number;
  violationPenaltyRate: number;
  defaultQuota: number;
  overrides: Record<number, { quota?: number, penaltyRate?: number }>; // userId -> values
}

export const useStatisticsSimulation = (rawStats: any, initialSettings: any) => {
  const [params, setParams] = useState<SimulationParams>({
    kipPrice: initialSettings?.kipPrice || 20000,
    violationPenaltyRate: initialSettings?.violationPenaltyRate || 0.5,
    defaultQuota: initialSettings?.defaultQuota || 2.5,
    overrides: {}
  });

  // Reset params when initialSettings or rawStats period changes
  useEffect(() => {
    if (initialSettings) {
      let baselineQuota = initialSettings.defaultQuota || 2.5;

      // If we have rawStats, try to find a specific rule for this period
      if (rawStats?.period && initialSettings.quotaRules) {
        const start = dayjs(rawStats.period.startDate);
        const end = dayjs(rawStats.period.endDate);
        const periodRule = initialSettings.quotaRules.find((r: any) => 
          (r.type === 'member_all' || r.target === 'all') && 
          (!r.startDate || !r.endDate || (dayjs(r.startDate).isBefore(end) && dayjs(r.endDate).isAfter(start)))
        );
        if (periodRule) {
          baselineQuota = periodRule.quota;
        }
      }

      setParams(p => ({
        ...p,
        kipPrice: initialSettings.kipPrice || p.kipPrice,
        violationPenaltyRate: initialSettings.violationPenaltyRate || p.violationPenaltyRate,
        defaultQuota: baselineQuota,
      }));
    }
  }, [initialSettings, rawStats?.period]);


  const simulatedData = useMemo(() => {
    if (!rawStats || !rawStats.details) return null;

    const { details, period } = rawStats;
    const startDate = dayjs(period?.startDate);
    const endDate = dayjs(period?.endDate);
    const totalDays = endDate.diff(startDate, 'day') + 1;
    
    // Calculate scaling factor for quotas if not a full week
    // Basic logic: if range is 10 days, scale is 10/7
    const weekScale = totalDays / 7;

    // 1. Determine if the period is officially initialized (has a matching rule)
    let isPeriodInitialized = false;
    let periodBaselineQuota: number | undefined = undefined;

    if (initialSettings?.quotaRules) {
      const globalPeriodRule = initialSettings.quotaRules.find((r: any) => 
        (r.type === 'member_all' || r.target === 'all') && 
        (!r.startDate || !r.endDate || (dayjs(r.startDate).isBefore(endDate) && dayjs(r.endDate).isAfter(startDate)))
      );
      if (globalPeriodRule) {
        periodBaselineQuota = globalPeriodRule.quota;
        isPeriodInitialized = true;
      }
    }

    // 2. Determine "Virtual Set" - if the user changed the default quota in simulator
    const isVirtualSet = params.defaultQuota !== initialSettings?.defaultQuota;
    
    // Effective baseline is the rule's quota, or the virtual quota if touched, otherwise undefined
    const effectiveBaseline = isPeriodInitialized ? periodBaselineQuota : (isVirtualSet ? params.defaultQuota : undefined);

    const processedDetails = details.map((user: any) => {
      const userOverride = params.overrides[user.userId] || {};
      
      // Calculate individual base quota
      let baseQuota = effectiveBaseline;



      // Check for user-specific rules that might override the period baseline
      if (initialSettings?.quotaRules) {
        const userSpecificRule = initialSettings.quotaRules.find((r: any) => 
          r.type === 'user' && String(r.target) === String(user.studentId || user.userId) &&
          (!r.startDate || !r.endDate || (dayjs(r.startDate).isBefore(endDate) && dayjs(r.endDate).isAfter(startDate)))
        );
        if (userSpecificRule) {
          baseQuota = userSpecificRule.quota;
        }
      }


      // Priority: Individual Manual Override > User-specific Rule > Period Baseline
      const finalBaseQuota = userOverride.quota !== undefined ? userOverride.quota : baseQuota;
      
      const effectiveQuota = finalBaseQuota !== undefined 
        ? Number((finalBaseQuota * weekScale).toFixed(2))
        : undefined;

      const deficiency = effectiveQuota !== undefined 
        ? Number(Math.max(0, effectiveQuota - user.totalKips).toFixed(2))
        : undefined;

      // 2. Calculate earnings and penalties


      const penaltyRate = userOverride.penaltyRate !== undefined ? userOverride.penaltyRate : params.violationPenaltyRate;
      const rawEarnings = user.totalKips * params.kipPrice;
      const penaltyAmount = user.violationCount * (params.kipPrice * penaltyRate);
      const finalAmount = Math.max(0, rawEarnings - penaltyAmount);

      // 3. Status
      const isWarning = effectiveQuota !== undefined && user.totalKips < effectiveQuota;

      return {
        ...user,
        simulatedQuota: effectiveQuota,
        simulatedDeficiency: deficiency,
        simulatedFinalAmount: finalAmount,
        isWarning,
        penaltyRateUsed: penaltyRate
      };

    });

    // Generate Insights
    const insights = {
      topPerformers: [...processedDetails].sort((a: any, b: any) => b.totalKips - a.totalKips).slice(0, 5),
      underPerformers: processedDetails.filter((u: any) => u.isWarning).sort((a: any, b: any) => b.simulatedDeficiency - a.simulatedDeficiency),
      mostViolations: [...processedDetails].filter((u: any) => u.violationCount > 0).sort((a: any, b: any) => b.violationCount - a.violationCount).slice(0, 5),
      totalBudget: processedDetails.reduce((acc: number, u: any) => acc + u.simulatedFinalAmount, 0),
      averageKips: processedDetails.length ? processedDetails.reduce((acc: number, u: any) => acc + u.totalKips, 0) / processedDetails.length : 0,
      completionRate: processedDetails.length ? (processedDetails.filter((u: any) => !u.isWarning).length / processedDetails.length) * 100 : 0
    };


    return {
      details: processedDetails,
      insights,
      meta: {
        totalDays,
        weekScale,
        isPeriodInitialized,
        periodText: `${startDate.format('DD/MM')} - ${endDate.format('DD/MM/YYYY')}`
      }
    };

  }, [rawStats, params]);

  const updateParam = (key: keyof SimulationParams, value: any) => {
    setParams(p => ({ ...p, [key]: value }));
  };

  const updateIndividualOverride = (userId: number, values: { quota?: number, penaltyRate?: number }) => {
    setParams(p => ({
      ...p,
      overrides: {
        ...p.overrides,
        [userId]: { ...(p.overrides[userId] || {}), ...values }
      }
    }));
  };

  return {
    params,
    simulatedData,
    updateParam,
    updateIndividualOverride
  };
};
