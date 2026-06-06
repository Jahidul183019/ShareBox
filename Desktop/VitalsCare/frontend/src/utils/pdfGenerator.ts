import { jsPDF } from "jspdf";
import { AssessmentData } from "../types";

export function downloadPDFReport(
  lang: "EN" | "BN",
  profileName: string,
  activeEmail: string,
  data: AssessmentData,
  results: any,
  bookingInfo?: { clinicName: string; service: string; date: string; time: string; voucherCode: string }
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Page dimensions: 210 x 297 mm
  const pageWidth = 210;
  const pageHeight = 297;

  // Primary Clinical Colors
  const primaryColor = [16, 185, 129]; // Mint Teal #10b981
  const darkSlateColor = [30, 41, 59]; // Slate-900 #1e293b
  const lightBgColor = [248, 250, 252]; // Slate-50 #f8fafc
  const mutedTextColor = [100, 116, 139]; // Slate-500 #64748b

  // Helper top margin tracker
  let currentY = 12;

  // DRAW HEADER BANNER / BACKGROUND
  doc.setFillColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.rect(0, 0, pageWidth, 35, "F");

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("VITALCARE HEALTH REPORT", 15, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Accent color
  doc.text("Health Screening & Risk Report", 15, currentY + 12);

  // Print Date
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8);
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - 15, currentY + 12, { align: "right" });

  currentY = 42;

  // PATIENT METADATA BLOCK & BRIEF INTRO
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.roundedRect(12, currentY, pageWidth - 24, 25, 3, 3, "F");
  
  // Outer frame stroke
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(12, currentY, pageWidth - 24, 25, 3, 3, "S");

  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PATIENT DETAILS", 16, currentY + 6);

  // Metadata Fields
  doc.setFont("helvetica", "bold");
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text("Patient Name:", 16, currentY + 12);
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text(profileName || "Sarah", 43, currentY + 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text("Email:", 16, currentY + 18);
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text(activeEmail || "Guest Profile (Transient Mode)", 43, currentY + 18);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text("Gender:", 16, currentY + 23);
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text(String(data.gender || "Female").toUpperCase(), 43, currentY + 23);

  // Right side of metadata panel
  doc.setFont("helvetica", "bold");
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text("Age:", 120, currentY + 12);
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.age || 28} Years`, 150, currentY + 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text("Status:", 120, currentY + 18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text("COMPLETED", 150, currentY + 18);

  currentY += 32;

  // SECTION 2: BIOMETRIC SCREENING MEASUREMENTS
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("HEALTH METRICS", 12, currentY);

  // Subtitle line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(12, currentY + 2, 50, currentY + 2);

  currentY += 6;

  // Let's draw table headers
  doc.setFillColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.rect(12, currentY, pageWidth - 24, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("METRIC", 16, currentY + 4);
  doc.text("VALUE", 85, currentY + 4);
  doc.text("NORMAL RANGE", 135, currentY + 4);

  currentY += 6;

  // Table rows
  const hM = (data.height || 175) / 100;
  const bmiVal = (data.weight || 70) / (hM * hM);

  const tableRows = [
    { label: "Blood Pressure", val: `${data.systolic}/${data.diastolic} mmHg`, range: "120/80 mmHg" },
    { label: "BMI", val: `${bmiVal.toFixed(1)} kg/m2`, range: "18.5 - 24.9 kg/m2" },
    { label: "Fasting Blood Sugar", val: String(data.fastingBloodSugar || "normal").toUpperCase(), range: "< 100 mg/dL" },
    { label: "Cholesterol", val: String(data.cholesterol || "normal").toUpperCase(), range: "< 200 mg/dL" },
    { label: "Sleep Duration", val: String(data.sleepDuration || "optimal").toUpperCase(), range: "7 - 9 Hours" },
    { label: "Alcohol Use", val: String(data.alcohol || "never").toUpperCase(), range: "None or Minimal" },
    { label: "Smoking", val: data.smoking ? "ACTIVE SMOKER" : "NON-SMOKER", range: "Non-smoker" },
    { label: "Stress Level", val: String(data.stressLevel || "low").toUpperCase(), range: "Low/Medium" },
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  tableRows.forEach((row, index) => {
    // Alternating background colors
    if (index % 2 === 0) {
      doc.setFillColor(242, 245, 248);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(12, currentY, pageWidth - 24, 6.5, "F");

    // Row borders
    doc.setDrawColor(241, 245, 249);
    doc.rect(12, currentY, pageWidth - 24, 6.5, "S");

    doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
    doc.text(row.label, 16, currentY + 4.5);
    
    // Highlight abnormal values in red/orange
    const isAbnormalVal = row.val.includes("HIGH") || row.val.includes("ACTIVE") || (row.label.includes("Blood Pressure") && (data.systolic >= 140 || data.diastolic >= 90));
    if (isAbnormalVal) {
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
      doc.setFont("helvetica", "normal");
    }
    doc.text(row.val, 85, currentY + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(row.range, 135, currentY + 4.5);

    currentY += 6.5;
  });

  currentY += 5;

  // SECTION 3: AUTOMATED AI RISK ESTIMATION
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DISEASE RISK LEVELS", 12, currentY);

  // Subtitle line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(12, currentY + 2, 60, currentY + 2);

  currentY += 6;

  const htnRisk = results?.hypertensionRisk ?? 35;
  const dbRisk = results?.diabetesRisk ?? 32;
  const overallRisk = results?.overallRisk ?? 34;

  const risks = [
    { name: "Hypertension & Heart Disease Risk", score: htnRisk, color: [239, 68, 68] },
    { name: "Type 2 Diabetes Risk", score: dbRisk, color: [245, 158, 11] },
    { name: "Overall Health Risk", score: overallRisk, color: [16, 185, 129] }
  ];

  risks.forEach((risk) => {
    // Label
    doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`${risk.name}:  ${risk.score}%`, 13, currentY);

    // Bar background
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(12, currentY + 1.5, pageWidth - 24, 3, 1, 1, "F");

    // Bar filled
    const fillWidth = ((pageWidth - 24) * risk.score) / 100;
    doc.setFillColor(risk.color[0], risk.color[1], risk.color[2]);
    doc.roundedRect(12, currentY + 1.5, fillWidth, 3, 1, 1, "F");

    currentY += 7.5;
  });

  currentY += 4;

  // SECTION 4: DIAGNOSTICS & CLINICAL FINDINGS (with automatic line wrapping)
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CLINICAL FINDINGS", 12, currentY);

  // Subtitle line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(12, currentY + 2, 55, currentY + 2);

  currentY += 6;

  const findingsList = results?.findings || ["Excellent overall metabolic and arterial biomarkers observed."];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);

  findingsList.forEach((finding: string) => {
    // Bullet marker
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.circle(15, currentY - 1, 1, "F");

    // Wrapped text
    const textLines = doc.splitTextToSize(finding, pageWidth - 30);
    doc.text(textLines, 19, currentY);
    currentY += (textLines.length * 4) + 1;
  });

  currentY += 3;

  // SECTION 5: RECOMMENDATIONS
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RECOMMENDATIONS", 12, currentY);

  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(12, currentY + 2, 55, currentY + 2);

  currentY += 6;

  const recommendationList = results?.recommendations || ["Continue your positive hydration, custom diet, and workout habits!"];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  recommendationList.forEach((rec: string) => {
    // Plus mark design
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("+", 14, currentY);
    
    doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
    doc.setFont("helvetica", "normal");
    const textLines = doc.splitTextToSize(rec, pageWidth - 30);
    doc.text(textLines, 19, currentY);
    currentY += (textLines.length * 4) + 1;
  });

  currentY += 3;

  // SECTION 6: ACTIVE REFERRAL VOUCHER PANEL (IF CONFIRMED)
  if (bookingInfo && bookingInfo.voucherCode) {
    doc.setFillColor(236, 253, 245); // Emerald-50 background for coupon/slip effect
    doc.rect(12, currentY, pageWidth - 24, 30, "F");

    doc.setDrawColor(16, 185, 129); // Green boundary frame
    doc.setLineDashPattern([2, 2], 0); // Dashed lines
    doc.rect(12, currentY, pageWidth - 24, 30, "S");
    doc.setLineDashPattern([], 0); // Reset

    // Header Voucher
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("APPOINTMENT REFERRAL VOUCHER", 18, currentY + 7);

    doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Clinic:", 18, currentY + 13);
    doc.setFont("helvetica", "normal");
    doc.text(bookingInfo.clinicName, 50, currentY + 13);

    doc.setFont("helvetica", "bold");
    doc.text("Service:", 18, currentY + 18);
    doc.setFont("helvetica", "normal");
    doc.text(bookingInfo.service === "CVD" ? "Heart Health Screening" : "Diabetes Screening", 50, currentY + 18);

    doc.setFont("helvetica", "bold");
    doc.text("Date & Time:", 18, currentY + 23);
    doc.setFont("helvetica", "normal");
    doc.text(`${bookingInfo.date}  |  ${bookingInfo.time}`, 50, currentY + 23);

    doc.setFont("helvetica", "bold");
    doc.text("Voucher Code:", 18, currentY + 28);
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.text(bookingInfo.voucherCode, 50, currentY + 28);
  }

  // Footer seal / Signature line at absolute bottom of final page
  const footerY = pageHeight - 15;

  doc.setLineWidth(0.2);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, footerY, pageWidth - 15, footerY);

  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Disclaimer: This report is generated by VitalsCare AI.", 15, footerY + 5);
  doc.text("Please consult a doctor for official medical advice.", 15, footerY + 8);
  doc.text("Official Portal: VitalCare Bangladesh (https://ai.studio/build)", pageWidth - 15, footerY + 5, { align: "right" });

  const sanitizedFileName = `VitalCare_Risk_Profile_${profileName.trim().replace(/\s+/g, "_")}.pdf`;
  doc.save(sanitizedFileName);
}