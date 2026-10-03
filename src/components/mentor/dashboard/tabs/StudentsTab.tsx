import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Edit2, KeyRound, Check, X, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StudentData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

interface StudentsTabProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
}

export default function StudentsTab({ students, setStudents }: StudentsTabProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [studentSearch, setStudentSearch] = useState("");
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editStudentFirstName, setEditStudentFirstName] = useState("");
  const [editStudentLastName, setEditStudentLastName] = useState("");
  const [editStudentEmail, setEditStudentEmail] = useState("");
  const [editStudentPhone, setEditStudentPhone] = useState("");
  const [pwStudent, setPwStudent] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [confirmStudentPassword, setConfirmStudentPassword] = useState("");
  const [savingStudentPassword, setSavingStudentPassword] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);

  const isRtl = i18n.dir() === "rtl";
  const locale = i18n.language?.startsWith("en") ? "en-US" : "ar-EG";

  const saveStudentEdit = async (studentId: string) => {
    const fullName = `${editStudentFirstName.trim()} ${editStudentLastName.trim()}`.trim();
    const email = editStudentEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast({ title: t("studentsTab.toasts.invalidEmail"), variant: "destructive" });
      return;
    }

    // Same academy cannot have two customers with the same email.
    const clash = students.some((s) => s.id !== studentId && (s.email || "").trim().toLowerCase() === email);
    if (clash) {
      toast({ title: t("studentsTab.toasts.duplicateEmail"), variant: "destructive" });
      return;
    }

    setSavingStudent(true);
    const { data, error } = await supabase
      .from("students")
      .update({
        full_name: fullName,
        email,
        phone: editStudentPhone.trim() || null,
      })
      .eq("id", studentId)
      .select("id, full_name, email, phone, created_at")
      .maybeSingle();
    setSavingStudent(false);

    if (error || !data) {
      const duplicate = (error as any)?.code === "23505";
      toast({
        title: duplicate
          ? t("studentsTab.toasts.duplicateEmail")
          : t("studentsTab.toasts.updateFailed"),
        description: duplicate ? undefined : error?.message,
        variant: "destructive",
      });
      return; // stay in edit mode, keep the old values on screen
    }

    setStudents(students.map((s) => (s.id === studentId ? { ...s, ...data } : s)));
    setEditingStudent(null);
    toast({ title: t("studentsTab.toasts.updated") });
  };

  const align = "text-start";
  const searchIconPos = isRtl ? "right-3" : "left-3";
  const searchInputPad = isRtl ? "pr-9" : "pl-9";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t("studentsTab.title")}</h1>
        <div className="relative w-full max-w-md">
          <Search
            className={`absolute ${searchIconPos} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`}
          />
          <Input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder={t("studentsTab.searchPlaceholder")}
            type="search"
            name="students-filter-query"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            className={`${searchInputPad} bg-background dark:bg-input`}
          />
        </div>
      </div>
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className={`${align} p-2 font-medium text-muted-foreground`}>
                  {t("studentsTab.table.name")}
                </th>
                <th className={`${align} p-2 font-medium text-muted-foreground`}>
                  {t("studentsTab.table.email")}
                </th>
                <th className={`${align} p-2 font-medium text-muted-foreground`}>
                  {t("studentsTab.table.phone")}
                </th>
                <th className={`${align} p-2 font-medium text-muted-foreground`}>
                  {t("studentsTab.table.joinedAt")}
                </th>
                <th className={`${align} p-2 font-medium text-muted-foreground`}>
                  {t("studentsTab.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {students
                .filter((s) => {
                  const q = studentSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    (s.full_name || "").toLowerCase().includes(q) ||
                    (s.email || "").toLowerCase().includes(q) ||
                    (s.phone || "").toLowerCase().includes(q)
                  );
                })
                .map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-muted/50"
                  >
                    <td className="p-2">
                      {editingStudent === student.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editStudentFirstName}
                            onChange={(e) => setEditStudentFirstName(e.target.value)}
                            className="h-8"
                            placeholder={t("studentsTab.firstNamePlaceholder")}
                          />
                          <Input
                            value={editStudentLastName}
                            onChange={(e) => setEditStudentLastName(e.target.value)}
                            className="h-8"
                            placeholder={t("studentsTab.lastNamePlaceholder")}
                          />
                        </div>
                      ) : (
                        <span className="font-medium">{student.full_name}</span>
                      )}
                    </td>
                    <td className="p-2">
                      {editingStudent === student.id ? (
                        <Input
                          value={editStudentEmail}
                          onChange={(e) => setEditStudentEmail(e.target.value)}
                          className="h-8"
                          dir="ltr"
                        />
                      ) : (
                        <span className="text-muted-foreground" dir="ltr">
                          {student.email}
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      {editingStudent === student.id ? (
                        <Input
                          value={editStudentPhone}
                          onChange={(e) => setEditStudentPhone(e.target.value)}
                          className="h-8"
                          dir="ltr"
                          placeholder="+20..."
                        />
                      ) : (
                        <span className="text-muted-foreground" dir="ltr">
                          {student.phone || "-"}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(student.created_at).toLocaleDateString(locale)}
                    </td>
                    <td className="p-2">
                      {editingStudent === student.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success"
                            disabled={savingStudent}
                            onClick={() => saveStudentEdit(student.id)}
                          >
                            {savingStudent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingStudent}
                            onClick={() => setEditingStudent(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingStudent(student.id);
                              const parts = (student.full_name || "").trim().split(/\s+/);
                              setEditStudentFirstName(parts[0] || "");
                              setEditStudentLastName(parts.slice(1).join(" "));
                              setEditStudentEmail(student.email);
                              setEditStudentPhone(student.phone || "");
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title={t("studentsTab.changePasswordTooltip")}
                            onClick={() => {
                              setPwStudent({
                                id: student.id,
                                name: student.full_name,
                                email: student.email,
                              });
                              setNewStudentPassword("");
                              setConfirmStudentPassword("");
                            }}
                          >
                            <KeyRound className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    {t("studentsTab.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Student Password Dialog */}
      <Dialog
        open={!!pwStudent}
        onOpenChange={(open) => {
          if (!open) setPwStudent(null);
        }}
      >
        <DialogContent className="sm:max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("studentsTab.changePasswordTitle")}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {pwStudent?.name} ({pwStudent?.email})
            </p>
          </DialogHeader>
          <div className="space-y-4">
            {/* Decoy fields: absorb browser/password-manager autofill */}
            <input type="text" name="username" autoComplete="username" tabIndex={-1} aria-hidden="true" className="hidden" />
            <input type="password" name="password" autoComplete="current-password" tabIndex={-1} aria-hidden="true" className="hidden" />
            <div className="space-y-2">
              <Label>{t("studentsTab.newPassword")}</Label>
              <div className="relative">
                <PasswordInput
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  placeholder={t("studentsTab.newPasswordPlaceholder")}
                  dir="ltr"
                  name="student-new-password"
                  autoComplete="new-password"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("studentsTab.confirmPassword")}</Label>
              <div className="relative">
                <PasswordInput
                  value={confirmStudentPassword}
                  onChange={(e) => setConfirmStudentPassword(e.target.value)}
                  dir="ltr"
                  name="student-confirm-password"
                  autoComplete="new-password"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setPwStudent(null)}
                disabled={savingStudentPassword}
              >
                {t("studentsTab.cancel")}
              </Button>
              <Button
                className="bg-primary text-primary-foreground border-0 hover:bg-primary/90"
                disabled={savingStudentPassword}

                onClick={async () => {
                  if (!pwStudent) return;
                  if (newStudentPassword.length < 6) {
                    toast({
                      title: t("studentsTab.toasts.shortPasswordTitle"),
                      description: t("studentsTab.toasts.shortPasswordDesc"),
                      variant: "destructive",
                    });
                    return;
                  }
                  if (newStudentPassword !== confirmStudentPassword) {
                    toast({
                      title: t("studentsTab.toasts.mismatch"),
                      variant: "destructive",
                    });
                    return;
                  }
                  setSavingStudentPassword(true);
                  const { data, error } = await supabase.functions.invoke(
                    "mentor-set-student-password",
                    {
                      body: {
                        student_id: pwStudent.id,
                        password: newStudentPassword,
                      },
                    },
                  );
                  setSavingStudentPassword(false);
                  if (error || (data as any)?.error) {
                    toast({
                      title: t("studentsTab.toasts.failed"),
                      description: (data as any)?.error || error?.message,
                      variant: "destructive",
                    });
                    return;
                  }
                  toast({ title: t("studentsTab.toasts.success") });
                  setPwStudent(null);
                }}
              >
                {savingStudentPassword
                  ? t("studentsTab.saving")
                  : t("studentsTab.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
