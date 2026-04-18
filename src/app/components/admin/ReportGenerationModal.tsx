import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Download, FileText, Calendar, Filter, ChevronDown,
  CheckCircle2, TrendingUp, Users, MapPin, Award, Clock,
  Settings, Eye, BarChart3, Loader,
} from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth } from "date-fns";
import Papa from "papaparse";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  fetchReports,
  fetchAdminStats,
  fetchLeaderboard,
  fetchMonthlyTrends,
  fetchCategoryData,
  fetchBarangayData,
  type Report,
} from "../../services/api";
import { useToast } from "../../context/ToastContext";

interface ReportFilters {
  startDate: string;
  endDate: string;
  status: string;
  category: string;
  format: "pdf" | "csv";
  includeCharts: boolean;
  includeLeaderboard: boolean;
}

const CATEGORIES = [
  "All Categories",
  "Suspicious Activity",
  "Infrastructure",
  "Environmental",
  "Public Disturbance",
  "Natural Disaster",
];

const STATUS_OPTIONS = [
  "all",
  "pending_verification",
  "approved",
  "rejected",
  "in_progress",
  "submitted",
  "resolved",
];

const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "This Month", preset: "thisMonth" },
  { label: "Last Month", preset: "lastMonth" },
  { label: "Custom", days: 0 },
];

interface ReportData {
  reports: Report[];
  stats: any;
  leaderboard: any[];
  trends: any[];
  categories: any[];
  barangays: any[];
}

export function ReportGenerationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: format(addDays(new Date(), -30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    status: "all",
    category: "All Categories",
    format: "pdf",
    includeCharts: true,
    includeLeaderboard: true,
  });

  const handleDatePreset = (days?: number, preset?: string) => {
    const today = new Date();
    let start: Date;

    if (preset === "thisMonth") {
      start = startOfMonth(today);
    } else if (preset === "lastMonth") {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
      start = startOfMonth(lastMonth);
    } else {
      start = addDays(today, -(days || 30));
    }

    setFilters({
      ...filters,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(today, "yyyy-MM-dd"),
    });
  };

  const generatePDF = async (data: ReportData) => {
    let element: HTMLDivElement | null = null;
    
    try {
      // Create container with NO class names to avoid CSS inheritance
      element = document.createElement("div");
      element.setAttribute("data-pdf", "true");
      element.style.padding = "40px";
      element.style.fontFamily = "Arial, sans-serif";
      element.style.backgroundColor = "#ffffff";
      element.style.color = "#333333";
      element.style.lineHeight = "1.5";
      element.style.fontSize = "14px";
      element.style.width = "1024px";

      // Build HTML with only inline styles - NO CSS classes
      let html = `
<div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #800000; padding-bottom: 30px;">
  <h1 style="font-size: 36px; color: #800000; margin: 0 0 10px 0; font-weight: bold;">Bantay Reports</h1>
  <p style="font-size: 14px; color: #666; margin: 0;">Generated ${format(new Date(), "MMMM d, yyyy")}</p>
  <p style="font-size: 12px; color: #999; margin: 10px 0 0 0;">Date Range: ${filters.startDate} to ${filters.endDate}</p>
</div>

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px;">
  <div style="background: #a00000; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <div style="font-size: 28px; font-weight: bold; margin-bottom: 8px;">${data.stats?.totalReports || 0}</div>
    <div style="font-size: 13px;">Total Reports</div>
  </div>
  <div style="background: #22a01a; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <div style="font-size: 28px; font-weight: bold; margin-bottom: 8px;">${data.stats?.resolved || 0}</div>
    <div style="font-size: 13px;">Resolved</div>
  </div>
  <div style="background: #0891b2; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <div style="font-size: 28px; font-weight: bold; margin-bottom: 8px;">${data.stats?.responseRate || 0}%</div>
    <div style="font-size: 13px;">Response Rate</div>
  </div>
</div>

<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 40px;">
  <h2 style="font-size: 18px; color: #800000; margin: 0 0 15px 0; font-weight: bold;">Report Summary</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <tr style="background: #800000; color: white;">
      <th style="padding: 12px; text-align: left; font-weight: bold;">Status</th>
      <th style="padding: 12px; text-align: left; font-weight: bold;">Count</th>
      <th style="padding: 12px; text-align: left; font-weight: bold;">Percentage</th>
    </tr>
`;

      const statuses = STATUS_OPTIONS.filter((s) => s !== "all");
      const total = data.reports.length || 1;

      let rowCount = 0;
      statuses.forEach((status) => {
        const count = data.reports.filter((r) => r.status === status).length;
        const percentage = ((count / total) * 100).toFixed(1);
        const bgColor = rowCount % 2 === 0 ? "#ffffff" : "#f9f9f9";
        rowCount++;
        html += `
    <tr style="background: ${bgColor};">
      <td style="padding: 12px; border-bottom: 1px solid #ddd;">${status.replace(/_/g, " ")}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd; color: #800000; font-weight: bold;">${count}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd;">${percentage}%</td>
    </tr>
`;
      });

      html += `
  </table>
</div>
`;

      // Category breakdown
      if (data.categories.length > 0) {
        html += `
<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 40px;">
  <h2 style="font-size: 18px; color: #800000; margin: 0 0 15px 0; font-weight: bold;">By Category</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <tr style="background: #800000; color: white;">
      <th style="padding: 12px; text-align: left; font-weight: bold;">Category</th>
      <th style="padding: 12px; text-align: left; font-weight: bold;">Count</th>
    </tr>
`;
        rowCount = 0;
        data.categories.forEach((cat) => {
          const bgColor = rowCount % 2 === 0 ? "#ffffff" : "#f9f9f9";
          rowCount++;
          html += `
    <tr style="background: ${bgColor};">
      <td style="padding: 12px; border-bottom: 1px solid #ddd;">${cat.name || "Unknown"}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd; color: #800000; font-weight: bold;">${cat.value || 0}</td>
    </tr>
`;
        });
        html += `
  </table>
</div>
`;
      }

      // Leaderboard
      if (filters.includeLeaderboard && data.leaderboard.length > 0) {
        html += `
<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 40px;">
  <h2 style="font-size: 18px; color: #800000; margin: 0 0 15px 0; font-weight: bold;">🏆 Top Reporters</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <tr style="background: #800000; color: white;">
      <th style="padding: 12px; text-align: left; font-weight: bold;">Rank</th>
      <th style="padding: 12px; text-align: left; font-weight: bold;">Reporter</th>
      <th style="padding: 12px; text-align: left; font-weight: bold;">Reports</th>
      <th style="padding: 12px; text-align: left; font-weight: bold;">Points</th>
    </tr>
`;
        rowCount = 0;
        data.leaderboard.slice(0, 10).forEach((user, idx) => {
          const bgColor = rowCount % 2 === 0 ? "#ffffff" : "#f9f9f9";
          rowCount++;
          html += `
    <tr style="background: ${bgColor};">
      <td style="padding: 12px; border-bottom: 1px solid #ddd; color: #800000; font-weight: bold;">#${idx + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd;">${user.name || "Anonymous"}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd;">${user.reports || 0}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd; color: #800000; font-weight: bold;">${user.points || 0}</td>
    </tr>
`;
        });
        html += `
  </table>
</div>
`;
      }

      // Monthly Trends Analytics
      if (filters.includeCharts) {
        html += `
<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 40px;">
  <h2 style="font-size: 18px; color: #800000; margin: 0 0 15px 0; font-weight: bold;">📈 Monthly Trends</h2>
`;
        if (data.trends.length > 0) {
          html += `
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <tr style="background: #800000; color: white;">
      <th style="padding: 12px; text-align: left; font-weight: bold;">Month</th>
      <th style="padding: 12px; text-align: left; font-weight: bold;">Reports Filed</th>
      <th style="padding: 12px; text-align: left; font-weight: bold;">Resolved</th>
    </tr>
`;
          rowCount = 0;
          data.trends.slice(-12).forEach((trend: any) => {
            const bgColor = rowCount % 2 === 0 ? "#ffffff" : "#f9f9f9";
            rowCount++;
            html += `
    <tr style="background: ${bgColor};">
      <td style="padding: 12px; border-bottom: 1px solid #ddd;">${trend.month || "N/A"}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd;">${trend.reports || 0}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd; color: #22a01a; font-weight: bold;">${trend.resolved || 0}</td>
    </tr>
`;
          });
          html += `
  </table>
`;
        } else {
          html += `<p style="color: #666; font-size: 13px; padding: 12px;">No trend data available</p>`;
        }
        html += `
</div>
`;
      }

      // Barangay Performance Analytics
      if (filters.includeCharts) {
        html += `
<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 40px;">
  <h2 style="font-size: 18px; color: #800000; margin: 0 0 15px 0; font-weight: bold;">🗺️ Barangay Performance</h2>
`;
        if (data.barangays.length > 0) {
          html += `
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <tr style="background: #800000; color: white;">
      <th style="padding: 12px; text-align: left; font-weight: bold;">Barangay</th>
      <th style="padding: 12px; text-align: left; font-weight: bold;">Reports</th>
      <th style="padding: 12px; text-align: left; font-weight: bold;">Resolved</th>
    </tr>
`;
          rowCount = 0;
          data.barangays.forEach((barangay: any) => {
            const bgColor = rowCount % 2 === 0 ? "#ffffff" : "#f9f9f9";
            rowCount++;
            html += `
    <tr style="background: ${bgColor};">
      <td style="padding: 12px; border-bottom: 1px solid #ddd;">${barangay.name || "Unknown"}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd;">${barangay.reports || 0}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd; color: #22a01a; font-weight: bold;">${barangay.resolved || 0}</td>
    </tr>
`;
          });
          html += `
  </table>
`;
        } else {
          html += `<p style="color: #666; font-size: 13px; padding: 12px;">No barangay data available</p>`;
        }
        html += `
</div>
`;
      }

      html += `
<div style="text-align: center; color: #999; font-size: 11px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
  <p style="margin: 0;">This report is confidential and for authorized personnel only.</p>
  <p style="margin: 5px 0 0 0;">Bantay SP System • ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}</p>
</div>
`;

      element.innerHTML = html;
      document.body.appendChild(element);

      // Debug: Log HTML size and sections
      console.log("[PDF] HTML generated:", {
        htmlLength: html.length,
        hasTrendsSection: html.includes("📈 Monthly Trends"),
        hasBarangaySection: html.includes("🗺️ Barangay Performance"),
        trendTableCount: (html.match(/<table.*?Trends.*?<\/table>/gs) || []).length,
        barangayTableCount: (html.match(/<table.*?Barangay.*?<\/table>/gs) || []).length,
      });

      // Use html2canvas to convert element to canvas, completely bypassing CSS parsing
      console.log("[PDF] Starting html2canvas conversion...");
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      console.log("[PDF] Canvas created:", {
        width: canvas.width,
        height: canvas.height,
        expectedPageCount: Math.ceil((canvas.height * 210) / canvas.width / 297),
      });

      // Get canvas dimensions and calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297; // A4 height in mm
      let heightLeft = imgHeight;
      let position = 0;

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      // Add pages
      while (heightLeft > 0) {
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        position -= pageHeight;
        if (heightLeft > 0) {
          pdf.addPage();
        }
      }

      // Save PDF
      pdf.save(`Bantay-Reports-${filters.startDate}-to-${filters.endDate}.pdf`);

      console.log("[PDF] PDF saved successfully with charts");

      // Wait for download
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("PDF generation error:", error);
      throw error;
    } finally {
      if (element && element.parentNode) {
        try {
          document.body.removeChild(element);
        } catch (err) {
          console.warn("Error removing element:", err);
        }
      }
    }
  };

  const generateCSV = async (data: ReportData) => {
    let url: string | null = null;
    let link: HTMLAnchorElement | null = null;
    
    try {
      const csvData = data.reports.map((report) => ({
        "Report ID": report.id,
        Title: report.title,
        Category: report.category,
        Status: report.status,
        Reporter: report.is_anonymous ? "Anonymous" : report.reporter,
        "Date Filed": format(new Date(report.created_at), "yyyy-MM-dd HH:mm"),
        "Date Resolved": report.resolved_at
          ? format(new Date(report.resolved_at), "yyyy-MM-dd HH:mm")
          : "N/A",
        Location: report.location,
        Upvotes: report.upvotes,
        Comments: report.comments,
        "Admin Notes": report.admin_notes || "N/A",
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      
      // Create download link
      url = URL.createObjectURL(blob);
      link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Bantay-Reports-${filters.startDate}-to-${filters.endDate}.csv`);
      link.style.visibility = "hidden";
      
      // Append to body, click, and clean up
      document.body.appendChild(link);
      link.click();
      
      // Wait for download to start
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Cleanup
      if (link.parentNode) {
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("CSV generation error:", error);
      throw error;
    } finally {
      // Ensure cleanup happens
      if (url) {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          console.warn("Error revoking URL:", err);
        }
      }
      if (link && link.parentNode) {
        try {
          document.body.removeChild(link);
        } catch (err) {
          console.warn("Error removing link:", err);
        }
      }
    }
  };

  const handleGenerate = async () => {
    if (!filters.startDate || !filters.endDate) {
      showToast("Please select a date range", "error");
      return;
    }

    setGenerating(true);
    try {
      showToast("Generating report...", "info");

      // Fetch all necessary data
      const [reportsRes, statsRes, leaderboardRes, trendsRes, categoriesRes, barangaysRes] = await Promise.all([
        fetchReports(),
        fetchAdminStats(),
        fetchLeaderboard(),
        fetchMonthlyTrends(),
        fetchCategoryData(),
        fetchBarangayData(),
      ]);

      const allReports = reportsRes.data || [];
      const filteredReports = allReports.filter((report: Report) => {
        const reportDate = new Date(report.created_at).toISOString().split("T")[0];
        const inDateRange = reportDate >= filters.startDate && reportDate <= filters.endDate;
        const matchesStatus = filters.status === "all" || report.status === filters.status;
        const matchesCategory =
          filters.category === "All Categories" || report.category === filters.category;
        return inDateRange && matchesStatus && matchesCategory;
      });

      const data: ReportData = {
        reports: filteredReports,
        stats: {
          totalReports: statsRes.data?.totalReports || 0,
          resolved: statsRes.data?.resolved || 0,
          responseRate: statsRes.data?.responseRate || 0,
          pendingReview: statsRes.data?.pendingReview || 0,
        },
        leaderboard: leaderboardRes.data || [],
        trends: trendsRes.data || [],
        categories: categoriesRes.data || [],
        barangays: barangaysRes.data || [],
      };

      // Debug logging
      console.log("[ReportGeneration] Data loaded:", {
        includeCharts: filters.includeCharts,
        trendsCount: data.trends.length,
        barangaysCount: data.barangays.length,
        trends: data.trends,
        barangays: data.barangays,
      });

      if (filters.format === "pdf") {
        await generatePDF(data);
        showToast("PDF report downloaded successfully! ✅", "success");
      } else {
        await generateCSV(data);
        showToast("CSV report downloaded successfully! ✅", "success");
      }

      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Report generation error:", error);
      showToast(
        `Failed to generate report: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
              {/* Header */}
              <div className="flex-shrink-0 sticky top-0 bg-gradient-to-r from-red-900 via-red-800 to-red-700 px-6 py-6 flex items-start justify-between border-b border-red-800 z-10 w-full rounded-t-[1rem]">
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2.5 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Generate Report</h2>
                    <p className="text-red-100 text-sm">Create beautiful PDF or CSV exports</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Date Range Section */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Calendar className="w-4 h-4 text-red-900" />
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {DATE_PRESETS.slice(0, 3).map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => handleDatePreset(preset.days || undefined, preset.preset)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          false ? "bg-red-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 block mb-2">Start Date</label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) =>
                          setFilters({ ...filters, startDate: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-900 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-2">End Date</label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) =>
                          setFilters({ ...filters, endDate: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-900 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Filters Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                      <Filter className="w-4 h-4 text-red-900" />
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters({ ...filters, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-900 focus:border-transparent outline-none"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status === "all"
                            ? "All Statuses"
                            : status.replace(/_/g, " ").toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                      <MapPin className="w-4 h-4 text-red-900" />
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) =>
                        setFilters({ ...filters, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-900 focus:border-transparent outline-none"
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Format Selection */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                    <FileText className="w-4 h-4 text-red-900" />
                    Export Format
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        id: "pdf",
                        label: "PDF Report",
                        description: "Professional formatted report",
                        icon: FileText,
                      },
                      {
                        id: "csv",
                        label: "CSV Export",
                        description: "Spreadsheet compatible",
                        icon: FileText,
                      },
                    ].map((format) => (
                      <button
                        key={format.id}
                        onClick={() =>
                          setFilters({ ...filters, format: format.id as "pdf" | "csv" })
                        }
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          filters.format === format.id
                            ? "border-red-900 bg-red-50"
                            : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-semibold text-gray-900 text-sm">{format.label}</p>
                        <p className="text-gray-600 text-xs">{format.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Options */}
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.includeCharts}
                      onChange={(e) =>
                        setFilters({ ...filters, includeCharts: e.target.checked })
                      }
                      className="w-4 h-4 rounded accent-red-900"
                    />
                    <span className="text-sm text-gray-700 font-medium">Include charts & analytics</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.includeLeaderboard}
                      onChange={(e) =>
                        setFilters({ ...filters, includeLeaderboard: e.target.checked })
                      }
                      className="w-4 h-4 rounded accent-red-900"
                    />
                    <span className="text-sm text-gray-700 font-medium">Include leaderboard data</span>
                  </label>
                </div>

                {/* Preview Stats */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-blue-600 font-medium">Report Format</p>
                    <p className="text-sm font-bold text-blue-900 mt-1">{filters.format.toUpperCase()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-blue-600 font-medium">Date Range</p>
                    <p className="text-sm font-bold text-blue-900 mt-1">
                      {filters.startDate === filters.endDate ? "1 day" : "Multiple days"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-blue-600 font-medium">Status</p>
                    <p className="text-sm font-bold text-blue-900 mt-1 capitalize">
                      {filters.status === "all" ? "All" : filters.status.split("_").join(" ")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3 justify-end w-full rounded-b-[1rem]">
                <button
                  onClick={onClose}
                  disabled={generating}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-red-900 to-red-800 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
