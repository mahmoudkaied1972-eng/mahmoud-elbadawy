/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Search,
  CheckCircle,
  XCircle,
  Settings,
  Copy,
  Check,
  Printer,
  ChevronRight,
  Database,
  ExternalLink,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Info,
  Calendar,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { StudentResult, WebAppConfig } from "./types";
import { GOOGLE_APPS_SCRIPT_CODE, MOCK_STUDENTS } from "./data";

export default function App() {
  const [selectedGrade, setSelectedGrade] = useState<"1" | "2" | null>(null);
  const [nationalId, setNationalId] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<StudentResult | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [isMockResult, setIsMockResult] = useState(false);

  // Configuration settings for connecting with real sheet
  const [showConfig, setShowConfig] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [webAppUrl, setWebAppUrl] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Copy code feedback state
  const [copied, setCopied] = useState(false);

  // Load Sheet configuration on mount
  useEffect(() => {
    fetchConfig();
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "we2026" || params.get("admin") === "true") {
      setIsAdmin(true);
    }
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const data = await response.json();
        setSheetUrl(data.sheetUrl || "");
        setWebAppUrl(data.webAppUrl || "");
      }
    } catch (err) {
      console.error("Error loading configuration:", err);
    }
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigStatus(null);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl, webAppUrl }),
      });
      if (response.ok) {
        setConfigStatus({ type: "success", text: "تم حفظ إعدادات الربط بنجاح لملف Google Sheet!" });
        setTimeout(() => setConfigStatus(null), 4000);
      } else {
        setConfigStatus({ type: "error", text: "فشل حفظ الإعدادات على الخادم." });
      }
    } catch (err) {
      setConfigStatus({ type: "error", text: "حدث خطأ غير متوقع أثناء الحفظ." });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = nationalId.trim();
    if (!cleanId) {
      setErrorMessage("برجاء إدخال الرقم القومي للطالب أولاً.");
      return;
    }
    if (!selectedGrade) {
      setErrorMessage("برجاء اختيار الصف الدراسي أولاً.");
      return;
    }

    setSearchLoading(true);
    setErrorMessage("");
    setWarningMessage("");
    setResult(null);
    setIsMockResult(false);

    try {
      const response = await fetch(`/api/search?grade=${selectedGrade}&nationalId=${encodeURIComponent(cleanId)}`);
      const resData = await response.json();

      if (response.ok && resData.status === "success") {
        setResult(resData.data);
        setIsMockResult(!!resData.isMock);
        if (resData.warning) {
          setWarningMessage(resData.warning);
        }
      } else {
        setErrorMessage(resData.message || "عذراً، لم نتمكن من العثور على النتيجة المطلوبة. تأكد من صحة الصف الدراسي والرقم القومي.");
      }
    } catch (err: any) {
      setErrorMessage("تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper calculation for appraisal based on percentage
  const getAppraisal = (percentage: number, status: string) => {
    if (status === "failed") return { label: "له دور ثانٍ", color: "text-red-600 bg-red-50 border-red-200" };
    if (percentage >= 85) return { label: "ممتاز", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (percentage >= 75) return { label: "جيد جداً", color: "text-blue-700 bg-blue-50 border-blue-200" };
    if (percentage >= 65) return { label: "جيد", color: "text-indigo-700 bg-indigo-50 border-indigo-200" };
    if (percentage >= 50) return { label: "مقبول", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { label: "ضعيف / متأخر", color: "text-rose-700 bg-rose-50 border-rose-200" };
  };

  const resetResult = () => {
    setResult(null);
    setWarningMessage("");
    setErrorMessage("");
  };

  const fillDemoId = (id: string, grade: "1" | "2") => {
    setSelectedGrade(grade);
    setNationalId(id);
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-[#6f2c91]/20 pb-12">
      
      {/* HEADER SECTION */}
      <header id="app-header" className="bg-white border-b-4 border-[#6f2c91] px-4 md:px-12 py-5 shadow-sm sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-4">
            {/* WE Custom Styled Logo Box */}
            <div className="w-14 h-14 bg-[#6f2c91] rounded-full flex items-center justify-center shadow-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#5a1b7a] to-[#803ea3] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="text-white font-black text-3xl font-mono relative z-10 select-none tracking-tight">we</span>
            </div>
            
            <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
            
            <div className="text-center sm:text-right">
              <h1 className="text-[#6f2c91] text-xl md:text-2xl font-black tracking-wide flex items-center justify-center sm:justify-start gap-2">
                بوابة نتائج الامتحانات
                <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-3 py-1 rounded-full border border-amber-200">مدارس we للتكنولوجيا التطبيقية فرع القليوبية</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-slate-500 text-sm bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-[#6f2c91]" />
              <span className="font-semibold text-slate-700">الفصل الدراسي الثاني 2025 - 2026</span>
            </div>

            {isAdmin && (
              <button
                id="settings-btn"
                onClick={() => setShowConfig(!showConfig)}
                className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all border ${
                  showConfig
                    ? "bg-[#6f2c91] text-white border-[#6f2c91] shadow-md shadow-[#6f2c91]/20"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Settings className={`w-4 h-4 ${showConfig ? 'animate-spin' : ''}`} />
                <span>{showConfig ? "إخفاء إعدادات الربط" : "ربط Google Sheet"}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* TOP DECORATIVE BANNER FOR RECOGNITION */}
      <div className="bg-gradient-to-r from-[#4F0F8C] to-[#8239C4] py-8 text-white text-center shadow-inner relative overflow-hidden no-print">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-60"></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 text-amber-300 drop-shadow-md animate-bounce" />
          <h2 className="text-2xl md:text-3.5xl font-extrabold tracking-wide drop-shadow-md leading-relaxed">بوابة الاستعلام عن نتائج الصف الأول والثاني لعام 2025/2026</h2>
        </div>
      </div>

      {/* SYSTEM MAIN PORTAL WRAPPER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {/* CONFIGURATION PANEL (GOOGLE SHEET COUPLING INSTRUCTIONS) */}
        {showConfig && (
          <div id="config-panel" className="bg-white border-2 border-dashed border-[#6f2c91]/50 p-6 rounded-3xl shadow-xl max-w-4xl mx-auto mb-8 animate-fadeIn no-print bg-gradient-to-b from-white to-purple-50/20">
            <div className="flex items-start gap-4 mb-5 border-b border-slate-100 pb-4">
              <div className="p-3 bg-[#6f2c91]/10 text-[#6f2c91] rounded-2xl">
                <Database className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800">إقران جدول بيانات جوجل (Google Sheets Relationship)</h3>
                <p className="text-sm text-slate-500 mt-1">
                  قم بربط هذه الواجهة الاحترافية مع ملف الـ Google Sheets الذي يضم درجات الطلاب ليعمل بشكل فوري وحقيقي.
                </p>
              </div>
            </div>

            <form onSubmit={saveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">رابط ملف جوجل شيت (Google Sheet Link)</label>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/your-id-here/edit"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#6f2c91]/35 focus:border-[#6f2c91] text-xs font-mono"
                />
                <span className="text-[11px] text-gray-400 block mt-1">
                  * للمرجعية فقط، ليتسنى لإدارة المدرسة تتبع الملف الأساسي.
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#6f2c91] flex items-center gap-1">
                  رابط تطبيق الويب المجمع (App Script URL) <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </label>
                <input
                  type="url"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#6f2c91]/30 outline-none focus:ring-2 focus:ring-[#6f2c91]/35 focus:border-[#6f2c91] text-xs font-mono text-[#6f2c91] bg-[#6f2c91]/5 font-semibold"
                />
                <span className="text-[11px] text-[#6f2c91] block mt-1 font-medium">
                  * هذا الرابط سيتلقى استعلامات الطلاب آلياً ويستخرج الدرجات بسرعة فائقة.
                </span>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-2 border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={configSaving}
                  className="bg-[#6f2c91] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#5a2476] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {configSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                  <span>حفظ وإقران الاتصال</span>
                </button>
              </div>
            </form>

            {configStatus && (
              <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 mb-6 ${
                configStatus.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}>
                {configStatus.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                <span>{configStatus.text}</span>
              </div>
            )}

            {/* HOW-TO INSTRUCTION BLOCK WITH CODE COPY */}
            <div className="bg-slate-50 border border-slate-200 rounded-2.5xl p-5">
              <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#6f2c91]" />
                كيف يمكنني تشغيل هذا وربط ملف الشيت الخاص بالمدرسة؟
              </h4>
              
              <ol className="text-slate-600 text-xs space-y-2 list-decimal list-inside pr-2 mb-4 leading-relaxed">
                <li>
                  قم بفتح ملف <span className="font-bold text-slate-800">Google Sheet</span> الذي به الدرجات (تأكد أن أسماء أوراق العمل هي <span className="bg-purple-100 text-[#6f2c91] px-1 py-0.5 rounded font-bold">grade one</span> و <span className="bg-purple-100 text-[#6f2c91] px-1 py-0.5 rounded font-bold">grade two</span>).
                </li>
                <li>
                  من القائمة العليا، اضغط على <span className="font-bold text-slate-800">Extensions (الإضافات)</span> ثم اختر <span className="font-bold text-slate-800">Apps Script</span>.
                </li>
                <li>
                  قم بمسح أي كود موجود حالياً بمحرر الأكواد، ثم قُم بنسخ الكود البرمجي أدناه ولصقه هناك.
                </li>
                <li>
                  اضغط على زر <span className="font-bold text-slate-800">Deploy (نشر)</span> &gt; اختر <span className="font-bold text-slate-800">New deployment (نشر جديد)</span>.
                </li>
                <li>
                  اختر النوع كـ <span className="font-bold text-slate-800">Web App (تطبيق ويب)</span>، واجعل الـ Execute as: <span className="font-bold text-slate-800">Me (أنا)</span>، واجعل الـ Who has access: <span className="font-bold text-slate-800">Anyone (الجميع)</span>.
                </li>
                <li>
                  اضغط Deploy، وافق على الأذونات للوصول لملفك، ثم انسخ رابط الـ <span className="font-bold text-slate-800">Web App URL</span> وضعه في المربع المخصص بالصفحة هنا للموقع.
                </li>
              </ol>

              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-200 px-4 py-2 rounded-t-xl">
                  <span className="text-[11px] font-mono font-bold text-slate-700">GoogleAppsScriptCode.js</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#6f2c91] bg-white hover:bg-[#6f2c91] hover:text-white transition-all px-3 py-1 rounded-md shadow-sm cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "تم النسخ!" : "نسخ الكود بالكامل"}</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-b-xl overflow-x-auto text-[10px] space-y-1 font-mono max-h-56">
                  <code>{GOOGLE_APPS_SCRIPT_CODE}</code>
                </pre>
              </div>
            </div>
          </div>
        )}



        {/* TWO-STEP LANDING & DECISION VIEW */}
        {!result && (
          <div id="landing-flow" className="max-w-4xl mx-auto space-y-8 animate-fadeIn no-print">
            
            {/* STEP 1: GRADE TARGET SELECTION */}
            <div className="text-center space-y-2 mt-4">
              <h3 className="text-lg md:text-xl font-extrabold text-slate-800">
                الخطوة الأولى: حدد الصف الدراسي المطلوب الاستعلام عنه
              </h3>
              <p className="text-sm text-slate-500">
                برجاء اختيار الصف لتوجيه عملية البحث لقاعدة البيانات المحددة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              
              {/* GRADE ONE CONTAINER */}
              <div
                id="select-grade-1-card"
                onClick={() => {
                  setSelectedGrade("1");
                  setErrorMessage("");
                }}
                className={`bg-white rounded-3xl p-8 shadow-md border-2 cursor-pointer transition-all flex flex-col items-center text-center group relative overflow-hidden ${
                  selectedGrade === "1"
                    ? "border-[#6f2c91] ring-4 ring-[#6f2c91]/15 scale-[1.02] shadow-xl"
                    : "border-transparent hover:border-slate-300 hover:shadow-lg"
                }`}
              >
                {selectedGrade === "1" && (
                  <div className="absolute top-4 right-4 bg-[#6f2c91] text-white p-1 rounded-full">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 transition-all duration-300 ${
                  selectedGrade === "1"
                    ? "bg-[#6f2c91] text-white scale-110"
                    : "bg-purple-50 text-[#6f2c91] group-hover:bg-[#6f2c91] group-hover:text-white"
                }`}>
                  <GraduationCap className="w-10 h-10" />
                </div>

                <h3 className="text-xl font-bold text-slate-800 group-hover:text-[#6f2c91] transition-colors">الصف الأول الثانوي</h3>
                <span className="text-xs font-bold text-[#6f2c91] bg-purple-50 px-3 py-1 rounded-full mt-2">جدول grade one</span>
                
                <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                  الاستعلام عن نتائج امتحانات جميع المواد للصف الأول بمدارس التكنولوجيا التطبيقية ويشمل نظري، عملي وتدريب ميداني.
                </p>
              </div>

              {/* GRADE TWO CONTAINER */}
              <div
                id="select-grade-2-card"
                onClick={() => {
                  setSelectedGrade("2");
                  setErrorMessage("");
                }}
                className={`bg-white rounded-3xl p-8 shadow-md border-2 cursor-pointer transition-all flex flex-col items-center text-center group relative overflow-hidden ${
                  selectedGrade === "2"
                    ? "border-[#6f2c91] ring-4 ring-[#6f2c91]/15 scale-[1.02] shadow-xl"
                    : "border-transparent hover:border-slate-300 hover:shadow-lg"
                }`}
              >
                {selectedGrade === "2" && (
                  <div className="absolute top-4 right-4 bg-[#6f2c91] text-white p-1 rounded-full">
                    <Check className="w-4 h-4" />
                  </div>
                )}

                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 transition-all duration-300 ${
                  selectedGrade === "2"
                    ? "bg-[#6f2c91] text-white scale-110"
                    : "bg-purple-50 text-[#6f2c91] group-hover:bg-[#6f2c91] group-hover:text-white"
                }`}>
                  <GraduationCap className="w-10 h-10" />
                </div>

                <h3 className="text-xl font-bold text-slate-800 group-hover:text-[#6f2c91] transition-colors">الصف الثاني الثانوي</h3>
                <span className="text-xs font-bold text-[#6f2c91] bg-purple-50 px-3 py-1 rounded-full mt-2">جدول grade two</span>

                <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                  الاستعلام عن نتائج امتحانات الصف الثاني، والتي تضم كذلك مادة الدراسات الاجتماعية المضافة في مواد النقل والنجاح.
                </p>
              </div>

            </div>

            {/* STEP 2: NATIONAL ID INPUT */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-md border border-slate-100 max-w-4xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#6f2c91] to-purple-600"></div>

              <form onSubmit={handleSearch} className="space-y-6">
                <div>
                  <label className="block text-slate-700 font-bold mb-2 text-sm md:text-base flex items-center gap-1">
                    أدخل الرقم القومي للطالب المكون من 14 رقماً
                    <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-5 h-5 text-[#6f2c91]" />
                    </div>
                    
                    <input
                      id="national-id-input"
                      type="text"
                      maxLength={14}
                      value={nationalId}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setNationalId(val);
                      }}
                      placeholder="أدخل الرقم القومي للطالب كاملاً (مثال: 30910141403371)"
                      disabled={!selectedGrade}
                      className="w-full pr-12 pl-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-[#6f2c91] focus:ring-0 outline-none text-lg md:text-xl font-mono tracking-widest text-[#6f2c91] bg-slate-50 placeholder:font-sans placeholder:text-gray-400 placeholder:text-sm placeholder:tracking-normal disabled:bg-slate-100 disabled:cursor-not-allowed transition-all"
                    />

                    <button
                      id="submit-search-btn"
                      type="submit"
                      disabled={searchLoading || !selectedGrade}
                      className="absolute left-2 top-2 bottom-2 bg-[#6f2c91] hover:bg-[#5a2476] text-white px-6 md:px-8 rounded-xl font-extrabold text-sm transition-all focus:outline-none flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {searchLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      <span>استعلم فوراً</span>
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mt-3 text-xs gap-2">
                    <span className="text-slate-400">
                      * يرجى التأكد من إدخال الـ 14 رقماً باللغة الإنجليزية كما مبيّن بشهادة الميلاد أو بطاقة الرقم القومي.
                    </span>
                    {!selectedGrade && (
                      <span className="text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        ⚠️ من فضلك حدد الصف الدراسي في الأعلى ليتم التفعيل!
                      </span>
                    )}
                  </div>
                </div>
              </form>

              {/* Error container */}
              {errorMessage && (
                <div id="error-message" className="mt-5 p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-3 animate-headShake">
                  <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* LANDING EXTRA CARDS & BENEFITS REMOVED */}

          </div>
        )}

        {/* STUDENT RESULT & DETAIL PRESENTATION ROW */}
        {result && (
          <div id="result-view" className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            
            {/* BACK BUTTON AND UTILITIES FOR RESULT VIEW */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 no-print">
              <button
                onClick={resetResult}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <ChevronRight className="w-4 h-4 text-[#6f2c91]" />
                <span>العودة لإجراء استعلام آخر</span>
              </button>

              <button
                onClick={() => window.print()}
                className="bg-[#6f2c91] hover:bg-[#5a2476] text-white px-6 py-2.5 rounded-2xl font-bold text-sm transition-all/300 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#6f2c91]/15"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة شهادة الدرجات</span>
              </button>
            </div>



            {/* PRINT CERTIFICATE CARD WRAPPER */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-150 overflow-hidden relative print:border-0 print:shadow-none">
              
              {/* BRAND COLOR DECORATIVE STRIP */}
              <div className="h-4 bg-[#6f2c91]"></div>

              {/* SCHOOL CERTIFICATE HEADER HEADER */}
              <div className="p-6 md:p-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-150 relative">
                
                {/* Decorative watermarked logo for print design */}
                <div className="absolute left-6 top-6 opacity-5 sm:opacity-10 text-[#6f2c91]">
                  <GraduationCap className="w-32 h-32" />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                  <div className="text-center sm:text-right space-y-1">
                    <h4 className="text-md font-bold text-slate-800 tracking-wide">وزارة التربية والتعليم والتعليم الفني</h4>
                    <p className="text-xs text-slate-500">مدرسة we للتكنولوجيا التطبيقية فرع القليوبية</p>
                    <p className="text-[#6f2c91] font-bold text-lg pt-1">إخطار رسمي بدرجات امتحانات الفصل الدراسي الثاني</p>
                  </div>

                  <div className="flex flex-col items-center">
                    {/* Badge of general success */}
                    <div className={`px-6 py-2.5 rounded-2xl border-2 text-center shadow-sm font-black text-lg ${
                      result.status === "passed"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-300/30"
                        : "bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-300/30"
                    }`}>
                      {result.status === "passed" ? "ناجح ومُنقول للصف الأعلى ✅" : "له دور ثانٍ / دور ملحق ⚠️"}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 font-medium">العام الدراسي 2025 / 2026</span>
                  </div>
                </div>

                {/* STUDENT INFO HIGHLIGHTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 bg-slate-100/90 rounded-2.5xl p-5 border border-slate-205">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 block">اسم الطالب رباعي</span>
                    <span className="text-md font-bold text-slate-800">{result.studentName}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 block">رقم الجلوس</span>
                    <span className="text-md font-bold text-[#6f2c91] font-mono tracking-wider">{result.seatNumber || "غير متوفر"}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 block">الصف الدراسي</span>
                    <span className="text-md font-bold text-slate-800">
                      {result.grade === "1" ? "الصف الأول الثانوي" : "الصف الثاني الثانوي"}
                    </span>
                  </div>

                  <div className="col-span-1 md:col-span-3 h-px bg-slate-200 my-1"></div>

                  <div className="space-y-1 col-span-1 md:col-span-2">
                    <span className="text-xs text-slate-500 block">الرقم القومي للطالب</span>
                    <span className="text-sm font-bold text-slate-700 font-mono tracking-widest">{result.nationalId}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 block">حالة النتيجة</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                      result.status === "passed"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {result.status === "passed" ? "مكتمل وناجح" : "يوجد مواد لم تجتاز الـ 50%"}
                    </span>
                  </div>
                </div>
              </div>

              {/* SUBJECTS DEGREES DETAIL GRID */}
              <div className="p-6 md:p-8">
                <h5 className="font-bold text-slate-800 mb-4 text-sm md:text-base border-r-4 border-[#6f2c91] pr-2.5 py-0.5">تفاصيل الدرجات التفصيلية للمواد</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.subjects.map((subj, index) => {
                    const scoreNum = parseFloat(subj.score as string);
                    const isPassed = !isNaN(scoreNum) ? scoreNum >= (subj.maxScore / 2) : true;
                    const progressPercentage = !isNaN(scoreNum) ? (scoreNum / subj.maxScore) * 100 : 0;
                    
                    // Specific exclusions for final total additions (Religion in egypt is not added, nor national education sometimes)
                    const isExcluding = subj.name === "التربية الدينية" || subj.name === "التربية الوطنية";

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-2xl border transition-all ${
                          !isPassed
                            ? "bg-rose-50/50 border-rose-200"
                            : "bg-white border-slate-150 hover:bg-slate-50 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-0.5">
                            <h6 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                              {subj.name}
                              {isExcluding && (
                                <span className="bg-slate-200 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                  لا تضاف للمجموع
                                </span>
                              )}
                            </h6>
                            <span className="text-xs text-slate-400">
                              درجة النجاح الصغرى: {subj.maxScore / 2} من {subj.maxScore}
                            </span>
                          </div>

                          <div className="text-left">
                            <span className={`text-md font-extrabold block ${!isPassed ? 'text-rose-600 font-black' : 'text-slate-850'}`}>
                              {subj.score} <span className="text-xs text-slate-400 font-normal">/ {subj.maxScore}</span>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${
                              !isPassed
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {!isPassed ? "دور ثانٍ ⚠️" : "مجتاز"}
                            </span>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              !isPassed ? "bg-rose-500" : isExcluding ? "bg-blue-400" : "bg-[#6f2c91]"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* OVERALL STATISTICS TOTAL BLOCK */}
                <div className="mt-8 border-t border-slate-150 pt-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="bg-[#6f2c91]/5 border border-[#6f2c91]/20 rounded-2xl p-4 text-center space-y-1">
                      <span className="text-xs text-slate-500 block">درجة المجموع التراكمي</span>
                      <span className="text-xl md:text-2xl font-black text-[#6f2c91]">
                        {result.totalScore}
                        <span className="text-xs text-slate-400 font-normal"> / {result.maxTotal}</span>
                      </span>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
                      <span className="text-xs text-emerald-700 block">النسبة المئوية الكلية</span>
                      <span className="text-xl md:text-2xl font-black text-emerald-800">
                        {result.percentage}%
                      </span>
                    </div>

                    {/* Overall Appraisal Grade custom calc */}
                    {(() => {
                      const appraisal = getAppraisal(result.percentage, result.status);
                      return (
                        <div className={`border rounded-2xl p-4 text-center space-y-1 ${appraisal.color}`}>
                          <span className="text-xs block">التقدير العام للطالب</span>
                          <span className="text-xl md:text-2xl font-black">
                            {appraisal.label}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center flex flex-col justify-center">
                      <span className="text-[10px] text-slate-400">تاريخ إصدار النتيجة</span>
                      <span className="text-xs font-bold text-slate-700 font-mono mt-1">
                        {new Date().toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                  </div>
                </div>

                {/* EG GRADING SYSTEM KEY FOR COMPREHENSIVE LOOK */}
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2.5xl text-xs text-slate-500 space-y-2 no-print">
                  <p className="font-bold text-slate-700">📌 مفتاح تقييم التقدير العام لطلاب مدارس WE:</p>
                  <p className="leading-relaxed">
                    يتم احتساب المجموع بناءً على جميع المواد المضافة للمجموع (اللغة العربية، اللغة الإنجليزية، الفيزياء المتقدمة، الرياضيات المتقدمة، التدريب الميداني، والتحصيل النظري والعملي بالدراسات التخصصية). التقدير الممتاز من <span className="font-bold text-slate-705">٨٥٪ فأكثر</span>، والتقدير جيد جداً من <span className="font-bold text-slate-705">٧٥٪ لأقل من ٨٥٪</span>، والتقدير جيد من <span className="font-bold text-slate-705">٦٥٪ لأقل من ٧٥٪</span>، والتقدير مقبول من <span className="font-bold text-slate-705">٥٠٪ لأقل من ٦٥٪</span>. يعتبر الطالب راسباً في المادة أو له دور ثانٍ إذا حصل على أقل من ٥٠٪ من درجة المادة العظمى.
                  </p>
                </div>

              </div>

              {/* STAMP REMOVED */}

            </div>

            {/* DIRECT NOTES ON EXCEL AND VERIFICATION */}
            <div className="bg-slate-100 border border-slate-200 rounded-2.5xl p-5 text-xs text-slate-600 leading-relaxed flex items-start gap-3 no-print">
              <Info className="w-5 h-5 text-[#6f2c91] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">ملاحظة لطالب مدرسة we للتكنولوجيا التطبيقية فرع القليوبية:</p>
                <p className="mt-1">
                  في حال وجود أي تباين بسيط أو شك في المجموع التراكمي المكتوب، يرجى مراجعة إدارة التسجيل والامتحانات بالمدرسة. البوابة تعرض فقط آخر البيانات المرصودة بملف <span className="font-bold text-slate-800">Google Sheet</span> التابع للجنة الرصد والامتحانات.
                </p>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* SYSTEM PERSISTED FOOTER */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-6 px-4 md:px-12 text-slate-500 text-xs no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-right space-y-1">
            <p className="font-bold text-slate-700">بوابة النتائج التعليمية الإلكترونية - مدارس WE</p>
            <p>مدعوم بواسطة ربط مباشر مع محرك Google Sheets API لضمان جودة وتكامل البيانات فورا.</p>
          </div>

          <div className="flex gap-6 font-semibold">
            <a href="#" onClick={(e) => { e.preventDefault(); setShowConfig(true); }} className="hover:text-[#6f2c91] transition-colors flex items-center gap-1">
              <Settings className="w-3.5 h-3.5" />
              <span>إعدادات النظام</span>
            </a>
            <span className="text-slate-300">|</span>
            <a href="https://te.eg" target="_blank" rel="noopener noreferrer" className="hover:text-[#6f2c91] transition-colors flex items-center gap-1">
              <span>البوابة الرسمية لـ المصرية للاتصالات</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
