import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CourseData } from "../types";

interface MentorSubscriptionsTabProps {
  tenantId: string;
  courses: CourseData[];
}

export default function MentorSubscriptionsTab({ tenantId, courses }: MentorSubscriptionsTabProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [planFilter, setPlanFilter] = useState("all-plans");
  const [courseFilter, setCourseFilter] = useState("all-courses");

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all-status");
    setPlanFilter("all-plans");
    setCourseFilter("all-courses");
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {t("mentorSubscriptions.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("mentorSubscriptions.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Input
              placeholder={t("mentorSubscriptions.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-56 text-xs bg-background dark:bg-input"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-9 text-xs bg-background dark:bg-input">
              <SelectValue placeholder={t("mentorSubscriptions.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">{t("mentorSubscriptions.allStatuses")}</SelectItem>
              <SelectItem value="active">{t("mentorSubscriptions.active")}</SelectItem>
              <SelectItem value="expired">{t("mentorSubscriptions.expired")}</SelectItem>
              <SelectItem value="cancelled">{t("mentorSubscriptions.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[110px] h-9 text-xs bg-background dark:bg-input">
              <SelectValue placeholder={t("mentorSubscriptions.allPlans")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-plans">{t("mentorSubscriptions.allPlans")}</SelectItem>
              <SelectItem value="monthly">{t("mentorSubscriptions.monthly")}</SelectItem>
              <SelectItem value="yearly">{t("mentorSubscriptions.yearly")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-background dark:bg-input">
              <SelectValue placeholder={t("mentorSubscriptions.allCourses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-courses">{t("mentorSubscriptions.allCourses")}</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={clearFilters} className="h-9 text-xs">
            {t("mentorSubscriptions.clear")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => {}} className="h-9 text-xs">
            <RefreshCw className="w-3.5 h-3.5 ml-1" />
            {t("mentorSubscriptions.refresh")}
          </Button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-card rounded-xl shadow-card p-6">
        <div className="mb-4">
          <h3 className="font-bold text-lg">{t("mentorSubscriptions.listTitle", { count: 0 })}</h3>
          <p className="text-sm text-muted-foreground">
            {t("mentorSubscriptions.listCount", { shown: 0, total: 0 })}
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">{t("mentorSubscriptions.empty")}</div>
      </div>
    </>
  );
}
